# Module 64 — Strict Answer Contract & Deterministic Exam Scoring

**Date:** 2026-11-18  
**Repository:** Vattams-admin/vattams-abacus-championship  
**Branch:** feat/abacus-standalone-app  
**Supabase boundary:** lqzdyegfhpinmoiyrtur only  
**Deployment target:** Cloudflare Pages only

## Source findings

The Module 60 exam engine accepts arbitrary JSON response values at the HTTP boundary and stores them as JSONB. The Module 63 UI, however, sends selected MCQ option text as a string. The scoring RPC compares the stored JSONB response to the private JSONB answer value. That means the intended contract is a JSON string, not an arbitrary object, array, number or boolean.

A second issue was found in the existing scoring query: exam start selects only the first `age_groups.question_count` approved questions, but the original scoring query summed every approved question in that age group. If extra approved bank rows existed beyond the configured paper length, the denominator and score could include questions the participant never received.

## Implementation

- Added `supabase/migrations/20261118190000_strict_answer_contract_and_deterministic_scoring.sql`.
- The database save RPC now requires a JSON string, enforces the 12,000-character ceiling again at the authoritative database boundary, and rejects MCQ strings that do not exactly match one of that question's published option strings.
- Text-entry questions without an options array remain string-valued; their approved scoring rule remains a separate content-governance requirement.
- Scoring now selects the same first-N approved questions by `sequence_no` using the age group's configured `question_count`.
- Scoring verifies that the selected set has a matching private answer key for every selected question before finalizing. It blocks instead of silently scoring a partial set.
- Scoring version advances from `exact-json-v1` to `exact-json-v2`.
- Function execution remains revoked from public, anon and authenticated roles and granted only to service_role. The trusted Edge Function continues to verify the participant JWT and derive the user ID server-side.

## Expected security and correctness properties

1. A participant cannot submit a response object containing forged correctness/score metadata through the normal RPC.
2. For MCQ items, the response must equal one visible option string exactly; option indices and arbitrary values are rejected.
3. Answer keys remain private and are never returned by the save RPC.
4. The scoring denominator is the configured paper length, not every approved item in the wider bank.
5. Missing selected answer keys block scoring rather than produce a partial score.
6. Existing ownership, deadline, status and response-version checks are retained.

## Validation still required

- Apply only after verifying the live migration history for project `lqzdyegfhpinmoiyrtur`.
- Run SQL tests for string / object / array / numeric / null responses, valid and invalid options, stale versions, wrong participant, wrong attempt, expired attempt and missing answer keys.
- Verify `correct_answer` JSONB uses the same JSON string serialization as the selected option text.
- Test extra approved questions beyond `question_count` and confirm they do not affect the result.
- Run the repository typecheck/build, Deno checks, browser accessibility/mobile tests and full authenticated online competition E2E.

## Permission and deployment status

- GitHub branch search confirms `feat/abacus-standalone-app` exists and file reads/writes are available.
- Changes are committed only to this feature branch. `main` is not modified or merged.
- Supabase reconnect is still blocked: `get_project` and `list_migrations` for the exact allowed project `lqzdyegfhpinmoiyrtur` return permission denied. No other Supabase project was accessed. This migration has **not** been applied.
- No Cloudflare connector is available in this session. No Cloudflare secrets, Pages settings, DNS or deployment were changed.
- No build, SQL test, Deno check or production E2E was run in this turn.
- Official objective question content remains pending independent review; this module does not approve or publish any question bank.

## Release decision

**Not production-ready yet.** The answer contract and scoring scope are hardened in source, but live migration state, backend permissions, answer-key serialization, content approval, full tests and Cloudflare deployment verification remain release gates.
