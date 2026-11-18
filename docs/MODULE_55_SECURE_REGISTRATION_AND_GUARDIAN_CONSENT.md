# Module 55 — Secure Student Registration and Guardian Consent

**Date:** 2026-11-18  
**Repository:** `Vattams-admin/vattams-abacus-championship`  
**Branch:** `feat/abacus-standalone-app`  
**Dedicated Supabase ref:** `lqzdyegfhpinmoiyrtur`

## Implemented

### Privacy-first database flow
- Added `competitions.age_cutoff_date`; age-group assignment uses the published competition cut-off, not the browser clock.
- Added private `abacus.registration_intents` with student Auth reference, requested guardian email, consent/rules version, expiry and confirmation state.
- The first student request stores only the student account reference and guardian email. Participant display name and date of birth are now nullable in an unconfirmed intent and are not collected at this step.
- Participant display name and date of birth are submitted only by the separately authenticated guardian after the consent summary is presented and the guardian explicitly accepts it.
- RLS enabled; no client policies; no grants to anon/authenticated.
- Service-role-only RPCs create an intent and confirm guardian consent.
- Confirmation checks request state/expiry, separate guardian identity, exact email match, competition registration window/status, consent version, age cut-off and exactly one matching age group.
- Registration insertion, guardian linkage, consent timestamp/version, intent confirmation and audit event are committed in one database transaction.
- Added concurrency protection for one active intent per student/competition and stale-request expiry.
- Registration is created as `eligibility_status=pending`; this does not grant exam access.

### Edge Functions deployed
1. `abacus-registration-intent` — ACTIVE, version 2, `verify_jwt=true`. Requires verified student email, validates competition slug and guardian email, derives student user ID from Auth, and creates a time-limited intent without collecting child name or DOB.
2. `abacus-guardian-consent` — ACTIVE, version 2, `verify_jwt=true`. Requires a separate verified guardian email, explicit consent acceptance, participant name and date of birth; database verifies guardian email and computes eligibility age band.

Both functions use server-side service-role credentials only. No service-role/secret key is present in browser code. CORS is enabled for browser requests; CORS is not an authorization control. Production origin allow-listing and abuse/rate limiting remain required.

### Frontend
- Registration portal has separate Student request and Guardian consent steps.
- Student enters competition slug and guardian email only.
- Guardian signs in separately, enters the request reference, reviews the consent summary, then enters participant name and DOB and accepts consent.
- Portal communicates that registration remains pending review and does not grant exam access.

## Live project verification
- Project `lqzdyegfhpinmoiyrtur` remains `ACTIVE_HEALTHY`, Mumbai region, PostgreSQL 17.12.
- Eight migrations recorded, including guardian-confirmed intent schema, service-only RPCs, concurrency hardening and deferred collection of participant details until guardian consent.
- Two Edge Functions are ACTIVE, version 2, with JWT verification enabled.
- SQL verification returned zero registration intents, zero registrations, zero competitions and zero age groups.
- RLS is enabled on `registration_intents`; anon/authenticated have no `abacus` schema USAGE.
- SQL privilege checks confirmed anon/authenticated cannot execute workflow RPCs; service_role can.
- Health advisor returned no findings.
- Security advisor reports informational `rls_enabled_no_policy` findings on intentionally private server-only tables.
- No test participant accounts or personal records were created. No live request/confirmation test was run because no test accounts and no published competition configuration are present.

## Critical release gates
- No competition or age groups are seeded. Registration correctly rejects until an approved competition is configured with rules version, registration window, age cut-off and non-overlapping age bands.
- Consent wording shown is a preliminary summary, not a reviewed legal/privacy notice. Publish the complete privacy notice and final consent text/version before public registration.
- Configure Auth email provider, production SMTP, Site URL and redirect URLs; verify guardian/student magic-link delivery and email verification.
- Add per-user/IP rate limiting, abuse detection and an explicit production-origin CORS allow-list.
- Test duplicate, expired, mismatched guardian, age-boundary and overlapping age-band cases using test accounts.
- Run TypeScript/build, accessibility, mobile E2E, IDOR and security tests.
- Exam start/save/submit, scoring, moderation, results and certificates are not implemented in this module.

## Access and isolation
- GitHub writes only to this repository and `feat/abacus-standalone-app`; no `main` merge.
- Supabase access only to `lqzdyegfhpinmoiyrtur`.
- No Academia project, Firebase, old Supabase projects, data or secrets accessed.
- Cloudflare remains the only intended deployment target. No Cloudflare account connector was available; no DNS, Pages settings, secrets or deployment were changed.

**Conclusion:** A privacy-first guardian-confirmed registration foundation is deployed. Public registration and live exams remain closed until consent policy, competition configuration, abuse controls, Auth setup and end-to-end tests pass.
