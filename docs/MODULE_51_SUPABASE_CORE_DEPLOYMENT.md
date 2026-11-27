# Module 51 — Dedicated Supabase project connected and competition core deployed

Date: 2026-11-18
Repository: Vattams-admin/vattams-abacus-championship
Branch: feat/abacus-standalone-app
Dedicated Supabase project: vattams-abacus-championship
Project ref: lqzdyegfhpinmoiyrtur
Region: ap-south-1 (Mumbai)
PostgreSQL: 17.12

## Verified project identity
- Supabase project list returned exactly the dedicated Abacus project for this connected account.
- Project status: ACTIVE_HEALTHY.
- API URL: https://lqzdyegfhpinmoiyrtur.supabase.co.
- No other project was selected or modified.

## Initial live state
- No public or abacus application tables.
- No migration history.
- No Edge Functions.
- No competition data.
- Existing Supabase platform schemas/extensions remain platform-managed and untouched.

## Deployed database foundation
Applied four migrations:
1. create_abacus_competition_core
2. harden_attempt_response_scope
3. index_competition_foreign_keys
4. index_result_publication_scope

Created 11 private-schema tables:
- competitions
- age_groups
- staff_roles
- registrations
- question_bank
- answer_keys
- exam_attempts
- attempt_responses
- result_publications
- certificates
- audit_events

All 11 tables have RLS enabled and currently contain zero rows. The `abacus` schema is not granted to `anon` or `authenticated`; verified checks show both roles have no schema USAGE and no table SELECT. `service_role` has the intended server-side privileges. The public schema has zero application tables.

## Integrity correction
During migration review, a response-table constraint issue was found. A corrective migration added competition_id and age_group_id to attempt_responses, replaced the duplicate simple attempt/question foreign keys with composite constraints, and ensures a response can only refer to a question from the same competition and age band as its attempt. The canonical schema file was synchronized with this final structure.

## Verification
- Supabase migration history shows four successful applied migrations.
- Supabase table inspection lists all 11 expected tables, all with RLS enabled.
- Direct SQL privilege checks confirm no anon/authenticated schema access or SELECT privilege.
- Security advisors: 11 informational `rls_enabled_no_policy` findings only. This is intentional for this private server-only schema: client roles are denied schema and table access; no public browser policies are intended.
- Performance advisor initially identified missing FK indexes. Indexes were added. A subsequent advisor check still reports one FK index advisory on the composite result_publications relationship; unused-index advisories are expected while tables are empty and traffic has not begun. Follow up with workload-based index review.
- Health advisor: no findings.
- Edge Functions: none deployed yet.

## Not yet configured
- Supabase Auth provider settings, email templates and Cloudflare redirect URLs.
- Storage buckets and object policies.
- Edge Functions for registration, guardian consent, age eligibility, admin review, exam start/save/submit, scoring, moderation, results and certificates.
- Initial competition and age-band seed records.
- Production domain, Cloudflare Pages/Workers deployment, DNS and secrets.
- Build, E2E, IDOR, autosave/reconnect and end-to-end exam verification.

## Cloudflare
No Cloudflare connector/action is available in this session. Cloudflare remains the sole deployment target; no Cloudflare deployment or DNS change is claimed. Vercel was not used.

## GitHub
All code and migration files remain on `feat/abacus-standalone-app`. No merge to `main`.
- Canonical schema synchronization commit: e3b14e23a4a5195b31b90b467fecf6bd2ec30e33
- Migration and supporting changes are committed in the same feature branch.

## Isolation
No VATTAMS Academia repository, Firebase project, data, storage, secrets or old Supabase projects were accessed or modified. No student personal data or question-bank answer material was seeded into the live database.
