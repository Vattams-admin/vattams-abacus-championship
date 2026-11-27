# Module 60 — Server-Authoritative Online Exam Engine

**Date:** 2026-11-18  
**Repository:** Vattams-admin/vattams-abacus-championship  
**Branch:** feat/abacus-standalone-app  
**Only permitted Supabase project:** lqzdyegfhpinmoiyrtur  
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

## Verified deployment status — 2026-11-18

- GitHub repository permission check confirms admin, maintain, push, pull and triage permissions. Work remains on `feat/abacus-standalone-app`; `main` was not changed.
- The only accessed Supabase project is `lqzdyegfhpinmoiyrtur`. It is `ACTIVE_HEALTHY` in `ap-south-1`, PostgreSQL 17.12.
- Live migration history contains eight migrations through `20261118083807`. The branch contains later modules 57–65, but Modules 57–65 are not represented in the live migration history; Module 64 and Module 65 are not applied.
- Live database inspection found zero rows in competitions, age groups, question bank, answer keys, registrations, exam attempts, attempt responses and registration intents.
- Live RPC inspection found none of the four required participant/exam RPCs: `participant_list_my_competitions`, `exam_start_or_resume`, `exam_save_response` and `exam_submit_and_score`.
- Only `abacus-registration-intent` v2 and `abacus-guardian-consent` v2 are active Edge Functions. `abacus-exam-engine` is not deployed.
- Security advisor reports 12 private `abacus` tables with RLS enabled and no policies. This is consistent with the intended server-only schema boundary; do not add broad browser policies. Performance advisor reports two unindexed foreign keys on `registration_intents`; 20 unused-index notices should be evaluated only after traffic exists.
- The Cloudflare build log previously supplied proves a successful Pages build and publish for commit `6e86dca2fdac0585eb5695d51f8ea1b27ae1043c`. It also reports no build environment variables, an ignored catch-all redirect due to an infinite-loop warning, and four high-severity npm audit findings. The current branch head has advanced beyond that deployed commit; no newer deployment was verified in this check.
- No Cloudflare connector is available in this session, so Pages environment variables, redirects, DNS or deployments were not changed. The frontend requires only `VITE_ABACUS_SUPABASE_URL` and `VITE_ABACUS_SUPABASE_PUBLISHABLE_KEY`; never put a service-role/secret key in a `VITE_` variable.
- No production database writes, migrations, function deployments, seed data, or merges were performed in this verification pass. A prior Cloudflare build success does not prove the full registration-to-exam-to-scoring flow.

## Release decision

**Not production-ready.** The frontend has a successful historical Pages build, but the live competition data is empty, exam RPCs and exam Edge Function are absent, later migrations remain unapplied, official question content is pending independent review, and end-to-end tests remain outstanding.
