# Online Competition Backend — Core Schema and Security Boundary

## Scope
This is the first backend foundation for the standalone VATTAMS Abacus Beads Championship online competition app. It is not a static practice tool. The system must support real registration, eligibility review, timed online attempts, autosave, reconnect, final submission, server-side scoring, result approval, and certificate verification.

## Database boundary
- All competition tables are in the non-exposed `abacus` schema.
- Browser roles `anon` and `authenticated` receive no schema or table privileges.
- RLS is enabled on every table and no client policies are created in this first stage.
- Edge Functions are the only intended application access path and must authenticate the caller, check ownership/role/competition state, and use server-only credentials.
- Never put service-role/secret keys in browser bundles or public Cloudflare variables.
- Never use user-editable Auth metadata as an authorization source. Staff roles are held in `abacus.staff_roles`, with provisioning restricted to trusted administrative operations.

## Core tables
- `competitions`, `age_groups`: competition configuration and age-band rules.
- `registrations`: student identity link, guardian link, consent, eligibility and review status.
- `question_bank`: answer-free student-delivery question payloads, version and independent review status.
- `answer_keys`: separate answer/scoring data, never joined into student question responses.
- `exam_attempts`: server-controlled schedule, deadline, state, idempotency and scoring lifecycle.
- `attempt_responses`: one current autosaved response per attempt/question.
- `result_publications`, `certificates`: moderated result and certificate issuance.
- `audit_events`: privileged action and lifecycle audit trail.

## Mandatory Edge Function rules
1. Verify access tokens with Supabase Auth and derive the actor from the verified JWT.
2. For every registration/attempt, enforce that the caller is the student, approved guardian, or authorised staff member.
3. Never trust client-supplied age group, eligibility, start time, deadline, attempt status, score, rank, certificate number, or role.
4. The server sets `started_at` and `deadline_at`; client clocks are informational only.
5. Autosave must be idempotent, versioned, rate-limited, and reject writes after server deadline or final submission.
6. Final submission must be idempotent and atomically freeze the response set.
7. Scoring reads `answer_keys` only server-side and stores a versioned score; client never receives correct answers or scoring rules.
8. Result publication requires an explicit authorised approval step. Certificates are generated only from approved publications.
9. Audit events must not store passwords, tokens, full answer keys, or unnecessary personal data.

## Storage buckets (create separately after project access is connected)
- `abacus-question-papers-private`
- `abacus-answer-keys-private`
- `abacus-submissions-private`
- `abacus-certificates`
- `abacus-brand-assets`

All assessment, answer-key and submission buckets remain private. Prefer server-issued short-lived signed URLs after an authorisation check. Public certificate verification should use a minimal server endpoint, not public bucket listing.

## Release gates
- Independent subject-matter review of every question and answer key.
- RLS and grants verified; anonymous and authenticated direct SQL/API access denied.
- Edge Function auth, ownership, staff-role and abuse controls tested.
- Deadline, autosave/reconnect, idempotent submission and concurrent-attempt tests pass.
- Scoring independently reconciled against reviewed answer keys.
- Result approval and certificate revocation/verification tested.
- Cloudflare staging and production secrets isolated from Academia.

## Not yet complete
This schema file is a reviewed implementation candidate in Git. It has **not** been applied to the newly created Supabase project because the connected Supabase tool session currently lists only the old organisation's two projects. Reconnect the new Supabase account/organisation before any live database changes. No existing project was changed.
