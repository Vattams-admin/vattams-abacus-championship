-- Module 65: immutable per-attempt question and answer-key snapshots.
-- Apply only to Supabase project lqzdyegfhpinmoiyrtur after Modules 57, 58, 60, 62 and 64.
-- This migration is designed for an empty exam-attempt table. Existing in-progress attempts
-- without snapshots are deliberately blocked rather than silently reconstructed.

begin;

create table if not exists abacus.attempt_questions (
  attempt_id uuid not null references abacus.exam_attempts(id) on delete restrict,
  question_id uuid not null references abacus.question_bank(id) on delete restrict,
  sequence_no integer not null check (sequence_no > 0),
  question_payload jsonb not null,
  marks numeric(7,2) not null check (marks >= 0),
  content_version text not null,
  answer_key_version text not null,
  correct_answer jsonb not null,
  scoring_rule jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (attempt_id, question_id),
  unique (attempt_id, sequence_no)
);

alter table abacus.attempt_questions enable row level security;
revoke all on table abacus.attempt_questions from public, anon, authenticated;
grant select, insert on table abacus.attempt_questions to service_role;

create or replace function abacus.prevent_attempt_question_snapshot_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, abacus
as $$
begin
  raise exception 'Attempt question snapshots are immutable' using errcode='55000';
end;
$$;

revoke all on function abacus.prevent_attempt_question_snapshot_mutation() from public, anon, authenticated;
grant execute on function abacus.prevent_attempt_question_snapshot_mutation() to service_role;

drop trigger if exists attempt_questions_immutable on abacus.attempt_questions;
create trigger attempt_questions_immutable
before update or delete on abacus.attempt_questions
for each row execute function abacus.prevent_attempt_question_snapshot_mutation();

create index if not exists attempt_questions_question_id_idx
  on abacus.attempt_questions(question_id);

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
  v_inserted integer;
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
      update abacus.exam_attempts set status='expired',submitted_at=v_now where id=v_attempt.id;
      return jsonb_build_object('attempt_id',v_attempt.id,'status','expired','deadline_at',v_attempt.deadline_at);
    end if;
    select count(*) into v_count from abacus.attempt_questions where attempt_id=v_attempt.id;
    if v_count < 1 then
      raise exception 'Existing attempt has no immutable question snapshot; reconnect is blocked for integrity' using errcode='55000';
    end if;
  else
    if exists (
      select 1 from abacus.exam_attempts
      where registration_id=v_registration.id
        and status in ('submitted','expired','scored','approved','under_review')
    ) then
      raise exception 'This registration has already used its exam attempt' using errcode='55000';
    end if;

    select count(*) into v_count
    from (
      select q.id
      from abacus.question_bank q
      where q.competition_id=p_competition_id
        and q.age_group_id=v_group.id and q.review_status='approved'
      order by q.sequence_no limit v_group.question_count
    ) selected;
    if v_count <> v_group.question_count then
      raise exception 'The approved question set is incomplete' using errcode='55000';
    end if;

    select count(*) into v_key_count
    from (
      select q.id
      from abacus.question_bank q
      where q.competition_id=p_competition_id
        and q.age_group_id=v_group.id and q.review_status='approved'
      order by q.sequence_no limit v_group.question_count
    ) selected
    join abacus.answer_keys ak on ak.question_id=selected.id;
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
      'immutable-snapshot-pending',gen_random_uuid(),v_now
    ) returning * into v_attempt;

    insert into abacus.attempt_questions(
      attempt_id,question_id,sequence_no,question_payload,marks,
      content_version,answer_key_version,correct_answer,scoring_rule
    )
    select v_attempt.id,q.id,q.sequence_no,q.question_payload,q.marks,
      q.content_version,ak.version,ak.correct_answer,ak.scoring_rule
    from (
      select id,sequence_no,question_payload,marks,content_version
      from abacus.question_bank
      where competition_id=p_competition_id and age_group_id=v_group.id
        and review_status='approved'
      order by sequence_no limit v_group.question_count
    ) q
    join abacus.answer_keys ak on ak.question_id=q.id
    order by q.sequence_no;

    get diagnostics v_inserted = row_count;
    if v_inserted <> v_group.question_count then
      raise exception 'Question snapshot creation was incomplete; attempt start rolled back' using errcode='55000';
    end if;

    select md5(string_agg(
      question_id::text || ':' || content_version || ':' || answer_key_version || ':' ||
      md5(question_payload::text) || ':' || md5(correct_answer::text) || ':' || md5(scoring_rule::text),
      '|' order by sequence_no
    )) into v_version
    from abacus.attempt_questions where attempt_id=v_attempt.id;

    update abacus.exam_attempts set question_set_version=v_version where id=v_attempt.id;
  end if;

  select jsonb_agg(jsonb_build_object(
    'question_id',aq.question_id,
    'sequence_no',aq.sequence_no,
    'question',abacus.public_question_payload(aq.question_payload)
  ) order by aq.sequence_no)
  into v_questions
  from abacus.attempt_questions aq
  where aq.attempt_id=v_attempt.id;

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
  v_question_payload jsonb;
  v_existing integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null or p_attempt_id is null or p_question_id is null
     or p_response_version is null or p_response_version < 1
     or p_response is null or jsonb_typeof(p_response) <> 'string'
     or length(p_response #>> '{}') > 12000 then
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

  select question_payload into v_question_payload
  from abacus.attempt_questions
  where attempt_id=p_attempt_id and question_id=p_question_id;
  if not found then raise exception 'Question is not part of this immutable attempt' using errcode='42501'; end if;

  if jsonb_typeof(v_question_payload->'options') = 'array'
     and not exists (
       select 1 from jsonb_array_elements_text(v_question_payload->'options') as options(option_text)
       where options.option_text = p_response #>> '{}'
     ) then
    raise exception 'Response must match one of the published answer choices' using errcode='22023';
  end if;

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

  select coalesce(sum(case when ar.response_payload=aq.correct_answer then aq.marks else 0 end),0),
         count(*)
    into v_score,v_total
  from abacus.attempt_questions aq
  left join abacus.attempt_responses ar
    on ar.attempt_id=aq.attempt_id and ar.question_id=aq.question_id
  where aq.attempt_id=v_attempt.id;

  if v_total < 1 then
    raise exception 'Immutable attempt question snapshot is incomplete; scoring is blocked' using errcode='55000';
  end if;

  update abacus.exam_attempts set status='scored',submitted_at=v_now,
    raw_score=v_score,final_score=v_score,scoring_version='exact-json-v3-snapshot',scored_at=v_now
  where id=v_attempt.id;

  insert into abacus.audit_events(actor_user_id,actor_kind,action,entity_type,entity_id,metadata)
  values(p_user_id,'student','exam_submitted_and_scored','exam_attempt',v_attempt.id::text,
    jsonb_build_object('question_count',v_total,'scoring_version','exact-json-v3-snapshot'));

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
