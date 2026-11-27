-- Module 66: cover registration-intent foreign-key lookups and deletes.
-- Apply only after migration-history reconciliation on project lqzdyegfhpinmoiyrtur.
-- These indexes address the live Supabase performance-advisor findings.
begin;

create index if not exists registration_intents_guardian_user_id_idx
  on abacus.registration_intents(guardian_user_id);

create index if not exists registration_intents_registration_id_idx
  on abacus.registration_intents(registration_id);

commit;
