begin;

-- Expire stale intents before enforcing one active request per participant/competition.
update abacus.registration_intents
set status = 'expired'
where status = 'awaiting_guardian' and expires_at <= now();

create unique index if not exists one_active_registration_intent_per_student
  on abacus.registration_intents(competition_id, student_user_id)
  where status = 'awaiting_guardian';

create or replace function abacus.confirm_guardian_registration(
  p_intent_id uuid,
  p_guardian_user_id uuid,
  p_guardian_email text
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
  select * into v_intent
  from abacus.registration_intents
  where id = p_intent_id
  for update;

  if not found then
    raise exception 'Registration request not found' using errcode = 'P0002';
  end if;

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

  select * into v_comp
  from abacus.competitions
  where id = v_intent.competition_id
  for share;

  if not found or v_comp.status <> 'registration_open'
     or (v_comp.registration_opens_at is not null and v_now < v_comp.registration_opens_at)
     or (v_comp.registration_closes_at is not null and v_now >= v_comp.registration_closes_at)
     or v_comp.age_cutoff_date is null
     or v_comp.rules_version <> v_intent.consent_version then
    raise exception 'Competition registration or consent rules are not currently valid' using errcode = 'P0001';
  end if;

  v_age_months :=
    ((extract(year from v_comp.age_cutoff_date)::integer - extract(year from v_intent.date_of_birth)::integer) * 12)
    + (extract(month from v_comp.age_cutoff_date)::integer - extract(month from v_intent.date_of_birth)::integer)
    - case when extract(day from v_comp.age_cutoff_date) < extract(day from v_intent.date_of_birth) then 1 else 0 end;

  if v_age_months < 0 then
    raise exception 'Date of birth is not eligible' using errcode = '22007';
  end if;

  select count(*), (array_agg(id order by min_age_months, max_age_months))[1]
    into v_age_group_count, v_age_group_id
  from abacus.age_groups
  where competition_id = v_comp.id
    and v_age_months between min_age_months and max_age_months;

  if v_age_group_count <> 1 then
    raise exception 'Exactly one eligible age group must be configured for this participant' using errcode = '22023';
  end if;

  insert into abacus.registrations (
    competition_id, age_group_id, student_user_id, guardian_user_id,
    student_display_name, date_of_birth, guardian_consent_at, consent_version,
    eligibility_status, registration_status
  ) values (
    v_comp.id, v_age_group_id, v_intent.student_user_id, p_guardian_user_id,
    v_intent.student_display_name, v_intent.date_of_birth, v_now, v_intent.consent_version,
    'pending', 'submitted'
  )
  returning id into v_registration_id;

  update abacus.registration_intents
  set status = 'confirmed',
      guardian_user_id = p_guardian_user_id,
      confirmed_at = v_now,
      registration_id = v_registration_id
  where id = v_intent.id;

  insert into abacus.audit_events (
    actor_user_id, actor_kind, action, entity_type, entity_id, metadata
  ) values (
    p_guardian_user_id, 'guardian', 'guardian_consent_confirmed',
    'registration', v_registration_id::text,
    jsonb_build_object('competition_id', v_comp.id, 'consent_version', v_intent.consent_version)
  );

  return jsonb_build_object(
    'registration_id', v_registration_id,
    'status', 'submitted',
    'eligibility_status', 'pending'
  );
end;
$$;

revoke all on function abacus.confirm_guardian_registration(uuid, uuid, text) from public, anon, authenticated;
grant execute on function abacus.confirm_guardian_registration(uuid, uuid, text) to service_role;

commit;