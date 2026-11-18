-- Correct response-to-attempt and response-to-question competition boundaries.
begin;
alter table abacus.attempt_responses
  add column competition_id uuid,
  add column age_group_id uuid;
update abacus.attempt_responses r
set competition_id = a.competition_id, age_group_id = a.age_group_id
from abacus.exam_attempts a
where a.id = r.attempt_id;
alter table abacus.attempt_responses
  alter column competition_id set not null,
  alter column age_group_id set not null;
alter table abacus.attempt_responses
  drop constraint if exists attempt_responses_attempt_id_fkey,
  drop constraint if exists attempt_responses_attempt_id_fkey1,
  drop constraint if exists attempt_responses_question_id_fkey;
alter table abacus.attempt_responses
  add constraint attempt_responses_attempt_scope_fkey
    foreign key (competition_id, age_group_id, attempt_id)
    references abacus.exam_attempts(competition_id, age_group_id, id) on delete cascade,
  add constraint attempt_responses_question_scope_fkey
    foreign key (competition_id, age_group_id, question_id)
    references abacus.question_bank(competition_id, age_group_id, id);
create index if not exists attempt_responses_question_scope_idx
  on abacus.attempt_responses(competition_id, age_group_id, question_id);
commit;