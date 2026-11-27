# Module 65 — Immutable Per-Attempt Question Snapshots

**Date:** 2026-11-18  
**Repository:** Vattams-admin/vattams-abacus-championship  
**Branch:** feat/abacus-standalone-app  
**Only permitted Supabase project:** lqzdyegfhpinmoiyrtur  
**Deployment target:** Cloudflare Pages only

## Why this module is required

Modules 60 and 64 selected the first N approved questions from the live question bank at exam start and submit time. If an administrator edited, reordered, approved, retired or replaced a question or answer key while a participant's attempt was in progress, the content displayed to the participant could differ from the content used for scoring. Deterministic ordering alone does not freeze an exam paper.

## Source implementation

Added `supabase/migrations/20261118200000_immutable_attempt_question_snapshots.sql`.

At the start of a new attempt, the server now copies the selected official question payload, sequence, marks, content version, answer-key version, private correct answer and scoring rule into `abacus.attempt_questions` in the same database transaction as attempt creation.

- The participant receives only the recursively redacted question payload from the attempt snapshot.
- Response validation checks the frozen question payload and exact published MCQ option strings, not the mutable question bank.
- Scoring uses the frozen marks and private answer key stored for that attempt, not current question-bank or answer-key rows.
- The question-set version hashes the question IDs, content/key versions and snapshot content.
- Snapshot rows are private, RLS-enabled, unavailable to public/anon/authenticated roles, and protected against update/delete.
- A reconnect resumes the same stored snapshot. An in-progress attempt with a missing/incomplete snapshot fails closed rather than reconstructing a paper the participant may never have seen.
- Existing one-attempt, participant-ownership, server-deadline, response-version, idempotent-submit and result-withheld controls are retained.

## Migration order and safety

Apply only after the core schema and the required server RPCs exist, in timestamp order through Modules 60, 62 and 64, then Module 65. The live project inspection on 2026-11-18 found zero exam attempts and zero question-bank records, so no current attempt data needed migration. Nevertheless, the migration has **not** been applied to production. Verify the live migration history again immediately before applying it.

## Verification still required

- Apply on an isolated non-production database first; run SQL syntax and transaction tests.
- Test exact paper snapshot consistency after editing or retiring source question rows and answer keys.
- Test incomplete question/key sets, concurrent starts, reconnect, stale saves, wrong participant, wrong question, expiry, duplicate submit and private answer-key non-disclosure.
- Verify that no exposed API route, view, RPC response or Edge Function serializes `attempt_questions.correct_answer` or `scoring_rule`.
- Confirm all approved question items have independent subject-matter review before any competition goes live.
- Deploy the matching exam Edge Function and run authenticated browser/mobile E2E tests before release.

## Current live status

The exact Supabase project `lqzdyegfhpinmoiyrtur` is healthy, but its live migration history contains only eight earlier migrations. The four exam RPCs are absent, the `abacus-exam-engine` Edge Function is not deployed, and the live competition/question/attempt tables are empty. This migration is source-only and is not production-deployed.

**Release decision: blocked / not production-ready.**
