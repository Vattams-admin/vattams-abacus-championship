# Module 48 — Online competition integrity and Supabase reconnection gate

Date: 2026-11-18
Repository: Vattams-admin/vattams-abacus-championship
Branch: feat/abacus-standalone-app

## Work completed
- Revisited the online competition core schema before any hosted deployment.
- Added composite uniqueness targets and foreign-key constraints so an exam attempt cannot point at an age group or registration from another competition.
- Added result-publication relationship constraints so a publication must reference a registration and attempt belonging to the same competition.
- Kept the schema private under the `abacus` schema; browser roles remain revoked and RLS remains enabled with no client policies.
- No real student data, live questions, answer keys, or registration information was inserted.

## GitHub commits
- `eba0b74a1fd794a11fb257cebb7605cb2e6f3b50` — Tighten competition schema relationship constraints.
- `8e0ade333c6929cfd461cdcad89317b31324d9e9` — Complete composite key targets for integrity constraints.

## Supabase connection result
The current Supabase connection lists only:
- `vattams-academy` — `ljnfktzrjewqjxxchvud` (must not be touched)
- `Vattams-admin's Project` — `nfcibyprftnowaiwlxxc` (must not be touched)

The connected organization list contains only `Vattams-admin's Org` (`guwoearkohqvidskfyxa)). The newly created Abacus organization/project visible in the owner's dashboard screenshot is not available through this connection yet. Therefore the exact new project reference cannot be verified and no SQL, migrations, Auth, Storage, or Edge Function changes were run.

### Owner reconnection steps
1. In ChatGPT, open **Settings → Plugins/Apps** and open the connected **Supabase** integration.
2. Reconnect / re-authorize the Supabase account that owns the new Abacus organization.
3. During the Supabase authorization screen, select the organization that contains the new Abacus project.
4. Return to this chat and ask to re-check the Abacus project list. Do not paste access tokens, service-role keys, database passwords, or secrets into chat.
5. We will verify the exact project name, reference, region and healthy status before running any database operation.

Supabase's current MCP guide states that OAuth setup opens a browser login and the user must choose the organization containing the target project: https://supabase.com/docs/guides/ai-tools/mcp

## Cloudflare
No Cloudflare connector or Cloudflare actions are available in this session's connected tools. Cloudflare remains the only deployment target; no Vercel deployment or configuration was added. Cloudflare deployment cannot be claimed until an authorized Cloudflare connection or a verified user-run deployment is available.

## Verification and release status
- GitHub feature-branch writes: completed and commit SHAs returned.
- Hosted SQL application: not run (correct target not connected).
- SQL execution / database advisor validation: pending.
- Auth, registration, guardian consent, exam lifecycle, autosave, server scoring, moderation, certificates: pending implementation.
- Cloudflare staging/production deployment: pending.
- Question bank: all copied answer-bearing content remains private and review-required.
- No merge to `main`; no Academia repository/project/storage/data touched.

## Next stage
After the dedicated Abacus Supabase project is visible, inspect its live status and empty schema, review the candidate SQL end-to-end, apply only to that exact project, then run table, RLS, grants and advisor verification. Continue with server-side Edge Function workflows; do not expose private question/answer data to the browser.
