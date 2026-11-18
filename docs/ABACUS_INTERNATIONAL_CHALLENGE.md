# VATTAMS Academia — Abacus International Challenge

## Prototype route
The standalone static experience is served by Vite from:
- `/abacus-competition/` (after the repository is deployed)

Source: `public/abacus-competition/index.html`

## Included in this first implementation
- Responsive, premium navy-and-gold competition landing experience.
- Eight progressive levels, from soroban foundations through visualisation and Anzan.
- Participant profile fields for local practice (name, age band, self-selected level).
- Five-question interactive practice round per level, randomized answer ordering, timer, feedback, score summary, and answer review.
- Clearly labelled sample leaderboard and explicit demo/non-official result notices.
- Accessible labels, keyboard-operable controls, mobile layouts, and no third-party scripts.

## Important current limitations
This is a **browser-only prototype**, not yet an official live competition platform. It does not transmit or persist participant data, authenticate students, issue official results, or create real registrations. The sample leaderboard is illustrative only.

## Production integration checklist
1. Integrate with the existing VATTAMS Academia Firebase Authentication / Firestore application; do not introduce Supabase Auth.
2. Store course/competition learning files in the existing Supabase Storage bucket when needed; do not migrate existing materials.
3. Implement a server-authoritative competition attempt API/function: participant eligibility, attempt creation, start/end timestamps, randomized signed question set, idempotent submission, server-side answer scoring, rate limits, and audit trail.
4. Publish reviewed question banks and answer keys with stable IDs, difficulty metadata, curriculum mapping, language metadata, and versioning. Never ship private answer keys in the public client bundle.
5. Add guardian consent and data-minimization controls for minors, privacy/retention disclosures, accessible accommodation policy, anti-cheating rules, dispute process, and published tie-break rules.
6. Add real registration/enrolment, admin event configuration, divisions, capacity, dates/time zones, payments only if explicitly enabled, certificates with unique verification IDs, and a server-derived leaderboard.
7. Add automated unit, accessibility, mobile, security-boundary and production smoke tests. Verify the live URL and backend behaviour before declaring production readiness.

## Suggested competition rules to publish before launch
- Eligibility and age cut-off date.
- Level placement and permitted tools/materials.
- Question count, round duration, scoring and negative-marking policy (if any).
- Tie-break ordering, late arrival/reconnection policy, appeal window and result-finalisation process.
- Certificate eligibility and exact issuer identity. Do not claim external accreditation without written authorization.

## Release principle
Keep this work on `feat/abacus-international-competition` until reviewed. Do not merge into `main` without explicit authorization. Avoid GitHub Actions workflows unless the owner confirms quota availability; use local checks and deployment evidence where possible.
