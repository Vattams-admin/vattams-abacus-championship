-- Module 64: strict participant answer contract and deterministic scoring scope.
-- Apply only to Supabase project lqzdyegfhpinmoiyrtur after Modules 57, 58, 60 and 62.
begin;

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
  v_question abacus.question_bank%rowtype;
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

  select * into v_question from abacus.question_bank q
  where q.id=p_question_id and q.competition_id=v_attempt.competition_id
    and q.age_group_id=v_attempt.age_group_id and q.review_status='approved';
  if not found then raise exception 'Question is not part of this attempt' using errcode='42501'; end if;

  -- For structured MCQs, accept only an exact option string from the public question payload.
  -- Legacy/free-text questions remain string-valued and are handled by their approved scoring rule.
  if jsonb_typeof(v_question.question_payload->'options') = 'array'
     and not exists (
       select 1 from jsonb_array_elements_text(v_question.question_payload->'options') option_text
       where option_text = p_response #>> '{}'
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
  v_group abacus.age_groups%rowtype;
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

  select * into v_group from abacus.age_groups where id=v_attempt.age_group_id
    and competition_id=v_attempt.competition_id;
  if not found or v_group.question_count < 1 then
    raise exception 'Attempt question-set configuration is invalid' using errcode='55000';
  end if;

  -- Score precisely the same deterministic first-N approved questions selected at exam start.
  -- Additional approved bank items must not silently increase the participant's denominator.
  with selected_questions as (
    select qb.id, qb.marks
    from abacus.question_bank qb
    where qb.competition_id=v_attempt.competition_id
      and qb.age_group_id=v_attempt.age_group_id
      and qb.review_status='approved'
    order by qb.sequence_no
    limit v_group.question_count
  ),
  selected_with_keys as (
    select sq.id, sq.marks, ak.correct_answer
    from selected_questions sq
    join abacus.answer_keys ak on ak.question_id=sq.id
  )
  select coalesce(sum(case when ar.response_payload = swk.correct_answer then swk.marks else 0 end),0),
         count(*)
    into v_score,v_total
  from selected_with_keys swk
  left join abacus.attempt_responses ar
    on ar.attempt_id=v_attempt.id and ar.question_id=swk.id;

  if v_total <> v_group.question_count then
    raise exception 'The selected official question and answer-key set is incomplete; scoring is blocked' using errcode='55000';
  end if;

  update abacus.exam_attempts set status='scored',submitted_at=v_now,
    raw_score=v_score,final_score=v_score,scoring_version='exact-json-v2',scored_at=v_now
  where id=v_attempt.id;

  insert into abacus.audit_events(actor_user_id,actor_kind,action,entity_type,entity_id,metadata)
  values(p_user_id,'student','exam_submitted_and_scored','exam_attempt',v_attempt.id::text,
    jsonb_build_object('question_count',v_total,'scoring_version','exact-json-v2'));

  return jsonb_build_object('submitted',true,'status','scored','submitted_at',v_now,
    'result_visibility','withheld_pending_moderation');
end;
$$;

revoke all on function abacus.exam_save_response(uuid,uuid,uuid,jsonb,integer,timestamptz) from public,anon,authenticated;
revoke all on function abacus.exam_submit_and_score(uuid,uuid) from public,anon,authenticated;
grant execute on function abacus.exam_save_response(uuid,uuid,uuid,jsonb,integer,timestamptz) to service_role;
grant execute on function abacus.exam_submit_and_score(uuid,uuid) to service_role;

commit;
