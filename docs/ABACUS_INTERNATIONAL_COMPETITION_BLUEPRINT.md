# VATTAMS Academia Abacus International Challenge
## Competition blueprint and release policy

**Status:** Draft specification for expert review. This is not an accreditation claim, published event announcement, or final competition rulebook.

## 1. Purpose
Provide a fair, accessible, age-aware competition for abacus and mental arithmetic learners. Evaluate accuracy and calculation fluency without treating speed as a substitute for mathematical correctness.

## 2. Divisions
Suggested age divisions (to be confirmed in the official event rules):
- Foundation: under 7
- Junior: 7–9
- Intermediate: 10–12
- Senior: 13–15
- Open: 16+

Age is calculated on a clearly published cut-off date. A learner's challenge level is based on a reviewed diagnostic or published syllabus, not age alone. Guardian consent and appropriate privacy protections are required for minors.

## 3. Eight-level learning and competition progression
| Level | Focus | Expected skills | Example operation families |
|---|---|---|---|
| 1 | Bead and number foundations | Place value, bead values, single-digit sums | Single-digit addition/subtraction |
| 2 | Supported calculation | Complements and regrouping | Two-digit sums and differences |
| 3 | Fluent arithmetic | Carrying/borrowing with two-digit values | Two-digit mixed addition/subtraction |
| 4 | Multi-step operations | Maintain place-value alignment | Three-digit mixed expressions |
| 5 | Speed and precision | Reliable multi-step computation | Three-digit sums/differences |
| 6 | Visualisation | Mental representation and regrouping | Mixed operations with larger values |
| 7 | Anzan development | Sustained mental calculation | Longer multi-step expressions |
| 8 | Mastery | Complex arithmetic under fair time constraints | Larger multi-step expressions |

These are a product design progression, not an assertion that all external abacus organisations use this exact level system.

## 4. Proposed event format (must be approved before registration opens)
1. **Warm-up:** unscored familiarisation; no effect on rank.
2. **Qualification:** balanced, level-matched question set.
3. **Final round:** fresh question set with equivalent difficulty and predeclared duration.
4. **Review window:** operational checks, suspected technical incidents, and appeals.
5. **Publication:** release only after the authorised event owner finalises results.

Exact question count, time limits, permitted tools, device rules, and whether physical abacus use is permitted must be declared for each division before entries open. The five-question web demo is not the official event format.

## 5. Scoring policy proposal
- Correct answer: award the published item value.
- Incorrect answer: zero by default; no negative marking unless announced before the event.
- Omitted answer: zero.
- Primary ranking: total points.
- Tie-break: first compare correct answers in a separately declared accuracy tier; if still tied, use a pre-announced tie-break round or publish a joint rank. Do not use client-reported timestamps as a tie-break.
- Invalidated items: apply a documented, consistent remedy to every affected participant.
- Official results are calculated on the server from a versioned question set and immutable submitted responses.

The exact points, weighting, duration, tie-break sequence, and accommodation policy require owner approval and publication before a live event.

## 6. Question-bank schema
Every item must have:
- Stable unique ID and immutable version.
- Level, division eligibility, skill tag, operation family, difficulty, and expected solve-time band.
- Exact question prompt, numeric answer type, answer key, rationale, and independent reviewer status.
- Locale/language and accessible rendering metadata.
- Provenance, author/reviewer, last-reviewed date, and duplicate/ambiguity audit status.

Question content and answer keys must be separate release artifacts. The browser must never receive private official answer keys or scoring secrets before submission. The current prototype contains only illustrative practice items and answer choices; it is not an official question bank.

## 7. Production architecture
- **Identity:** reuse VATTAMS Academia Firebase Authentication.
- **Application records:** use the established Firestore source of truth and existing approved access patterns.
- **Course/competition learning files:** keep existing material storage on Supabase Storage; do not introduce Supabase Auth or migrate existing files.
- **Attempt API:** create attempt on the server, bind it to an eligible participant and a versioned question-set, enforce the start/deadline on the server, validate idempotent submission, score on the server, and record a tamper-evident audit trail.
- **Question delivery:** send only the active question payload needed by the client; do not send the full official answer bank.
- **Leaderboard:** derive from finalised server-side results; disclose provisional/final status and last-updated time.
- **Certificates:** issue only after result finalisation; unique verification IDs resolve to a minimal public verification page and must not expose private student data.
- **Operations:** rate limits, abuse monitoring, reconnect policy, accessibility accommodations, backups, incident handling, support contact and appeal window.

## 8. Privacy, safeguarding, and fair access
Before collecting real registrations, publish privacy notice, retention/deletion policy, guardian consent workflow for minors, accessibility/accommodation procedure, photo/video consent separately from participation, permitted-device policy, technical incident policy, and a support contact. Collect only necessary information. Never publish a child's full date of birth, email, school/classroom identifiers, or contact details on a leaderboard.

## 9. Release gates
A release is not production-ready until all applicable gates pass:
- [ ] Official rules approved and publicly available.
- [ ] Question bank coverage and independent mathematics review completed.
- [ ] No answer-key leakage from production client assets, source maps, or network responses.
- [ ] Authentication, eligibility, enrolment, attempt limits, deadline enforcement, scoring and result permissions tested.
- [ ] Duplicate submission, replay, refresh, disconnect/reconnect, timeout, and concurrent attempts tested.
- [ ] Cross-device and mobile browser QA; keyboard/screen-reader and contrast checks.
- [ ] Privacy and minor-safeguarding review completed.
- [ ] Leaderboard/certificate verification and appeals process tested.
- [ ] Production deployment URL, build identity, monitoring and rollback path verified.
- [ ] End-to-end evidence reviewed and all release blockers closed.

## 10. Current implementation truth
The current branch adds a standalone static page at `public/abacus-competition/index.html` and this blueprint. The page has a browser-only five-question practice round for each of eight levels. It does not persist registration, authenticate users, submit official attempts, or publish real rankings. It must not be advertised as a live or accredited international competition until the production gates above are implemented and verified.
