# Module 49 — Online competition API contract and connection gate

Date: 2026-11-18
Repository: Vattams-admin/vattams-abacus-championship
Branch: feat/abacus-standalone-app

## Scope
This module defines the server-owned API contract for a real online competition. It does not claim that endpoints are deployed or that a hosted database is connected.

## Non-negotiable security model
- Browser clients never read the private `abacus` schema or answer-key records.
- Every participant operation requires a valid Supabase Auth access token and server-side user verification.
- Authorization is derived from server-controlled records, never editable user metadata.
- The browser cannot choose an exam deadline, question set, score, rank, eligibility status, or publication status.
- All writes use idempotency keys and server timestamps.
- Service-role credentials are restricted to Edge Function secrets and must never be bundled into Vite/browser code.
- No personal data is accepted until Auth, consent, privacy notice, retention, and access controls are implemented.

## API contract (planned; not deployed)

### 1. Registration
`POST /functions/v1/abacus-registration`

Request:
```json
{
  "competition_slug": "published-slug",
  "student_display_name": "Participant name",
  "date_of_birth": "YYYY-MM-DD",
  "guardian": {
    "email": "guardian@example.invalid",
    "consent_version": "published-consent-version",
    "consent_token": "one-time-server-issued-token"
  }
}
```

Rules:
- Verify JWT with Supabase Auth `getUser(token)`.
- Do not accept a client-supplied student_user_id.
- Derive participant user ID from the verified JWT.
- Determine age group on the server from date of birth and the competition's published age cut-off.
- Require guardian verification/consent when the approved rules or applicable law require it; never treat a checkbox alone as verified consent.
- Insert as pending review; never accept eligibility_status=approved from the client.
- Apply rate limits and duplicate-registration checks.
- Return only the new registration reference and pending status.

### 2. Admin eligibility review
`POST /functions/v1/abacus-registration-review`

Rules:
- Verify JWT, then verify an active staff role from `abacus.staff_roles`.
- Require a role appropriate to the action; a normal authenticated user is not an administrator.
- Record reviewer ID, timestamp, reason, and immutable audit event.
- Do not expose private KYC/consent artifacts through public URLs.

### 3. Start an online attempt
`POST /functions/v1/abacus-exam-start`

Request:
```json
{
  "registration_id": "uuid",
  "idempotency_key": "uuid"
}
```

Rules:
- Verify participant identity and approved registration.
- Confirm competition schedule and server time.
- Lock/transactionally create exactly one active attempt for the registration.
- Derive deadline and question set server-side.
- Deliver approved question payloads only; strip answer keys, scoring rules, reviewer notes and internal identifiers.
- Return attempt ID, server start/deadline timestamps, and sanitized questions.
- Reject starts outside the allowed schedule or for disqualified/withdrawn registrations.

### 4. Save response
`POST /functions/v1/abacus-exam-save`

Request:
```json
{
  "attempt_id": "uuid",
  "question_code": "opaque-public-code",
  "response": { "value": "participant-answer" },
  "response_version": 3
}
```

Rules:
- Verify participant owns the active attempt.
- Reject if server time is past deadline or attempt is not in progress.
- Resolve question code against the attempt's assigned question set.
- Use monotonic response versions to prevent stale offline retries overwriting newer answers.
- Persist server_saved_at; client_saved_at is informational only.
- Return acknowledged version and server timestamp.

### 5. Final submission
`POST /functions/v1/abacus-exam-submit`

Rules:
- Verify ownership and deadline using server time.
- Atomically transition in_progress to submitted; duplicate requests return the existing submission receipt.
- Freeze response rows and record submitted_at.
- A late submission follows the published competition rule; the client cannot override it.
- Never score in the browser.

### 6. Server-side scoring
Internal worker/function only:
- Read private answer keys.
- Validate attempt/question-set versions.
- Score with a versioned deterministic scoring rule.
- Store raw/final score and scoring version.
- Create an audit event.
- Require moderation/approval before publication.
- Do not expose answer keys, rationale, or hidden scoring internals in participant APIs.

### 7. Results and certificates
- Results API returns only published fields for the authenticated participant.
- Public verification uses a random, non-enumerable certificate verification code and minimal fields.
- Revoked/withheld results must not leak scores or participant private details.
- Certificate object storage remains private; download is authorized through a short-lived signed URL.

## Mandatory implementation and test gates
1. Validate schema constraints against the live Abacus project.
2. Add transaction-safe database routines for attempt creation, save, and submit.
3. Add Edge Functions with JWT verification, staff authorization and rate limits.
4. Add integration tests for cross-user IDOR, expired attempts, stale response versions, duplicate submits, answer-key leakage, and admin role escalation.
5. Add network interruption/reconnect E2E tests on mobile.
6. Add privacy/consent review and subject-matter review of the question bank.
7. Deploy only to the dedicated Cloudflare target after staging and security approval.

## Current connection status
The exact owner-confirmed project reference is `lqzdyegfhpinmoiyrtur`, URL `https://lqzdyegfhpinmoiyrtur.supabase.co`, region Mumbai (`ap-south-1`). The Supabase tool call currently fails with `link_id must identify an eligible linked account`; therefore no project details, schema, Auth settings, Storage buckets, secrets, or Edge Functions could be inspected or changed.

The next required operation is to restore the Supabase app account link, then verify this exact project ID before any mutation.

## Cloudflare status
No Cloudflare tool/connector is available in this session. Cloudflare remains the only deployment target; no deployment is claimed.

## Isolation and branch rules
- All work remains in `Vattams-admin/vattams-abacus-championship` on `feat/abacus-standalone-app`.
- No merge to `main`.
- No access to or changes in Academia's repository, Firebase, storage, Supabase projects, data, or secrets.
- Existing Supabase projects remain untouched.
