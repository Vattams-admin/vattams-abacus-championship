# Module 61 — Student Online Exam Room

**Date:** 2026-11-18  
**Repository:** Vattams-admin/vattams-abacus-championship  
**Branch:** feat/abacus-standalone-app  
**Supabase project boundary:** lqzdyegfhpinmojyrtur only  
**Deployment target:** Cloudflare Pages only

## Goal

Add the participant-facing exam room that consumes the Module 60 server-authoritative exam API. The UI is for a real scheduled online competition, not a mock quiz. It does not generate questions, grant eligibility, set deadlines, or calculate scores in the browser.

## Source changes

- Added an Exam room navigation entry.
- Added `StudentExamRoom` in `src/App.tsx`.
- Added responsive timer, connection status, question cards and answer controls in `src/styles.css`.
- Uses the existing Supabase browser client with only the publishable key.
- Calls the `abacus-exam-engine` Edge Function actions: `start_or_resume`, `save_response`, and `submit`.

## Participant flow

1. Participant signs in through the existing verified-email sign-in flow.
2. Participant enters the competition UUID from the official invitation.
3. Server checks approved and confirmed registration, guardian consent, eligibility, live competition status, attempt limit, approved question count and complete answer-key coverage.
4. Server starts or resumes the same active attempt and returns question payloads without answer keys.
5. The UI displays the server deadline and calculates a local display countdown using the server timestamp offset.
6. Answer changes are versioned and placed into a local pending queue. While online, pending responses are sent to the server automatically and can also be saved manually.
7. If the network drops, the connection state changes and local pending responses remain queued. When connectivity returns, the autosave effect retries the pending queue.
8. Participant confirms final submission. The UI flushes pending responses before calling server submission. The browser never computes the score.

## Important implementation details

- The UI never calls database tables directly for exam content or answer keys.
- Participant UUID is derived by the Edge Function from the verified Supabase session, not from browser input.
- Local storage contains only that participant's pending response payloads and version numbers, keyed by attempt ID. It contains no answer keys or scoring rules.
- The timer is a display aid; the database deadline is authoritative.
- A server acknowledgement is required before a response is considered saved remotely.
- Results remain withheld pending moderation.
- The competition UUID field is an interim access mechanism until an official participant dashboard lists only competitions for which the signed-in user has an approved entry.

## Known limitations and release gates

- The current question renderer displays the delivered question JSON as readable text. A content-schema-specific renderer (including diagrams, multi-part arithmetic, image/audio questions if officially required, and accessible Soroban input) remains future work.
- The answer input is currently a text response field. It must be adapted to the approved question/answer schema and validated against real approved sample fixtures before competition use.
- Offline responses remain on the device until server acknowledgement. Browser storage can be cleared by the user/device; participants must be instructed not to clear browser data during an attempt. A service worker/background sync strategy is not implemented here.
- The UI disables manual submission after its locally displayed deadline; the database independently rejects or expires late actions. Final expiry behavior and partial-answer scoring must be verified with tests.
- Competition invitation/UUID discovery, explicit exam instructions, accessibility audit, keyboard/screen-reader test, mobile browser test, and device/network interruption E2E tests remain required.
- No production data or participant fixtures were created.

## Verification status on 2026-11-18

- GitHub source writes were made on `feat/abacus-standalone-app`; `main` was not changed.
- Supabase access to the exact permitted project `lqzdyegfhpinmojyrtur` continues to return `MCP error -32600: You do not have permission to perform this action`. No other project was accessed. No migrations or functions were deployed.
- No Cloudflare tools were available in this session. No Pages project, secrets, DNS, or deployment was changed.
- No local install, TypeScript build, browser, accessibility, or authenticated end-to-end test was run. The exam room source is not verified production-ready.

## Next steps

1. Restore Supabase tool access to the one permitted project and deploy Modules 57, 58 and 60 in order.
2. Confirm the deployed Edge Function and database contract with real test accounts and non-production fixtures.
3. Define and implement the official question rendering/answer schema.
4. Add a participant dashboard that discovers approved competition entries without exposing other registrations.
5. Add robust offline queue recovery, retry limits and explicit server-saved indicators.
6. Run mobile, accessibility, concurrency, security and full exam E2E tests.
7. Deploy the verified branch build to Cloudflare Pages only.
