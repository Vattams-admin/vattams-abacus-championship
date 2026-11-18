-- Add indexes for foreign-key lookups in the private competition schema.
begin;
create index if not exists exam_attempts_age_group_fk_idx on abacus.exam_attempts(age_group_id);
create index if not exists exam_attempts_registration_scope_fk_idx on abacus.exam_attempts(competition_id, age_group_id, registration_id);
create index if not exists question_bank_age_group_fk_idx on abacus.question_bank(age_group_id);
create index if not exists question_bank_approved_by_fk_idx on abacus.question_bank(approved_by);
create index if not exists registrations_guardian_fk_idx on abacus.registrations(guardian_user_id);
create index if not exists registrations_reviewed_by_fk_idx on abacus.registrations(reviewed_by);
create index if not exists result_publications_approved_by_fk_idx on abacus.result_publications(approved_by);
create index if not exists result_publications_registration_fk_idx on abacus.result_publications(registration_id);
create index if not exists staff_roles_granted_by_fk_idx on abacus.staff_roles(granted_by);
create index if not exists audit_events_actor_fk_idx on abacus.audit_events(actor_user_id);
create index if not exists attempt_responses_attempt_scope_fk_idx on abacus.attempt_responses(competition_id, age_group_id, attempt_id);
commit;