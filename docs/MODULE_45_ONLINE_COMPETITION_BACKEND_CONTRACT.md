# Module 45 — Online Competition Backend Contract, Data Model & Security Design

## Scope and status
This document specifies the independent backend contract for the VATTAMS Abacus Beads Championship online competition. It is a design artifact only. It does not create a database, apply migrations, provision Supabase, or claim a working production service.

## Hard isolation rules
- Use a newly provisioned Abacus-only Supabase project.
- Never connect this app to the `vattams-academy` project or the unverified existing admin project.
- Do not reuse Academia Firebase Auth, Firestore, storage, course catalogue, student records, payment configuration, environment variables or secrets.
- Keep the existing Academia source repository and PR #143 unchanged.
- Keep answer keys, unreleased papers, scoring rules and moderation records server-side/private.
- Production release requires a separate explicit approval after preview testing.

## Actors and permissions
- Visitor: read public competition information and published rules only.
- Student: manage own profile and registration; view own eligible competitions, own attempt and own published result.
- Guardian: access only students explicitly linked and consented to that guardian; no access to unrelated student records.
- Reviewer: review assigned question items and content versions; cannot publish results or change privileged roles.
- Competition operator: manage schedules, eligibility and attempt issuance; cannot access raw answer keys unless separately authorised.
- Scorer/service: server-side only; read approved question keys and submissions, write scores and audit records.
- Result approver: approve moderation outcomes and publish results; every override requires reason and audit event.
- Super administrator: tightly restricted, MFA-protected, audited; role assignment occurs only through trusted server-side administration.

## Logical relational model
All primary keys should be UUIDs unless a stable public identifier is specifically required. Include created_at/updated_at, constraints, indexes and foreign keys. Enable RLS for every table exposed through the API.

### Identity and participant
- profiles(id references auth.users, display_name, phone, email, role_status, account_status)
- students(id, profile_id, date_of_birth_private, age_band_verified, verification_state, consent_state)
- guardians(id, profile_id, relationship_status)
- guardian_student_links(id, guardian_id, student_id, consented_at, revoked_at)

Do not expose date of birth broadly. Prefer storing a verified age-band result and keep exact birth data in a restricted record only where operationally necessary.

### Competition and registration
- competitions(id, slug, title, description_public, rules_version, registration_opens_at, registration_closes_at, starts_at, ends_at, status, published_at)
- competition_age_bands(id, competition_id, band_code, eligibility_rule_version)
- registrations(id, competition_id, student_id, age_band_id, registration_reference, eligibility_status, payment_status, registration_status, reviewed_by, reviewed_at)
- payment_events(id, registration_id, provider_reference, amount_minor, currency, event_type, verified_at, idempotency_key)

Payment events are written only by trusted verification handlers. Never accept a client-provided “paid” flag as proof of payment.

### Question bank and release control
- question_items(id, internal_code, topic, skill, age_band, difficulty, source_reference, review_status, current_version_id)
- question_item_versions(id, question_item_id, version, prompt_payload, options_payload, rationale_private, answer_key_private, content_hash, created_by, created_at)
- question_reviews(id, item_version_id, reviewer_id, verdict, comments_private, reviewed_at)
- question_sets(id, competition_id, age_band_id, version, release_status, manifest_hash, approved_by, approved_at)
- question_set_items(id, question_set_id, item_version_id, sequence_no, marks, time_limit_seconds)

Question and answer payloads must not be available to student or guardian API roles before an attempt is issued. Answer keys must never be selected into a client-facing response.

### Attempts and scoring
- attempts(id, registration_id, question_set_id, attempt_number, state, started_at, deadline_at, submitted_at, server_nonce_hash, last_activity_at)
- attempt_questions(id, attempt_id, item_version_id, display_order, marks, time_limit_seconds)
- attempt_responses(id, attempt_question_id, response_payload, saved_at, revision_no)
- submission_receipts(id, attempt_id, receipt_code, submitted_at, payload_hash)
- scores(id, attempt_id, raw_score, max_score, scoring_version, scoring_state, scored_at)
- score_reviews(id, score_id, reviewer_id, decision, reason_private, decided_at)
- result_publications(id, competition_id, publication_version, published_by, published_at)
- certificates(id, student_id, competition_id, certificate_number, issue_state, issued_at, verification_token_hash)

Store only the minimum response data needed. Do not expose scoring internals or reviewer notes to participants.

### Audit and operations
- audit_events(id, actor_user_id, actor_role_snapshot, action, entity_type, entity_id, reason, request_id, occurred_at)
- incident_reports(id, attempt_id, category, report_payload_private, status, assigned_to, resolved_at)
- admin_role_grants(id, user_id, role, granted_by, reason, granted_at, revoked_at)

Never log passwords, auth tokens, payment secrets, answer keys, full private profile payloads or raw signed URLs.

## API contract — server-authoritative
Use authenticated server endpoints/Edge Functions. Names are illustrative; request validation and auth checks are mandatory.

### Public
- GET /public/competitions — only published competitions and public fields.
- GET /public/competitions/{slug}/rules — immutable published rules version.

### Participant
- POST /registrations — derive authenticated student identity from session; validate guardian consent and eligibility; idempotency key required.
- GET /me/registrations — only registrations owned by the authenticated student or a properly linked guardian.
- POST /attempts/{id}/start — verify registration eligibility, schedule window, attempt count, question-set release and no conflicting active attempt; issue server deadline and attempt nonce.
- GET /attempts/{id}/questions — return only issued prompts/options; strip answer_key_private, correct_option_index, rationale_private, review metadata and internal source references.
- PUT /attempts/{id}/responses/{questionId} — validate ownership, active state, server deadline, payload shape and monotonically increasing revision; idempotent save.
- POST /attempts/{id}/submit — atomically close attempt, compute payload hash, create receipt and reject duplicate or late submissions according to published policy.
- GET /me/results — only approved and published results.
- GET /certificates/{certificateNumber}/verify — return minimal certificate validity fields, not participant private details.

### Operator and reviewer
- POST /operator/registrations/{id}/eligibility — operator-only decision with reason.
- POST /review/question-versions/{id}/decision — assigned reviewer only; cannot self-approve own content.
- POST /operator/competitions/{id}/schedule — operator role and audit event.
- POST /operator/results/{competitionId}/approve — separate approver role, dual-control policy and audit event.
- POST /operator/results/{competitionId}/publish — only after approval and release checks.

## RLS policy principles
- Default deny. Add explicit SELECT/INSERT/UPDATE/DELETE policies for each role and table.
- A student can read/update only their own permitted profile fields and their own registrations/attempt summaries.
- A guardian can read only linked students where consent is active; guardian links must be validated server-side.
- Students/guardians cannot select question_item_versions answer fields, question reviews, scores before publication, audit_events or admin grants.
- Reviewer reads are limited to assigned content versions; reviewer cannot approve own authored content.
- Operators receive only the operational columns required for their job; they do not automatically receive answer keys.
- Scorer service access is server-only and must not be exposed with a service-role credential in the browser.
- Admin role grants are never writable by ordinary authenticated users.
- UPDATE policies require corresponding SELECT visibility; verify both USING and WITH CHECK conditions.
- Test every policy with separate student, guardian, reviewer, operator, approver and anonymous identities.

## Attempt lifecycle and invariants
Allowed normal path:
registered → eligibility_pending → eligible → scheduled → ready → in_progress → submitted → scoring_pending → review_pending → approved → published.

Exceptional states:
payment_pending, rejected, cancelled, expired, disconnected_review, voided.

Invariants:
1. The server clock controls start/deadline; never trust client device time.
2. One attempt is bound to one registration, one question-set version and one deadline.
3. Attempt creation and submission are idempotent.
4. After submission, responses are immutable except through a privileged, audited correction process.
5. A disconnected participant may reconnect only to the same valid attempt; do not silently create a new attempt.
6. Late submission handling follows a published rule and an auditable exception path.
7. Result visibility is gated by approval and publication state.
8. Certificates are issued only for published eligible results.

## Threat model and test cases
- Horizontal privilege escalation: student A cannot read student B's registration, attempt, response or result.
- Guardian overreach: guardian A cannot access a student without active verified linkage and consent.
- Role tampering: changing client metadata cannot grant reviewer/operator/admin roles.
- Answer leakage: browser bundles, network responses, logs and public storage contain no answer keys or correct-option fields.
- Replay: duplicate payment callback, registration request, start request or submission does not duplicate state.
- Deadline bypass: client clock changes and delayed requests cannot extend server deadline.
- Concurrent attempts: two devices cannot start parallel attempts unless rules explicitly permit it.
- Content substitution: attempt question-set version and content hash remain immutable after issuance.
- Storage exposure: private documents cannot be read by anonymous users or unrelated participants.
- Admin abuse: score override, result approval and role grants require reason and audit trail.

## Migration and release gates
1. Confirm dedicated Supabase organization and accept any nonzero project cost.
2. Provision new project and wait for ACTIVE_HEALTHY.
3. Apply reviewed migrations only to that new project.
4. Verify RLS, Storage access, Edge Function secrets and service-role isolation.
5. Run automated policy tests with seeded synthetic accounts.
6. Run online exam E2E tests under flaky network and mobile conditions.
7. Independently review all competition questions and publish only approved immutable versions.
8. Connect a separate Cloudflare preview project; verify environment bindings and security headers.
9. Obtain explicit production release approval.

## Current implementation boundary
This module is a backend contract and security design. No Supabase project was created, no SQL was applied, no Cloudflare resource was created, and no production endpoint is live as a result of this document.
