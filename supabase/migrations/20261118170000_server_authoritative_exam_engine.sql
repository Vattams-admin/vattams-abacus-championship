-- Module 60: server-authoritative online exam lifecycle.
-- Apply only to Supabase project lqzdyegfhpinmoiyrtur after Modules 57/58.
begin;

create or replace function abacus.exam_start_or_resume(
  p_user_id uuid,
  p_competition_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, abacus
as $$
declare
  v_registration abacus.registrations%rowtype;
  v_competition abacus.competitions%rowtype;
  v_group abacus.age_groups%rowtype;
  v_attempt abacus.exam_attempts%rowtype;
  v_questions jsonb;
  v_count integer;
  v_key_count integer;
  v_version text;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null or p_competition_id is null then
    raise exception 'Authentication and competition are required' using errcode='22023';
  end if;

  select * into v_registration
  from abacus.registrations
  where competition_id=p_competition_id and student_user_id=p_user_id
  for update;
  if not found or v_registration.registration_status <> 'confirmed'
     or v_registration.eligibility_status <> 'approved'
     or v_registration.guardian_consent_at is null then
    raise exception 'An approved, confirmed registration with guardian consent is required' using errcode='42501';
  end if;

  select * into v_competition from abacus.competitions
  where id=p_competition_id for share;
  if not found or v_competition.status <> 'live'
     or (v_competition.starts_at is not null and v_now < v_competition.starts_at)
     or (v_competition.ends_at is not null and v_now >= v_competition.ends_at) then
    raise exception 'Competition is not currently open for an exam attempt' using errcode='55000';
  end if;

  select * into v_group from abacus.age_groups
  where id=v_registration.age_group_id and competition_id=p_competition_id;
  if not found then raise exception 'Assigned age group not found' using errcode='P0002'; end if;

  select * into v_attempt from abacus.exam_attempts
  where registration_id=v_registration.id and status='in_progress'
  for update;
  if found then
    if v_now >= v_attempt.deadline_at then
      update abacus.exam_attempts set status='expired', submitted_at=v_now
      where id=v_attempt.id;
      return jsonb_build_object('attempt_id',v_attempt.id,'status','expired','deadline_at',v_attempt.deadline_at);
    end if;
  else
    if exists (select 1 from abacus.exam_attempts where registration_id=v_registration.id and status in ('submitted','expired','scored','approved')) then
      raise exception 'This registration has already used its exam attempt' using errcode='55000';
    end if;
    select count(*), coalesce(string_agg(content_version, ',' order by sequence_no), '')
      into v_count, v_version
    from (
      select id, content_version, sequence_no
      from abacus.question_bank
      where competition_id=p_competition_id and age_group_id=v_group.id
        and review_status='approved'
      order by sequence_no
      limit v_group.question_count
    ) q;
    if v_count <> v_group.question_count then
      raise exception 'The approved question set is incomplete' using errcode='55000';
    end if;
    select count(*) into v_key_count
    from abacus.question_bank qb
    join abacus.answer_keys ak on ak.question_id=qb.id
    where qb.competition_id=p_competition_id and qb.age_group_id=v_group.id
      and qb.review_status='approved'
      and qb.id in (select id from abacus.question_bank
        where competition_id=p_competition_id and age_group_id=v_group.id
          and review_status='approved' order by sequence_no limit v_group.question_count);
    if v_key_count <> v_group.question_count then
      raise exception 'The official answer-key set is incomplete; exam start is blocked' using errcode='55000';
    end if;
    insert into abacus.exam_attempts(
      registration_id,competition_id,age_group_id,attempt_no,status,
      scheduled_start_at,started_at,deadline_at,question_set_version,idempotency_key,last_heartbeat_at
    ) values (
      v_registration.id,p_competition_id,v_group.id,1,'in_progress',
      v_now,v_now,least(v_now + make_interval(secs=>v_group.duration_seconds),
        coalesce(v_competition.ends_at,'infinity'::timestamptz)),
      md5(v_version),gen_random_uuid(),v_now
    ) returning * into v_attempt;
  end if;

  select jsonb_agg(jsonb_build_object(
    'question_id',q.id,'sequence_no',q.sequence_no,'question',abacus.public_question_payload(q.question_payload)
  ) order by q.sequence_no)
  into v_questions
  from (
    select id,sequence_no,question_payload
    from abacus.question_bank
    where competition_id=p_competition_id and age_group_id=v_group.id
      and review_status='approved'
    order by sequence_no limit v_group.question_count
  ) q;

  update abacus.exam_attempts set last_heartbeat_at=v_now where id=v_attempt.id;
  return jsonb_build_object(
    'attempt_id',v_attempt.id,'status','in_progress',
    'started_at',v_attempt.started_at,'server_now',v_now,
    'deadline_at',v_attempt.deadline_at,'questions',coalesce(v_questions,'[]'::jsonb)
  );
end;
$$;

create or replace function abacus.exam_save_response(
  p_user_id uuid,
  p_attempt_id uuid,
  p_question_id uuid,
  p_response jsonb,
  p_response_version integer,
  p_client_saved_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, abacus
as $$
declare
  v_attempt abacus.exam_attempts%rowtype;
  v_registration abacus.registrations%rowtype;
  v_existing integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null or p_attempt_id is null or p_question_id is null
     or p_response_version is null or p_response_version < 1 then
    raise exception 'Invalid response payload' using errcode='22023';
  end if;
  select a.* into v_attempt
  from abacus.exam_attempts a
  join abacus.registrations r on r.id=a.registration_id
  where a.id=p_attempt_id and r.student_user_id=p_user_id
  for update of a;
  if not found then raise exception 'Attempt not found' using errcode='P0002'; end if;
  if v_attempt.status='in_progress' and v_now >= v_attempt.deadline_at then
    update abacus.exam_attempts set status='expired',submitted_at=v_now where id=v_attempt.id;
    return jsonb_build_object('saved',false,'status','expired','server_now',v_now);
  end if;
  if v_attempt.status <> 'in_progress' then
    raise exception 'Attempt is not accepting responses' using errcode='55000';
  end if;
  if not exists (
    select 1 from abacus.question_bank q
    where q.id=p_question_id and q.competition_id=v_attempt.competition_id
      and q.age_group_id=v_attempt.age_group_id and q.review_status='approved'
  ) then raise exception 'Question is not part of this attempt' using errcode='42501'; end if;

  select response_version into v_existing from abacus.attempt_responses
  where attempt_id=p_attempt_id and question_id=p_question_id;
  if v_existing is not null and p_response_version <= v_existing then
    return jsonb_build_object('saved',false,'stale',true,'current_version',v_existing,'server_now',v_now);
  end if;
  insert into abacus.attempt_responses(
    attempt_id,question_id,response_payload,response_version,client_saved_at,server_saved_at
  ) values(p_attempt_id,p_question_id,p_response,p_response_version,p_client_saved_at,v_now)
  on conflict(attempt_id,question_id) do update set
    response_payload=excluded.response_payload,
    response_version=excluded.response_version,
    client_saved_at=excluded.client_saved_at,
    server_saved_at=excluded.server_saved_at
  where excluded.response_version > abacus.attempt_responses.response_version;

  update abacus.exam_attempts set last_heartbeat_at=v_now where id=p_attempt_id;
  return jsonb_build_object('saved',true,'response_version',p_response_version,'server_now',v_now);
end;
$$;

create or replace function abacus.exam_submit_and_score(
  p_user_id uuid,
  p_attempt_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, abacus
as $$
declare
  v_attempt abacus.exam_attempts%rowtype;
  v_score numeric(9,2);
  v_answered integer;
  v_total integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null or p_attempt_id is null then
    raise exception 'Authentication and attempt are required' using errcode='22023';
  end if;
  select a.* into v_attempt
  from abacus.exam_attempts a
  join abacus.registrations r on r.id=a.registration_id
  where a.id=p_attempt_id and r.student_user_id=p_user_id
  for update of a;
  if not found then raise exception 'Attempt not found' using errcode='P0002'; end if;

  if v_attempt.status in ('submitted','scored','approved','under_review') then
    return jsonb_build_object('submitted',true,'status',v_attempt.status,'submitted_at',v_attempt.submitted_at);
  end if;
  if v_attempt.status <> 'in_progress' then
    raise exception 'Attempt cannot be submitted' using errcode='55000';
  end if;
  if v_now >= v_attempt.deadline_at then
    update abacus.exam_attempts set status='expired',submitted_at=v_now where id=v_attempt.id;
    return jsonb_build_object('submitted',true,'status','expired','submitted_at',v_now);
  end if;

  select coalesce(sum(case when ar.response_payload = ak.correct_answer then qb.marks else 0 end),0),
         count(*)
    into v_score,v_total
  from abacus.question_bank qb
  join abacus.answer_keys ak on ak.question_id=qb.id
  left join abacus.attempt_responses ar on ar.attempt_id=v_attempt.id and ar.question_id=qb.id
  where qb.competition_id=v_attempt.competition_id
    and qb.age_group_id=v_attempt.age_group_id
    and qb.review_status='approved';

  update abacus.exam_attempts set status='scored',submitted_at=v_now,
    raw_score=v_score,final_score=v_score,scoring_version='exact-json-v1',scored_at=v_now
  where id=v_attempt.id;

  insert into abacus.audit_events(actor_user_id,actor_kind,action,entity_type,entity_id,metadata)
  values(p_user_id,'student','exam_submitted_and_scored','exam_attempt',v_attempt.id::text,
    jsonb_build_object('question_count',v_total,'scoring_version','exact-json-v1'));

  return jsonb_build_object('submitted',true,'status','scored','submitted_at',v_now,
    'result_visibility','withheld_pending_moderation');
end;
$$;

revoke all on function abacus.exam_start_or_resume(uuid,uuid) from public,anon,authenticated;
revoke all on function abacus.exam_save_response(uuid,uuid,uuid,jsonb,integer,timestamptz) from public,anon,authenticated;
revoke all on function abacus.exam_submit_and_score(uuid,uuid) from public,anon,authenticated;
grant execute on function abacus.exam_start_or_resume(uuid,uuid) to service_role;
grant execute on function abacus.exam_save_response(uuid,uuid,uuid,jsonb,integer,timestamptz) to service_role;
grant execute on function abacus.exam_submit_and_score(uuid,uuid) to service_role;

commit;
