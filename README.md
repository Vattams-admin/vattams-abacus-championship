# VATTAMS Abacus Beads Championship

Standalone online Japanese Soroban competition platform.

## Isolation and deployment rules
- This repository is independent of VATTAMS Academia.
- Do not import Academia application code, Firebase projects, student records, course data, Supabase projects, storage buckets, credentials, or deployment configuration.
- Use only the dedicated Abacus Supabase project `lqzdyegfhpinmoiyrtur` and a dedicated Cloudflare deployment.
- Keep official question sets, answer keys, scoring internals, and unreleased competition content private.
- Official question content must not be published until independent subject-matter review and release approval are complete.
- Active development branch: `feat/abacus-standalone-app`. Do not merge to `main` without explicit owner permission.
- Cloudflare Pages is the only intended deployment target; do not deploy to Vercel.

## Current frontend foundation
- React 19 + TypeScript + Vite.
- Responsive dark navy / metallic gold championship identity.
- Japanese Soroban hero illustration: each rod renders one heaven bead (5) and four earth beads (1 each).
- Participant sign-in uses Supabase email OTP and the publishable browser key only.
- Registration portal has separate student request and guardian-consent steps; it invokes authenticated Edge Functions and does not write directly to the private schema.
- Exam, scoring, results and certificates must remain disabled until their server-side lifecycle and release tests are verified.

## Dedicated Supabase project — latest verification (18 Nov 2026)
- Project: `vattams-abacus-championship`
- Ref: `lqzdyegfhpinmoiyrtur` (the only authorized project for this app)
- Region: `ap-south-1`
- Status: `ACTIVE_HEALTHY`
- PostgreSQL 17.12.
- Live migration history currently returns 8 applied migrations. The repository has later exam/admin migrations that are not yet confirmed applied to production; reconcile the exact migration versions/names before rollout.
- Live Edge Functions returned:
  - `abacus-registration-intent` v2 ACTIVE
  - `abacus-guardian-consent` v2 ACTIVE
- `abacus-exam-engine` and `abacus-admin-workflow` are not deployed in the verified live inventory.
- The live `abacus` function inventory query returned `confirm_guardian_registration`; required participant, exam and admin RPCs are not yet verified live.
- Security advisor reports 12 informational RLS-enabled/no-policy notices for private server-mediated tables. Do not add broad browser-role policies to silence them.
- Performance advisor reports two unindexed foreign keys on `registration_intents`; unused-index notices require workload evidence before any index removal.

## Registration workflow and gates
1. Participant signs in with a verified email.
2. Participant creates a time-limited consent request with competition slug and guardian email only; no child name or date of birth is collected at this step.
3. Guardian signs in with a separate verified account, supplies the request reference, reviews the consent summary, then enters participant name/date of birth and explicitly accepts consent.
4. Server verifies guardian email matches the request, checks competition registration status/window, consent/rules version and published age cut-off, then resolves exactly one age band.
5. Server atomically creates a registration with pending eligibility and records an audit event. This does not grant exam access.

Important: No competition configuration or age-band data has been seeded. No real registration should be opened until a reviewed competition is configured with rules version, age cut-off, registration window and non-overlapping age bands. The current consent wording is a preliminary summary, not a reviewed legal/privacy notice. Publish the complete privacy notice and final consent text before opening registration. Production rate limiting, origin allow-listing and full E2E testing are also pending.

## Client configuration and secrets
- Browser variables: `VITE_ABACUS_SUPABASE_URL` and `VITE_ABACUS_SUPABASE_PUBLISHABLE_KEY` only.
- Never place Supabase service-role or secret keys in Vite variables, browser bundles, Git history or chat.
- Never paste Cloudflare API tokens into chat or commit them. Configure deployment credentials in Cloudflare's secure dashboard/secret store.
- Cloudflare Pages build: `npm run build`; output directory: `dist`; configured production branch must be confirmed in Cloudflare dashboard before release.

## Repository validation commands
- `npm run typecheck`
- `npm run build`
- `npm run validate:structure` — structural bank validation only; it does not approve content.
- `npm run preflight:release` — read-only release preflight; expected to block until external production gates are verified.
- The strict content review gate is enforced by `node scripts/validate-abacus-international-bank.mjs` without `--structure-only`. Do not mark content reviewed without independent documented review.

## Remaining online competition production gates
- Reconcile pending migrations and confirm all required RPC signatures/grants in the live project.
- Deploy and verify exam/admin Edge Functions only after SQL contracts, CORS origins, secrets and authorization paths pass review.
- Independent review and approval of practice/official question banks and private answer keys.
- Complete registration, guardian consent, eligibility review and access synchronization tests.
- Verify immutable question snapshots, autosave/reconnect, stale-response protection, concurrency, deadlines, scoring and duplicate-submit behavior.
- Verify result moderation/publication and certificate verification.
- Complete accessibility, responsive, performance, security and browser/E2E tests.
- Confirm Cloudflare Pages permissions, production environment variables, exact deployment SHA, custom domain, SPA routing and production smoke tests.

No real student personal data or live competition should be accepted until the release gates pass. No merge to `main` or production deployment is implied by documentation or UI work.


## Latest source-only security hardening — 18 Nov 2026
- The pending participant question-redaction migration now denies known answer/scoring aliases and unknown key names containing answer/correct/solution/rationale/explanation/scoring/grading/rubric/mark/score/point/private-note/review-status/approval tokens after normalization.
- The participant competition dashboard now treats `under_review` attempts as already used, matching the server-side one-attempt gate.
- Added `npm run test:question-redaction` as a source-contract regression check.
- These are feature-branch source changes only. The migration has NOT been applied to Supabase production, and the regression check has not been run from a full repository checkout. Do not treat this as a live production fix until migration application and integration tests are completed.
