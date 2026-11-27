# Standalone Online Competition Implementation Plan

## Current extraction state
This repository contains a separated source snapshot of the Abacus competition material from the original prototype PR. It is not yet a deployable online competition application.

## Online-first product requirements
- Independent student/guardian registration and authentication.
- Admin-controlled eligibility, competition scheduling, age-band assignment and attempt issuance.
- Server-authoritative exam start/deadline and one-time attempt tokens.
- Timed question delivery from private, approved question-set versions.
- Incremental answer persistence, reconnect recovery and idempotent final submission.
- Server-side scoring, moderation, result approval and certificate issuance.
- Role-based admin/reviewer/student/guardian access with auditable actions.
- Responsive mobile-first web/PWA interface.

## Content safety
- `content/review-required/objective/` contains draft source banks and answer-bearing authoring data.
- These files are not approved for public release and must never be imported into frontend bundles or served from public/static directories.
- The draft public-question source includes `answer` and `correct_option_index` fields. It is intentionally stored as review-required source material, not as a client-safe bank.
- All 240 draft questions remain pending independent subject-matter review. Do not publish or use them in an official competition until review is documented.
- `prototype/practice-only.html` is a legacy static practice prototype with client-side answer feedback. It is for UI reference only and must not be used as the official exam runtime.

## Backend and deployment boundaries
- Provision a dedicated Abacus Supabase project. Do not use `vattams-academy` or any unverified existing project.
- Use independent Supabase Auth, PostgreSQL, private Storage buckets and server-side functions.
- Enable RLS and deny-by-default policies for all exposed tables. Keep answer keys and scoring logic server-side.
- Deploy only to a separate Cloudflare Pages/Workers project and separate domain/subdomain.
- No Vercel deployment.
- No Academia credentials, Firebase/Firestore data, course catalogue IDs, storage buckets or student records.

## Build sequence
1. Finish source inventory and isolate all imports/configuration.
2. Build the React/TypeScript online competition frontend and server API.
3. Provision the dedicated backend after organization and cost confirmation.
4. Implement schema, RLS, Storage policies and Edge Functions.
5. Implement registration, eligibility, exam lifecycle, scoring, review and certificates.
6. Run unit, integration, E2E, security and accessibility tests.
7. Deploy a Cloudflare preview; production only after explicit release approval.

## Release status
Not production-ready. No dedicated backend, live authentication, real registration, server-backed exam attempt, scoring service, Cloudflare project or production deployment has been verified yet.
