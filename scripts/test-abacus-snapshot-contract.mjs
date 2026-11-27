import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const snapshots = read("../supabase/migrations/20261118200000_immutable_attempt_question_snapshots.sql");
const config = read("../supabase/migrations/20261118150000_competition_configuration_and_admin_review.sql");
const registration = read("../supabase/functions/abacus-registration-intent/index.ts");
const guardian = read("../supabase/functions/abacus-guardian-consent/index.ts");

const start = snapshots.slice(snapshots.indexOf("create or replace function abacus.exam_start_or_resume"), snapshots.indexOf("create or replace function abacus.exam_save_response"));
const save = snapshots.slice(snapshots.indexOf("create or replace function abacus.exam_save_response"), snapshots.indexOf("create or replace function abacus.exam_submit_and_score"));
const submit = snapshots.slice(snapshots.indexOf("create or replace function abacus.exam_submit_and_score"), snapshots.indexOf("revoke all on function abacus.exam_start_or_resume"));

assert.match(start, /v_count\s*<>\s*v_group\.question_count/, "resume must reject partial or oversized snapshots");
assert.match(start, /from abacus\.attempt_questions aq[\s\S]*where aq\.attempt_id=v_attempt\.id/, "resume must return the immutable attempt question set");
assert.match(save, /from abacus\.attempt_questions[\s\S]*where attempt_id=p_attempt_id and question_id=p_question_id/, "save must validate membership against the immutable snapshot");
assert.match(submit, /from abacus\.attempt_questions aq[\s\S]*where aq\.attempt_id=v_attempt\.id/, "scoring must use immutable snapshot rows");
assert.match(submit, /v_total\s*<>\s*v_group\.question_count/, "scoring must require the complete frozen question count");
assert.match(submit, /aq\.correct_answer/, "scoring must use the snapshotted private answer");
assert.doesNotMatch(submit, /from abacus\.question_bank/, "scoring must not read mutable question-bank rows");
assert.match(config, /Age-group bands, question counts and durations are frozen after an exam attempt exists/, "admin config must freeze age-band contract after attempts exist");

for (const [label, source] of [["registration", registration], ["guardian consent", guardian]]) {
  assert.match(source, /ABACUS_ALLOWED_ORIGINS/, label + " must use explicit origin allowlist");
  assert.doesNotMatch(source, /Access-Control-Allow-Origin": "\*"/, label + " must not allow wildcard origins");
  assert.match(source, /allowedOrigins\.includes\(origin\)/, label + " must reject unconfigured origins");
}

console.log("ABACUS SNAPSHOT / CORS CONTRACT CHECKS PASSED");
