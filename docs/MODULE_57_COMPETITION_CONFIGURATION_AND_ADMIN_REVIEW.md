# Module 57 — Competition Configuration & Eligibility Review

**Date:** 2026-11-18  
**Repository:** `Vattams-admin/vattams-abacus-championship`  
**Branch:** `feat/abacus-standalone-app`  
**Only Supabase project:** `lqzdyegfhpinmojyrtur`

## Scope
This module adds a server-mediated foundation for versioned competition configuration and auditable admin eligibility decisions. It does not seed a live competition, age bands, staff accounts or student records.

## Database migration prepared
- Adds `abacus.competition_config_versions` for immutable configuration snapshots.
- Adds a service-role-only RPC to save competition configuration and its age bands transactionally.
- Requires competition slug, title, rules version, age cut-off date, valid registration window and at least one age band.
- Rejects invalid or overlapping age bands and validates per-band question count and duration.
- Preserves age-group IDs for unchanged codes.
- Prevents changing age cut-off after registrations exist and prevents rules/cut-off changes after exam attempts exist.
- Adds a service-role-only eligibility review RPC for approved, rejected or needs-information decisions.
- Both RPCs are revoked from PUBLIC, anon and authenticated; only service_role may execute them.
- All admin RPC calls must be made through a trusted Edge Function which verifies the signed-in user's active role in `abacus.staff_roles`. Never trust user_metadata, a browser-supplied role, or an actor UUID without server-side authorization.

## Important deployment boundary
The Supabase connector returned permission denied in this session. Therefore this migration is committed as source only and has NOT been applied to the live project. The database schema, functions and advisors remain unverified for this module. Do not claim the admin workflow is live.

## Live competition safety
- No competition values or age bands are seeded.
- Do not open public registration until a competition owner approves dates, age cutoff, age ranges, rules version and participant-facing consent text.
- Review decisions must be auditable and only active staff roles may perform them.
- Student exam access remains blocked until eligibility is approved and the exam lifecycle has passed separate security review.

## Service access
- GitHub writes are limited to this repository and `feat/abacus-standalone-app`; no main merge.
- Supabase target remains only `lqzdyegfhpinmojyrtur`; connector access denied, no live changes.
- Cloudflare remains the only intended deployment provider; no Cloudflare account connector was available in this session.
- Never expose service-role keys to browser code or commit secrets.

## Next verification gates
1. Restore Supabase MCP authorization for the dedicated project.
2. Apply this migration only to `lqzdyegfhpinmojyrtur`, then inspect migration history and run advisors.
3. Add the admin Edge Function which checks `staff_roles` using the verified JWT subject and only then calls the service-only RPCs.
4. Add the admin configuration/review UI and test unauthorized, revoked-role, overlapping-band, age-boundary and audit cases.
5. Run build, typecheck, responsive accessibility and signed-in end-to-end tests.
6. Verify the exact Cloudflare Pages deployment commit.

**Status:** Database migration source prepared; live application and production readiness not claimed.
