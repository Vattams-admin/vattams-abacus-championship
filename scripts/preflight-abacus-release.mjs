import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const base = path.join(root, "content/review-required/objective");
const bands = ["up_to_8", "age_9_12", "age_13_15", "age_16_plus"];
const read = (name) => JSON.parse(fs.readFileSync(path.join(base, name), "utf8"));
const checks = [];
const blockers = [];
const addCheck = (label, passed, detail) => {
  checks.push({ label, passed, detail });
  if (!passed) blockers.push(label + ": " + detail);
};

let mock, keys, official, pools, blueprint;
try {
  mock = read("questions.objective.source-with-answers.json");
  keys = read("answer-key.objective.private.json");
  official = read("official.objective.json");
  pools = read("age-pools.json");
  blueprint = read("selection-blueprint.json");
} catch (error) {
  console.error("ABACUS RELEASE PREFLIGHT: BLOCKED");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

addCheck("Practice bank inventory", Array.isArray(mock) && mock.length === 120, `expected 120; found ${Array.isArray(mock) ? mock.length : "invalid"}`);
addCheck("Private practice key inventory", Array.isArray(keys) && keys.length === 120, `expected 120; found ${Array.isArray(keys) ? keys.length : "invalid"}`);
addCheck("Official draft inventory", Array.isArray(official) && official.length === 120, `expected 120; found ${Array.isArray(official) ? official.length : "invalid"}`);

const validateIds = (bank, label) => {
  if (!Array.isArray(bank)) return false;
  const ids = bank.map((q) => q?.question_id);
  const unique = ids.every((id) => typeof id === "string" && id.trim()) && new Set(ids).size === ids.length;
  addCheck(label + " unique IDs", unique, unique ? `${ids.length} unique IDs` : "missing or duplicate question IDs");
  return unique;
};
validateIds(mock, "Practice bank");
validateIds(keys, "Private practice keys");
validateIds(official, "Official draft bank");

const keyById = new Map((Array.isArray(keys) ? keys : []).map((q) => [q.question_id, q]));
const keyMatches = Array.isArray(mock) && mock.every((q) => {
  const key = keyById.get(q.question_id);
  return key && key.answer === q.answer && key.correct_option_index === q.correct_option_index;
}) && keyById.size === (Array.isArray(mock) ? mock.length : -1);
addCheck("Practice/private key consistency", keyMatches, "private keys must match practice IDs, answers, and correct-option indexes exactly");

const reviewed = [...(Array.isArray(mock) ? mock : []), ...(Array.isArray(official) ? official : [])]
  .every((q) => q?.review_status === "reviewed");
addCheck("Independent content review", reviewed, "every practice and official question must be marked reviewed only after documented independent review");

const practicePrompts = new Set((Array.isArray(mock) ? mock : []).map((q) => q.question));
addCheck("Practice/official separation", Array.isArray(official) && official.every((q) => !practicePrompts.has(q.question)), "official paper must not reuse a practice prompt");

for (const band of bands) {
  const practice = (Array.isArray(mock) ? mock : []).filter((q) => q.age_band === band);
  const paper = (Array.isArray(official) ? official : []).filter((q) => q.age_band === band);
  addCheck(`Practice count ${band}`, practice.length === 30, `expected 30; found ${practice.length}`);
  addCheck(`Official count ${band}`, paper.length === 30 && new Set(paper.map((q) => q.question_id)).size === 30, `expected 30 unique questions; found ${paper.length}`);
  const pool = pools?.[band]?.mixed;
  const poolValid = Array.isArray(pool) && pool.length === 30 && new Set(pool).size === 30 &&
    pool.every((id) => practice.some((q) => q.question_id === id));
  addCheck(`Age pool ${band}`, poolValid, "pool must contain exactly 30 unique practice IDs from its own band");
  const selection = blueprint?.[band];
  addCheck(`Selection blueprint ${band}`, Array.isArray(selection) && selection.length === 1 && selection[0]?.[0] === "mixed" && selection[0]?.[1] === 30,
    "must explicitly select 30 questions from the mixed pool");
}

blockers.push("Dedicated backend: reconcile Abacus migrations and verify live registration, guardian, exam and admin Edge Functions.");
blockers.push("Content confidentiality: replace any official draft previously tracked in public Git and confirm independent review.");
blockers.push("Private runtime publication: verify the existing Supabase Storage registry and both private bundles through the approved release workflow.");
blockers.push("Operational launch: event rules/windows, registration, result handling, certificate verification, privacy and support procedures require release sign-off.");
blockers.push("Execution evidence: run browser/E2E and security-boundary tests, then verify the deployed URL and runtime logs.");

console.log("ABACUS INTERNATIONAL CHALLENGE — RELEASE PREFLIGHT");
for (const check of checks) console.log(`${check.passed ? "PASS" : "BLOCK"} | ${check.label} | ${check.detail}`);
console.log("");
console.log(`Automated checks passed: ${checks.filter((c) => c.passed).length}/${checks.length}`);
console.log("External production gates: " + blockers.length);
console.error("RELEASE STATUS: BLOCKED");
for (const blocker of blockers) console.error(" - " + blocker);
process.exitCode = 1;
