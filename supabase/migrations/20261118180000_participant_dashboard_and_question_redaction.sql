-- Module 62: participant-safe competition discovery and recursive question payload redaction.
-- Apply only to Supabase project lqzdyegfhpinmoiyrtur after Modules 57, 58 and 60.
begin;

create or replace function abacus.public_question_payload(p_value jsonb)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog, abacus
as $$
declare
  v_result jsonb;
  v_key text;
  v_value jsonb;
  v_array jsonb;
  v_item jsonb;
  -- Keys are compared after lowercasing and removing punctuation. Include both
  -- snake_case and camelCase-normalized spellings so JSON naming style cannot
  -- bypass participant-side answer/scoring redaction.
  v_sensitive constant text[] := array[
    'answer','answers','answertext','answertexts','correct','correctanswer',
    'correctanswers','correctanswertext','correctanswerindex','correctanswersindex',
    'answerkey','answerkeys','acceptedanswer','acceptedanswers',
    'expectedanswer','expectedanswers','expectedanswertext',
    'solution','solutions','solutiontext','rationale','rationales','rationaletext',
    'explanation','explanations','explanationtext','mark','marks','markvalue',
    'points','pointvalue','score','scorevalue','scoring','scoringrule',
    'rubric','grading','gradingrule','privatenotes','private_note',
    'correct_answer','correct_answers','answer_key','answer_keys',
    'accepted_answer','accepted_answers','expected_answer',
    'correct_option_index','correctoptionindex','correct_option','correctoption',
    'answer_index','answerindex','option_index','optionindex',
    'correct_choice','correctchoice','correctchoiceindex',
    'is_correct','iscorrect','iscorrectanswer','isanswercorrect',
    'review_status','reviewstatus','approved_by','approvedby','approved_at','approvedat'
  ];
begin
  if p_value is null then return null; end if;
  case jsonb_typeof(p_value)
    when 'object' then
      v_result := '{}'::jsonb;
      for v_key, v_value in select key, value from jsonb_each(p_value) loop
        if lower(regexp_replace(v_key, '[^a-zA-Z0-9_]', '', 'g')) <> all(v_sensitive) then
          v_result := v_result || jsonb_build_object(v_key, abacus.public_question_payload(v_value));
        end if;
      end loop;
      return v_result;
    when 'array' then
      v_array := '[]'::jsonb;
      for v_item in select value from jsonb_array_elements(p_value) loop
        v_array := v_array || jsonb_build_array(abacus.public_question_payload(v_item));
      end loop;
      return v_array;
    else
      return p_value;
  end case;
end;
$$;

revoke all on function abacus.public_question_payload(jsonb) from public, anon, authenticated;
grant execute on function abacus.public_question_payload(jsonb) to service_role;

create or replace function abacus.participant_list_my_competitions(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, abacus
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'competition_id', c.id,
    'slug', c.slug,
    'title', c.title,
    'description', c.description,
    'status', c.status,
    'starts_at', c.starts_at,
    'ends_at', c.ends_at,
    'registration_status', r.registration_status,
    'eligibility_status', r.eligibility_status,
    'age_group', g.label,
    'can_start', (
      r.registration_status = 'confirmed'
      and r.eligibility_status = 'approved'
      and r.guardian_consent_at is not null
      and c.status = 'live'
      and (c.starts_at is null or now() >= c.starts_at)
      and (c.ends_at is null or now() < c.ends_at)
      and not exists (
        select 1 from abacus.exam_attempts a
        where a.registration_id = r.id
          and a.status in ('submitted','expired','scored','approved')
      )
    )
  ) order by c.starts_at nulls last, c.title), '[]'::jsonb)
  from abacus.registrations r
  join abacus.competitions c on c.id = r.competition_id
  left join abacus.age_groups g on g.id = r.age_group_id
  where r.student_user_id = p_user_id
    and r.registration_status = 'confirmed'
$$;

revoke all on function abacus.participant_list_my_competitions(uuid) from public, anon, authenticated;
grant execute on function abacus.participant_list_my_competitions(uuid) to service_role;

commit;
