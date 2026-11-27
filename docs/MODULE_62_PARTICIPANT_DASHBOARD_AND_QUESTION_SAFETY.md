# Module 62 — Participant Competition Dashboard and Question Safety Boundary

**Date:** 2026-11-18  
**Repository:** Vattams-admin/vattams-abacus-championship  
**Branch:** feat/abacus-standalone-app  
**Supabase allowlist:** lqzdyegfhpinmojyrtur only  
**Hosting target:** Cloudflare Pages only

## Scope

This module adds a server-mediated participant competition discovery contract, a participant dashboard UI, and a recursive redaction helper for public question payloads. It does not open registrations or publish a competition.

## Database changes

- `participant_list_my_competitions(user_id)` returns only confirmed registrations belonging to the authenticated participant, with competition schedule, status, eligibility and age-group label.
- `can_start` is a convenience display field only. The exam-start RPC remains authoritative and rechecks consent, approval, competition state and attempt eligibility.
- `public_question_payload(jsonb)` recursively removes sensitive answer/scoring-related keys from JSON objects and nested arrays.
- Both functions are revoked from public/anon/authenticated and granted only to service_role. The trusted Edge Function supplies the JWT-derived user UUID.
- The existing exam-start migration is updated to call `abacus.public_question_payload` before returning each question object.

## Edge Function changes

- Adds `list_my_competitions` to `abacus-exam-engine`.
- Keeps verified-email JWT validation and exact origin allow-list.
- Does not accept a participant UUID from the request body.
- Continues to expose only participant actions.

## Critical source-review finding

Module 60 previously selected and returned `question_payload` directly. This is safe only if the content authoring pipeline guarantees that the payload contains no answer material. Module 62 adds a recursive redaction helper, but the exam-start query must be updated to call it before the result is safe to expose. This repository's live question payload schema has not been verified against production data, so the helper is defense-in-depth, not proof of non-disclosure. Do not launch until the exam-start SQL is patched to call `abacus.public_question_payload(q.question_payload)`, and a recursive test suite proves answer keys, rationales and scoring metadata cannot escape.

## Soroban input and UI status

The authentic Japanese Soroban representation is one heaven bead (5) and four earth beads (1 each) per rod. The existing hero illustration depicts this 1+4 structure. The live exam still uses a generic text response field and raw JSON question display. A schema-specific interactive bead renderer is not included because the approved production question payload schema and response format were not available for inspection. Guessing that contract could cause incorrect scoring. This remains an explicit release blocker.

## Verification / deployment status

- Source changes are on `feat/abacus-standalone-app` only; do not merge to `main`.
- Supabase project access for exactly `lqzdyegfhpinmojyrtur` returned permission denied for `get_project`. No other project was accessed. Migration and Edge Function are not deployed.
- No Cloudflare tools were available; no settings, secrets or deployment changed.
- No build, Deno check, SQL test, browser test or E2E test was run.
- Not production ready.

## Release gates

1. Restore Supabase access for the single permitted project and inspect live migration state.
2. Apply Module 62 migration after Modules 57, 58 and 60.
3. Update Module 60 question selection to call `abacus.public_question_payload` and add nested answer-leak tests.
4. Inspect approved question bank fixtures and define the official response schema.
5. Build participant dashboard UI and Soroban bead-entry UI against that approved schema.
6. Run TypeScript build, SQL/function tests, security tests, mobile/accessibility and full exam E2E.
7. Deploy verified feature branch to Cloudflare Pages only.
