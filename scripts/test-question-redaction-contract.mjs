import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(
  new URL("../supabase/migrations/20261118180000_participant_dashboard_and_question_redaction.sql", import.meta.url),
  "utf8",
);
const match = sql.match(/v_sensitive constant text\[\] := array\[([\s\S]*?)\];/);
assert.ok(match, "redaction migration must declare a sensitive-key denylist");
const normalizedKeys = new Set([...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]));
for (const key of [
  "correctanswer", "correct_answer", "answerkey", "answer_key",
  "acceptedanswer", "expectedanswer", "solutiontext", "rationaletext",
  "explanationtext", "correctanswerindex", "correctoptionindex",
  "iscorrect", "iscorrectanswer", "privatenotes", "reviewstatus",
]) {
  assert.ok(normalizedKeys.has(key), `missing redaction alias: ${key}`);
}
assert.match(sql, /jsonb_each\(p_value\)/, "redaction must recurse through JSON objects");
assert.match(sql, /jsonb_array_elements\(p_value\)/, "redaction must recurse through JSON arrays");
assert.match(sql, /grant execute on function abacus\.public_question_payload\(jsonb\) to service_role/i);
console.log("Question redaction contract checks passed.");
