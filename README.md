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
- Registration portal now has separate student request and guardian-consent steps; it invokes authenticated Edge Functions and never writes directly to the private schema.
- Competition exam, scoring, results and certificates remain guarded until their server-side lifecycle is implemented.

## Dedicated Supabase project — connected and verified
- Project: `vattams-abacus-championship`
- Ref: `lqzdyegfhpinmoiyrtur`
- Region: `ap-south-1` (Mumbai)
- Status at last verification: `ACTIVE_HEALTHY`
- PostgreSQL 17.12.
- Private schema `abacus`; all tables have RLS enabled and no browser-role policies.
- Six migrations deployed, including guardian-confirmed registration intents, service-only RPCs and concurrency/age-band hardening.
- Two Edge Functions deployed and ACTIVE with JWT verification enabled:
  - `abacus-registration-intent`
  - `abacus-guardian-consent`
- Health advisor returned no findings.
- Security advisor reports informational `rls_enabled_no_policy` notices on private server-only tables; do not add broad client policies to silence them.

## Registration workflow and gates
1. Participant signs in with a verified email.
2. Participant creates a time-limited consent request with competition slug and guardian email only; no child name or date of birth is collected at this step.
3. Guardian signs in with a separate verified account, supplies the request reference, reviews the consent summary, then enters participant name/date of birth and explicitly accepts consent.
4. Server verifies guardian email matches the request, checks competition registration status/window, consent/rules version and published age cut-off, then resolves exactly one age band.
5. Server atomically creates a registration with pending eligibility and records an audit event. This does not grant exam access.

Important: No competition configuration or age-band data has been seeded. No real registration can succeed until a reviewed competition is configured with rules version, age cut-off, registration window and non-overlapping age bands. The current consent wording is a preliminary summary, not a reviewed legal/privacy notice. Publish the complete privacy notice and final consent text before opening registration. Production rate limiting, origin allow-listing and full E2E testing are also pending.

## Client configuration and secrets
- Browser variables: `VITE_ABACUS_SUPABASE_URL` and `VITE_ABACUS_SUPABASE_PUBLISHABLE_KEY` only.
- Never place Supabase service-role or secret keys in Vite variables, browser bundles, Git history or chat.
- Never paste Cloudflare API tokens into chat or commit them. Configure deployment credentials in Cloudflare's secure dashboard/secret store.
- Cloudflare Pages build: `npm run build`; output directory: `dist`; production branch: `feat/abacus-standalone-app`.

## Remaining online competition production gates
- Auth provider, production SMTP, Site URL, redirect URLs, expiry and rate-limit verification.
- Reviewed consent/privacy notice and published competition/age-group configuration.
- Rate limits, abuse detection and explicit production-origin CORS allow-list.
- Secure exam start/save/submit, server-side scoring, moderation, result publication and certificate verification.
- Accessibility, responsive, performance, security and end-to-end tests.
- Confirm Cloudflare Pages deployment of the exact branch head and inspect logs.

No real student personal data or live competition should be accepted until the release gates pass. No merge to `main` or production deployment is implied by documentation or UI work.
