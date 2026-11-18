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
- Participant sign-in UI uses Supabase email OTP and publishable browser key only.
- Registration, eligibility, live exam, scoring, results and certificates remain guarded informational workflows until their secure server-side implementation is complete.

## Dedicated Supabase project — connected and verified
- Project: `vattams-abacus-championship`
- Ref: `lqzdyegfhpinmoiyrtur`
- Region: `ap-south-1` (Mumbai)
- Status at last verification: `ACTIVE_HEALTHY`
- PostgreSQL 17.12.
- Eleven tables in private `abacus` schema; RLS enabled on all; zero rows.
- Four migrations deployed: `create_abacus_competition_core`, `harden_attempt_response_scope`, `index_competition_foreign_keys`, `index_result_publication_scope`.
- No Edge Functions deployed yet. Auth provider, production SMTP, redirect URLs, Storage buckets/policies and app workflows still require configuration.
- Security advisor reports 11 informational `rls_enabled_no_policy` findings. These tables are intentionally private/server-only at this stage; do not add broad client policies just to silence the advisor.
- Performance advisor reports unused indexes on empty/new tables; review after workload tests rather than deleting them prematurely.
- Health advisor returned no findings at the last check.

## Client configuration and secrets
- Browser variables: `VITE_ABACUS_SUPABASE_URL` and `VITE_ABACUS_SUPABASE_PUBLISHABLE_KEY` only.
- Never place Supabase service-role or secret keys in Vite variables, browser bundles, Git history or chat.
- Never paste Cloudflare API tokens into chat or commit them. Configure deployment credentials in Cloudflare's secure dashboard/secret store.
- Cloudflare Pages build: `npm run build`; output directory: `dist`; production branch: `feat/abacus-standalone-app`.

## Online competition production gates
1. Supabase Auth email OTP, SMTP, Site URL, redirect URLs, expiry and rate-limit verification.
2. Secure Edge Functions for registration, eligibility review, exam start/save/submit, server-side scoring, result publication and certificate verification.
3. Guardian consent, age-band enforcement, staff authorization, answer-key isolation, audit trail and rate limits.
4. Autosave/reconnect recovery, monotonic response versions, server-authoritative timing and idempotent submission.
5. Independent review of all question content and private answer keys.
6. Typecheck, production build, accessibility, responsive, performance, security and end-to-end tests.
7. Confirm Cloudflare Pages deployment of the exact branch head and inspect logs.

No real student personal data or live competition should be accepted until the release gates pass. No merge to `main` or production deployment is implied by documentation or UI work.
