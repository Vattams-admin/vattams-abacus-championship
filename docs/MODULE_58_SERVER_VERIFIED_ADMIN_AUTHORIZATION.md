# Module 58 — Server-Verified Admin Authorization

**Date:** 2026-11-18  
**Repository:** Vattams-admin/vattams-abacus-championship  
**Branch:** feat/abacus-standalone-app  
**Supabase target:** lqzdyegfhpinmojyrtur only

## Added source
- Edge Function: `supabase/functions/abacus-admin-workflow/index.ts`
- Migration: `supabase/migrations/20261118160000_service_only_staff_role_lookup.sql`
- Uses the caller's bearer JWT to resolve the verified Supabase Auth user.
- Reads active staff authorization from private `abacus.staff_roles` through a service-role-only public RPC bridge. The private schema does not need to be exposed to browser clients.
- Never trusts browser role fields or Auth user_metadata.
- Allows super_admin and competition_admin to save configuration.
- Allows super_admin, competition_admin and reviewer to submit eligibility decisions.
- Calls only the service-role-only Module 57 RPCs and supplies the actor UUID derived from the verified JWT.
- Requires an explicit `ABACUS_ALLOWED_ORIGINS` environment variable containing comma-separated exact origins. Requests from other origins are rejected.
- Does not return or expose service-role credentials.

## Operational requirements
- Apply the Module 57 and Module 58 migrations in order to the dedicated project.
- Set `ABACUS_ALLOWED_ORIGINS` in the Supabase Edge Function secrets for the dedicated project only.
- Deploy this function with JWT verification enabled.
- Configure a reviewed staff-role provisioning process. Do not grant roles from the browser.
- Add rate limiting and security logging at the gateway / edge layer.
- Test verified user, unverified user, no role, revoked role, reviewer attempting config save, admin config save, invalid age bands and review decisions.
- The function source assumes the Module 57 migration and Module 58 role-lookup migration have been applied.

## Deployment status
Supabase MCP calls for project lqzdyegfhpinmojyrtur returned permission denied. Therefore the migrations and function are committed as source only and have NOT been deployed. No Supabase project was created or changed.

Cloudflare remains the only intended website deployment platform. This Supabase Edge Function is a backend API component, not a website deployment. No Cloudflare settings were changed.

## Release gate
Do not enable admin UI or public registration until migrations and function are deployed to the dedicated project, roles are provisioned securely, and integration tests pass.
