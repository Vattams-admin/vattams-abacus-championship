# Module 55 — Secure Student Registration and Guardian Consent

**Date:** 2026-11-18  
**Repository:** `Vattams-admin/vattams-abacus-championship`  
**Branch:** `feat/abacus-standalone-app`  
**Dedicated Supabase ref:** `lqzdyegfhpinmoiyrtur`

## Implemented in this module

### Database
- Added `competitions.age_cutoff_date`; age-group assignment must use the published competition cut-off date, not the browser clock.
- Added private `abacus.registration_intents` with verified student account linkage, requested guardian email, participant display name, date of birth, rules/consent version, expiry, and confirmation state.
- RLS enabled; no client policies; no grants to anon/authenticated.
- Added service-role-only RPCs for creating an intent and confirming guardian consent.
- Guardian confirmation runs transactionally in Postgres: checks intent state/expiry, guardian email/account mismatch, competition registration window/status, rules version, age cut-off, and exactly one matching age group; creates a pending registration; links guardian identity; records consent timestamp/version; writes audit event.
- Added concurrency protection for one active intent per student/competition and expires stale intents before creating another.
- Registration is submitted as `eligibility_status=pending`; it cannot grant exam access.

### Edge Functions deployed
1. `abacus-registration-intent` — JWT verification enabled. Requires a verified student email; validates input; derives student user ID from Auth; calls the private service-only RPC.
2. `abacus-guardian-consent` — JWT verification enabled. Requires a separately authenticated verified guardian email; requires explicit consent acceptance; the database checks the exact guardian email and creates the pending registration atomically.

Both functions use the server-side Supabase service-role environment only. No service-role key is present in browser code. The functions have CORS enabled for browser requests; CORS is not an authorization control. Production origin allow-listing and abuse/rate limiting still require additional configuration.

### Frontend
- Replaced the registration placeholder with student request and guardian consent steps.
- Requires sign-in before invoking either endpoint.
- Student can create a request using competition slug, display name, date of birth and guardian email.
- Guardian must sign in separately, enter the request reference and explicitly accept the consent statement.
- UI communicates that registration remains pending review and does not grant exam access.
- No direct browser writes to the private schema.

## Live project verification
- Project `lqzdyegfhpinmoiyrtur` remains `ACTIVE_HEALTHY`, Mumbai region, PostgreSQL 17.12.
- Migrations now include six total entries, including:
  - `guardian_confirmed_registration_intents`
  - `registration_edge_function_rpcs`
  - `harden_guardian_registration_concurrency`
- Two Edge Functions show ACTIVE with `verify_jwt=true`.
- Security advisor: 12 informational `rls_enabled_no_policy` findings (the added private table is intentionally server-only).
- Health advisor: no findings.
- No sample student/guardian accounts or registration records were created.
- No live request/confirmation test was run because no test participant accounts or published competition configuration are present.

## Critical release gates still open
- No competition is currently seeded/configured with published rules, age cut-off, date windows or non-overlapping age bands. Until configured, registration RPC correctly rejects requests.
- The consent wording is a preliminary UI summary, not a reviewed legal/privacy notice. Publish the full privacy notice and final consent text/version before opening registration.
- Configure Auth email provider, production SMTP, Site URL and redirect URLs; verify guardian/student magic-link delivery and email verification.
- Add per-user/IP rate limiting and explicit Cloudflare production-origin allow-list.
- Verify duplicate, expired, mismatched guardian, age-boundary and overlapping age-band cases with test accounts.
- Run TypeScript/build, accessibility, mobile E2E, IDOR and security tests.
- Exam start/save/submit, scoring, results and certificates are not implemented in this module.

## Access and isolation
- GitHub writes only to this repository and `feat/abacus-standalone-app`; no `main` merge.
- Supabase access only to `lqzdyegfhpinmoiyrtur`.
- No Academia project, Firebase, old Supabase projects, data or secrets accessed.
- Cloudflare remains the only intended deployment target. No Cloudflare account connector was available; no DNS, Pages settings, secrets or deployment were changed.
- No student data accepted; no production readiness claim.

**Conclusion:** A server-validated, guardian-confirmed registration foundation is now deployed. The app still must not open public registration or live exams until the consent policy, competition configuration, abuse controls and end-to-end tests pass.
