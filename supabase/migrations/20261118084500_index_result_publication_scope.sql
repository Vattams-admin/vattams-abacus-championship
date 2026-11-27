create index if not exists result_publications_attempt_scope_fk_idx
  on abacus.result_publications(competition_id, registration_id, attempt_id);