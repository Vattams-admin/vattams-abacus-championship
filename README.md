# VATTAMS Abacus Beads Championship

Standalone online Soroban/Abacus competition application.

## Isolation rules
- This repository is independent of VATTAMS Academia.
- Do not import Academia application code, Firebase projects, student records, course data, Supabase projects, storage buckets, credentials, or deployment configuration.
- Use only the dedicated Abacus Supabase project and a dedicated Cloudflare deployment.
- Keep official question sets, answer keys, scoring internals, and unreleased competition content private.
- Official question content must not be published until independent subject-matter review and release approval are complete.

## Current foundation
- Private standalone repository; active development branch: `feat/abacus-standalone-app`.
- Dedicated Supabase organisation and project were created manually by the owner on 2026-11-18; dashboard screenshot showed Healthy status and South Asia (Mumbai / ap-south-1).
- Initial private-schema online competition design is in `supabase/schemas/abacus_competition_core.sql`.
- Backend security and lifecycle notes: `docs/ONLINE_COMPETITION_BACKEND_CORE.md`.
- Dedicated storage boundary: `docs/ABACUS_SUPABASE_STORAGE_BOUNDARY.md`.

## Current blockers / release status
- The connected Supabase integration still lists only the two projects in the previous organisation; the new account/project is not yet accessible through that connection. Do not run database mutations until the new account is connected and the exact project ref is verified.
- SQL is a version-controlled schema candidate; it has not yet been applied to the hosted project or validated against the live database.
- Storage buckets and policies, Auth flows, Edge Functions, web client, Cloudflare staging/production deployment, and end-to-end online exam tests remain pending.
- The copied question bank contains answer-bearing source material and remains review-required; no official questions are approved for release.

## Production target
Guardian/student registration -> eligibility approval -> server-authorised timed attempt -> autosaved responses and reconnect recovery -> idempotent final submission -> server-side scoring -> moderation -> result approval/publication -> certificate issuance and verification.

No Academia project or existing Supabase project has been modified. No merge to `main` or production deployment has occurred.
