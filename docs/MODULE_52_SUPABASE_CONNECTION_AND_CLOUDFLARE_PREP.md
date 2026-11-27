# Module 52 — Supabase connection re-verification and Cloudflare Pages preparation

Date: 2026-11-18
Repository: Vattams-admin/vattams-abacus-championship
Branch: feat/abacus-standalone-app

## Supabase connection verified
The dedicated Abacus project was re-opened successfully using the exact project reference:
- Project: vattams-abacus-championship
- Ref: lqzdyegfhpinmoiyrtur
- URL: https://lqzdyegfhpinmoiyrtur.supabase.co
- Region: ap-south-1 (Mumbai)
- Status: ACTIVE_HEALTHY
- PostgreSQL: 17.12
- Migrations: 4
- Private abacus tables: 11, all RLS enabled
- Edge Functions: none yet
- Health advisor: no findings

Only this project was accessed. No old or Academia projects were queried or modified.

## Browser configuration
The existing browser client uses only:
- VITE_ABACUS_SUPABASE_URL
- VITE_ABACUS_SUPABASE_PUBLISHABLE_KEY

The project publishable key was verified to exist. It is a browser-safe publishable key; it is not a service-role secret. Do not add service-role/secret keys to VITE variables or commit secrets to GitHub.

For the Cloudflare Pages build environment, configure:
- VITE_ABACUS_SUPABASE_URL = https://lqzdyegfhpinmoiyrtur.supabase.co
- VITE_ABACUS_SUPABASE_PUBLISHABLE_KEY = the project's active sb_publishable key, copied from Supabase Project API Keys

These are build-time variables because Vite embeds VITE_* values in the browser bundle. Never place SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY in Cloudflare Pages build variables prefixed with VITE_.

## Auth configuration still required
In Supabase Dashboard > Authentication:
1. Enable the selected participant sign-in provider (email OTP/magic link).
2. Configure SMTP and sender identity for production delivery.
3. Add the final Cloudflare production domain and approved preview domains to Site URL / Redirect URLs.
4. Ensure the email link redirect matches the deployed origin.
5. Test signup/sign-in, expiry, resend limits and recovery before accepting real participant data.

No Auth provider settings could be changed through the available Supabase connector actions in this session. The app must not collect participant data until these dashboard settings and guardian-consent workflow are verified.

## Cloudflare Pages configuration added
- `wrangler.toml`: Pages build output `./dist`.
- `public/_redirects`: SPA fallback.
- `public/_headers`: baseline security headers and a restrictive CSP allowing the dedicated Supabase API/WebSocket origin only.

Build settings:
- Build command: `npm run build`
- Build output directory: `dist`
- Framework preset: Vite
- Root directory: repository root

Cloudflare is the sole deployment target. No Cloudflare connector/API action is available in this session, so no project creation, DNS change, secret configuration or deployment is claimed. Do not deploy to Vercel.

## Release gates
Before public launch:
- Set the two browser-safe VITE variables in Cloudflare Pages build settings.
- Configure Auth Site URL and Redirect URLs.
- Implement server-mediated registration, guardian consent, age-group verification and admin review.
- Implement server-authoritative exam start/save/submit, scoring and result publication.
- Add private Storage buckets and policies.
- Add security, accessibility, mobile, reconnect, IDOR, duplicate-submit and answer-key-leakage tests.
- Run `npm ci`, `npm run typecheck`, `npm run build`, and content validators in a real build environment.
- Verify production Cloudflare deployment and Supabase Auth end-to-end before accepting registrations.

## Isolation
No VATTAMS Academia assets, databases, Firebase, storage, secrets or deployments were touched. All work remains on `feat/abacus-standalone-app`; no merge to main.
