# Abacus International Challenge — question bank status

**Current status: Draft content; not approved for official use.**

## Bank inventory
- Practice bank: 120 items (30 per age band).
- Official-paper source bank: 120 items (30 per age band).
- Private practice answer-key source: 120 entries.
- Age bands: `up_to_8`, `age_9_12`, `age_13_15`, `age_16_plus`.
- Question IDs are unique. Practice prompts and official prompts are distinct.
- Coverage includes addition, subtraction, sequential mixed operations, multiplication and exact division across the four age bands.
- Each item has four distinct answer choices, a keyed answer, an arithmetic rationale, marks, a time allowance, language, skill/topic metadata and a review status.

## Validation
Run:
```sh
npm run abacus:bank:structure
npm run abacus:bank:validate
npm run abacus:release:preflight -- --course-id <actual-approved-course-id>
```

The structure command checks counts, ID uniqueness, age-pool membership, four-choice integrity, arithmetic-answer agreement and separation between practice and official prompts. The strict command additionally blocks promotion until every item has the required `reviewed` status.

The release preflight is intentionally read-only and conservative: it checks bank counts, unique IDs, key matching, review statuses, age-band counts/pools and selection blueprints. It always reports external gates that a local script cannot verify (real Firestore catalogue record, private Storage registry/bundles, eligibility cache, event operations and deployed E2E evidence). A supplied course ID is an input, not proof that Firestore contains it. It never uploads or deploys.

The runtime packager also rechecks that the private practice answer-key IDs/count and keyed values exactly match the practice bank, every age pool contains exactly 30 unique IDs from its own age band, no official prompt is reused from practice, and each official age-band paper contains exactly 30 unique IDs. It emits the four `official_papers` arrays expected by the existing official-attempt Edge Function.

## Review gate
All generated items currently use `review_status: "pending_review"`. Structural arithmetic checks are not a substitute for independent subject-matter review. A qualified abacus/mathematics reviewer must:
1. Verify every question and answer independently.
2. Check level appropriateness, soroban/Anzan relevance, distractor quality, wording and accessibility.
3. Review time allowances and equal difficulty across age-band papers.
4. Sign off the item set and record reviewer identity, date and version.
5. Replace the pending status only after review is completed and add source/version evidence.

Do not run the production packager, upload these banks as official runtime assets, open official registration, or advertise a certified/internationally accredited event while this gate is open.

## Important architecture dependency
The existing official competition Edge Functions require a real course ID present in the published Firestore course catalogue, a corresponding entry in the private Supabase Storage `competitions/registry.json`, active eligibility rows in `competition_access_cache`, and runtime question/answer bundles in the existing `academia-course-materials` bucket. No course ID or live storage registry entry has been invented here. Firestore remains read-only under the current project permissions.

## Next production gates
- [ ] Independent item review and approval.
- [ ] Confirm/create the competition course in the authorised catalogue workflow and record its real course ID.
- [ ] Package with `scripts/package-competition-runtime.mjs`; confirm registry contains all four 30-question `official_papers`.
- [ ] Publish private question/answer bundles and registry to the existing Supabase Storage bucket through the approved release workflow.
- [ ] Refresh/verify eligible access-cache rows through the existing approved enrolment-sync workflow.
- [ ] Add event windows, rules, attempt policy, results/leaderboard and certificate verification.
- [ ] Run browser tests and the existing security-boundary E2E tests; verify deployed URL and logs before declaring production-ready.
