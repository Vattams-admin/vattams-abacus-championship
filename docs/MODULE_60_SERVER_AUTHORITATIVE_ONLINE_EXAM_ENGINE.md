# Module 60 — Server-Authoritative Online Exam Engine

**Date:** 2026-11-18  
**Repository:** Vattams-admin/vattams-abacus-championship  
**Branch:** feat/abacus-standalone-app  
**Only permitted Supabase project:** lqzdyegfhpinmojyrtur  
**Deployment target:** Cloudflare Pages only

## Objective

Implement the core live online competition lifecycle. The browser is an untrusted display/input client. The server owns eligibility checks, attempt creation, official start/deadline timestamps, response persistence, submission state and scoring. No answer key or scoring rule is returned to a participant.

## Source changes

- Added `supabase/migrations/20261118170000_server_authoritative_exam_engine.sql`.
- Added `supabase/functions/abacus-exam-engine/index.ts`.
- Fixed a Module 58 authorization defect in `abacus-admin-workflow`: the staff-role RPC returns a string, so the configuration permission check now compares the string directly rather than reading `role.role`.
- No student/guardian records, competition records, attempts or question data were seeded.

## Exam lifecycle RPCs

### `exam_start_or_resume`

- Requires a verified user ID from the Edge Function and competition ID.
- Requires a confirmed registration, approved eligibility and recorded guardian consent.
- Requires competition status `live` and checks official competition start/end timestamps using database time.
- Locks the registration row to reduce duplicate-start races.
- Resumes the existing in-progress attempt after reconnect rather than issuing a new attempt.
- Creates the attempt once, sets start and deadline using database time, and caps the deadline at competition end.
- Requires the configured number of approved questions before starting.
- Returns question IDs, sequence numbers and question payloads only. It does not select or return `answer_keys`, correct answers, rationales, marks or scoring rules.

### `exam_save_response`

- Verifies attempt ownership through the authenticated user's registration.
- Locks the attempt and rejects writes after deadline or outside `in_progress`.
- Checks that the question belongs to the attempt's competition and age group and is approved.
- Uses monotonically increasing response versions; stale retries do not overwrite newer answers.
- Uses server time for saved-at and heartbeat fields.
- Limits request response size in the Edge Function.

### `exam_submit_and_score`

- Verifies attempt ownership and locks the attempt.
- Is idempotent for already submitted/scored attempts.
- Calculates score inside the private database using `answer_keys`; the Edge Function returns no score or answer breakdown.
- Records submission/scoring version and an audit event.
- Marks result visibility as withheld pending moderation.

## Edge Function boundary

- Requires a Bearer token and validates it with Supabase Auth `getUser()`.
- Requires a verified email.
- Derives participant UUID only from the verified JWT; ignores any user ID supplied in JSON.
- Uses service-role credentials only on the server.
- Enforces exact configured origin allow-list. CORS is not an authorization substitute.
- Exposes only `start_or_resume`, `save_response`, and `submit` actions.
- SQL functions are revoked from public, anon and authenticated roles and granted only to `service_role`.

## Security and release gates still required

- Apply Modules 57, 58 and 60 migrations in order to the one dedicated project.
- Deploy `abacus-admin-workflow` and `abacus-exam-engine` with the exact production origin in `ABACUS_ALLOWED_ORIGINS`, JWT verification enabled, and server-side Supabase secrets.
- Verify the approved question bank and answer-key completeness before any competition is made live. Never place answer keys in question payload JSON.
- Add automated tests for simultaneous starts, reconnect, stale autosave, cross-user attempt access, wrong-question IDs, expiry, duplicate submit, answer-key non-disclosure and scoring correctness.
- Add client exam screen integration, local draft queue, retry/backoff and accessible timer. The current Module 60 source adds the secure backend contract; it does not yet constitute a finished student-facing exam screen.
- Verify production database policies, function logs, and Cloudflare Pages deployment commit before opening the competition.

## Known blockers / verification status on 2026-11-18

- GitHub writes succeeded on `feat/abacus-standalone-app`. `main` was not modified.
- Supabase tool calls to `get_project`, `list_migrations` and `list_tables` for exactly `lqzdyegfhpinmojyrtur` returned `MCP error -32600: You do not have permission to perform this action`. No other project was accessed; no migration or Edge Function was deployed.
- No Cloudflare connector/tool was exposed in the available tool list. No Cloudflare settings, secrets, DNS or deployment were changed.
- No local dependency install, SQL execution, TypeScript build, Deno check, browser test or authenticated end-to-end test was run. Do not describe this module as production-ready.
- Module 58 role-string defect was corrected in source, but the corrected function is not deployed until Supabase access is restored.

## Next steps

1. Restore tool access for the exact Supabase project; inspect live migration state before applying anything.
2. Apply migrations in timestamp order and deploy the two Edge Functions.
3. Add automated SQL/function tests and verify no response can read answer-key material.
4. Integrate the student-facing exam UI with reconnect and offline-safe autosave.
5. Run build, browser and authenticated E2E tests.
6. Deploy the verified feature-branch commit to Cloudflare Pages only.
