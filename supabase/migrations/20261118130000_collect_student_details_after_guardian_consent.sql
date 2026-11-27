begin;

alter table abacus.registration_intents
  alter column student_display_name drop not null,
  alter column date_of_birth drop not null;

alter table abacus.registration_intents
  add constraint registration_intents_confirmed_student_details_check
  check (
    status <> 'confirmed'
    or (student_display_name is not null and date_of_birth is not null)
  );

drop function public.abacus_confirm_guardian_registration(uuid, uuid, text);
drop function public.abacus_create_registration_intent(text, uuid, text, date, text);
drop function abacus.confirm_guardian_registration(uuid, uuid, text);

create or replace function public.abacus_create_registration_intent(
  p_competition_slug text,
  p_student_user_id uuid,
  p_guardian_email text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, abacus
as $$
declare
  v_comp abacus.competitions%rowtype;
  v_id uuid;
  v_expiry timestamptz;
begin
  select * into v_comp
  from abacus.competitions
  where slug = p_competition_slug
  for share;

  if not found or v_comp.status <> 'registration_open'
     or (v_comp.registration_opens_at is not null and now() < v_comp.registration_opens_at)
     or (v_comp.registration_closes_at is not null and now() >= v_comp.registration_closes_at)
     or v_comp.age_cutoff_date is null then
    raise exception 'Competition is not accepting registration requests' using errcode = 'P0001';
  end if;

  if exists (select 1 from abacus.registrations where competition_id = v_comp.id and student_user_id = p_student_user_id) then
    raise exception 'A registration already exists for this participant' using errcode = '23505';
  end if;

  update abacus.registration_intents
  set status = 'expired'
  where competition_id = v_comp.id and student_user_id = p_student_user_id
    and status = 'awaiting_guardian' and expires_at <= now();

  if exists (
    select 1 from abacus.registration_intents
    where competition_id = v_comp.id and student_user_id = p_student_user_id
      and status = 'awaiting_guardian' and expires_at > now()
  ) then
    raise exception 'An active guardian consent request already exists' using errcode = '23505';
  end if;

  insert into abacus.registration_intents (
    competition_id, student_user_id, guardian_email, consent_version
  ) values (
    v_comp.id, p_student_user_id, lower(btrim(p_guardian_email)), v_comp.rules_version
  ) returning id, expires_at into v_id, v_expiry;

  insert into abacus.audit_events (
    actor_user_id, actor_kind, action, entity_type, entity_id, metadata
  ) values (
    p_student_user_id, 'student', 'guardian_consent_request_created',
    'registration_intent', v_id::text,
    jsonb_build_object('competition_id', v_comp.id, 'consent_version', v_comp.rules_version)
  );

  return jsonb_build_object(
    'intent_id', v_id, 'status', 'awaiting_guardian',
    'expires_at', v_expiry, 'consent_version', v_comp.rules_version
  );
end;
$$;

create or replace function abacus.confirm_guardian_registration(
  p_intent_id uuid,
  p_guardian_user_id uuid,
  p_guardian_email text,
  p_student_display_name text,
  p_date_of_birth date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, abacus
as $$
declare
  v_intent abacus.registration_intents%rowtype;
  v_comp abacus.competitions%rowtype;
  v_age_months integer;
  v_age_group_id uuid;
  v_age_group_count integer;
  v_registration_id uuid;
  v_now timestamptz := now();
begin
  if p_student_display_name is null or length(btrim(p_student_display_name)) not between 2 and 120
     or p_date_of_birth is null then
    raise exception 'Participant name and date of birth are required' using errcode = '22023';
  end if;

  select * into v_intent from abacus.registration_intents where id = p_intent_id for update;
  if not found then raise exception 'Registration request not found' using errcode = 'P0002'; end if;
  if v_intent.status <> 'awaiting_guardian' then
    raise exception 'Registration request is no longer awaiting consent' using errcode = 'P0001';
  end if;
  if v_intent.expires_at <= v_now then
    update abacus.registration_intents set status = 'expired' where id = v_intent.id;
    raise exception 'Registration request has expired' using errcode = 'P0001';
  end if;
  if p_guardian_user_id = v_intent.student_user_id
     or lower(btrim(p_guardian_email)) <> v_intent.guardian_email then
    raise exception 'Signed-in guardian does not match the requested guardian' using errcode = '42501';
  end if;

  select * into v_comp from abacus.competitions where id = v_intent.competition_id for share;
  if not found or v_comp.status <> 'registration_open'
     or (v_comp.registration_opens_at is not null and v_now < v_comp.registration_opens_at)
     or (v_comp.registration_closes_at is not null and v_now >= v_comp.registration_closes_at)
     or v_comp.age_cutoff_date is null
     or v_comp.rules_version <> v_intent.consent_version then
    raise exception 'Competition registration or consent rules are not currently valid' using errcode = 'P0001';
  end if;

  if p_date_of_birth >= v_comp.age_cutoff_date then
    raise exception 'Date of birth is not eligible' using errcode = '22007';
  end if;

  v_age_months :=
    ((extract(year from v_comp.age_cutoff_date)::integer - extract(year from p_date_of_birth)::integer) * 12)
    + (extract(month from v_comp.age_cutoff_date)::integer - extract(month from p_date_of_birth)::integer)
    - case when extract(day from v_comp.age_cutoff_date) < extract(day from p_date_of_birth) then 1 else 0 end;

  select count(*), (array_agg(id order by min_age_months, max_age_months))[1]
    into v_age_group_count, v_age_group_id
  from abacus.age_groups
  where competition_id = v_comp.id and v_age_months between min_age_months and max_age_months;

  if v_age_group_count <> 1 then
    raise exception 'Exactly one eligible age group must be configured for this participant' using errcode = '22023';
  end if;

  insert into abacus.registrations (
    competition_id, age_group_id, student_user_id, guardian_user_id,
    student_display_name, date_of_birth, guardian_consent_at, consent_version,
    eligibility_status, registration_status
  ) values (
    v_comp.id, v_age_group_id, v_intent.student_user_id, p_guardian_user_id,
    btrim(p_student_display_name), p_date_of_birth, v_now, v_intent.consent_version,
    'pending', 'submitted'
  ) returning id into v_registration_id;

  update abacus.registration_intents
  set status = 'confirmed', guardian_user_id = p_guardian_user_id,
      confirmed_at = v_now, registration_id = v_registration_id,
      student_display_name = btrim(p_student_display_name), date_of_birth = p_date_of_birth
  where id = v_intent.id;

  insert into abacus.audit_events (
    actor_user_id, actor_kind, action, entity_type, entity_id, metadata
  ) values (
    p_guardian_user_id, 'guardian', 'guardian_consent_confirmed',
    'registration', v_registration_id::text,
    jsonb_build_object('competition_id', v_comp.id, 'consent_version', v_intent.consent_version)
  );

  return jsonb_build_object('registration_id', v_registration_id, 'status', 'submitted', 'eligibility_status', 'pending');
end;
$$;

create or replace function public.abacus_confirm_guardian_registration(
  p_intent_id uuid,
  p_guardian_user_id uuid,
  p_guardian_email text,
  p_student_display_name text,
  p_date_of_birth date
)
returns jsonb
language sql
security definer
set search_path = pg_catalog, abacus
as $$
  select abacus.confirm_guardian_registration(
    p_intent_id, p_guardian_user_id, p_guardian_email,
    p_student_display_name, p_date_of_birth
  );
$$;

revoke all on function public.abacus_create_registration_intent(text, uuid, text) from public, anon, authenticated;
revoke all on function public.abacus_confirm_guardian_registration(uuid, uuid, text, text, date) from public, anon, authenticated;
revoke all on function abacus.confirm_guardian_registration(uuid, uuid, text, text, date) from public, anon, authenticated;
grant execute on function public.abacus_create_registration_intent(text, uuid, text) to service_role;
grant execute on function public.abacus_confirm_guardian_registration(uuid, uuid, text, text, date) to service_role;
grant execute on function abacus.confirm_guardian_registration(uuid, uuid, text, text, date) to service_role;

commit;