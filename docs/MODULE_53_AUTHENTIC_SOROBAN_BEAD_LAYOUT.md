# Module 53 — Authentic Soroban Bead Layout & Visual Verification

**Date:** 2026-11-18  
**Project:** VATTAMS Abacus Beads Championship  
**Repository:** `Vattams-admin/vattams-abacus-championship`  
**Branch:** `feat/abacus-standalone-app`  
**Scope:** Correct the decorative Soroban illustration in the online competition portal. This is a frontend presentation correction; it does not implement exam mechanics.

## 1. User-reported defect

The landing-page illustration showed an incorrect bead count and did not represent a Japanese Soroban. The previous markup rendered five visually identical beads on each rod, split around the beam, which could be interpreted as a 2 + 2 arrangement.

## 2. Correct Soroban convention

Each decimal rod must show:
- **One heaven bead** above the reckoning beam, with value 5.
- **Four earth beads** below the reckoning beam, each with value 1.
- A bead is counted only when moved into contact with the beam.
- The standard illustration uses seven rods in the hero graphic; rod count is illustrative and does not change the 1 + 4 convention.

## 3. Implementation

Updated:
- `src/App.tsx`: replaced the generic five-bead rod markup with a distinct heaven-bead rail and four-bead earth rail.
- `src/styles.css`: added separate positioning for the heaven and earth rails and shared bead styling.

Commits on `feat/abacus-standalone-app`:
- `564139c5abc1724bc03fc3a6d83c3bf2ff09a020` — `fix: render authentic 1-plus-4 Soroban bead layout`
- `c3757ebba63c6f1775c777921dec3ebb47cfe51b` — `fix: position Soroban heaven and earth beads correctly`

## 4. Verification status

- GitHub branch head verified as `c3757ebba63c6f1775c777921dec3ebb47cfe51b`.
- User supplied a Cloudflare Pages screenshot showing the portal landing page rendering. This is visual evidence of a deployed page, not proof that the latest two commits have completed a fresh deployment.
- No browser-based visual regression test, production build log, or automated UI test was available during this module. Do not mark the frontend build or full online competition as production-ready on this evidence alone.

## 5. Dedicated backend status checked for this module

Only the dedicated Abacus Supabase project was queried:
- Project ref: `lqzdyegfhpinmoiyrtur`
- Project: `vattams-abacus-championship`
- Region: `ap-south-1` (Mumbai)
- Status: `ACTIVE_HEALTHY`
- PostgreSQL: `17.12`
- Four migrations present: `create_abacus_competition_core`, `harden_attempt_response_scope`, `index_competition_foreign_keys`, `index_result_publication_scope`.
- Eleven `abacus` schema tables exist, all with RLS enabled and zero rows.
- No Edge Functions are deployed.
- Health advisor returned no findings.

No Supabase schema, Auth, Storage, or data changes were made in Module 53. The backend is not yet an operational competition API: registration, eligibility, exam delivery, autosave, submission, scoring, result publication, and certificate workflows still require secure server-side implementation and testing.

## 6. Access and deployment boundaries

- GitHub changes remain on `feat/abacus-standalone-app`; `main` was not modified.
- Supabase access was restricted to the dedicated Abacus project ref above. No Academia or other project was accessed.
- Cloudflare Pages is the intended deployment target. The available Cloudflare token is account-side; its secret value must never be pasted into chat, committed to Git, or exposed to browser code.
- No Cloudflare account API operation, domain/DNS change, environment-variable update, or deployment action was performed by the assistant in this module. The user-facing Pages screenshot is recorded as user-supplied evidence only.
- Never put Supabase service-role or secret keys in Vite `VITE_*` variables. Browser code must use only the publishable key.

## 7. Next release gates

1. Confirm Cloudflare Pages rebuilt the latest branch head and inspect its build log.
2. Run a production build and TypeScript checks; add visual regression coverage for 1 + 4 bead layout.
3. Review and remediate the four high-severity npm audit findings from the previously supplied Cloudflare build log without blindly using `npm audit fix --force`.
4. Configure Supabase Auth (email OTP, production SMTP, Site URL and redirect URLs) and test link expiry and rate limits.
5. Implement secure Edge Functions for registration, approval, exam start/save/submit, server-side scoring, result publication and certificates.
6. Test guardian consent, age-band enforcement, authorization boundaries, rate limiting, idempotent submission, answer-key isolation and recovery from network interruption.
7. Do not accept real student personal data or open a live competition until the end-to-end security and operational checks pass.

**Module 53 conclusion:** The hero illustration markup and styling have been corrected to show one heaven bead and four earth beads per rod. This is a visual correction only; the online competition remains under development.
