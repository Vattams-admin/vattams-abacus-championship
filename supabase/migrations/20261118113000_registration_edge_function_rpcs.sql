begin;

create or replace function public.abacus_create_registration_intent(
  p_competition_slug text,
  p_student_user_id uuid,
  p_student_display_name text,
  p_date_of_birth date,
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

  if exists (
    select 1 from abacus.registrations
    where competition_id = v_comp.id and student_user_id = p_student_user_id
  ) then
    raise exception 'A registration already exists for this participant' using errcode = '23505';
  end if;

  if exists (
    select 1 from abacus.registration_intents
    where competition_id = v_comp.id and student_user_id = p_student_user_id
      and status = 'awaiting_guardian' and expires_at > now()
  ) then
    raise exception 'An active guardian consent request already exists' using errcode = '23505';
  end if;

  insert into abacus.registration_intents (
    competition_id, student_user_id, student_display_name, date_of_birth,
    guardian_email, consent_version
  ) values (
    v_comp.id, p_student_user_id, btrim(p_student_display_name), p_date_of_birth,
    lower(btrim(p_guardian_email)), v_comp.rules_version
  ) returning id into v_id;

  insert into abacus.audit_events (
    actor_user_id, actor_kind, action, entity_type, entity_id, metadata
  ) values (
    p_student_user_id, 'student', 'registration_intent_created',
    'registration_intent', v_id::text,
    jsonb_build_object('competition_id', v_comp.id, 'consent_version', v_comp.rules_version)
  );

  return jsonb_build_object(
    'intent_id', v_id,
    'status', 'awaiting_guardian',
    'expires_at', now() + interval '24 hours',
    'consent_version', v_comp.rules_version
  );
end;
$$;

create or replace function public.abacus_confirm_guardian_registration(
  p_intent_id uuid,
  p_guardian_user_id uuid,
  p_guardian_email text
)
returns jsonb
language sql
security definer
set search_path = pg_catalog, abacus
as $$
  select abacus.confirm_guardian_registration(
    p_intent_id, p_guardian_user_id, p_guardian_email
  );
$$;

revoke all on function public.abacus_create_registration_intent(text, uuid, text, date, text) from public, anon, authenticated;
revoke all on function public.abacus_confirm_guardian_registration(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.abacus_create_registration_intent(text, uuid, text, date, text) to service_role;
grant execute on function public.abacus_confirm_guardian_registration(uuid, uuid, text) to service_role;

commit;