import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = path.join(root, 'content/review-required/objective');
const structureOnly = process.argv.includes('--structure-only');
const bands = ['up_to_8', 'age_9_12', 'age_13_15', 'age_16_plus'];
const read = (name) => JSON.parse(fs.readFileSync(path.join(base, name), 'utf8'));
const inputs = [
  'questions.objective.source-with-answers.json',
  'answer-key.objective.private.json',
  'official.objective.json',
  'age-pools.json',
  'selection-blueprint.json',
];
const missing = inputs.filter((name) => !fs.existsSync(path.join(base, name)));
if (missing.length) {
  console.error('ABACUS BANK VALIDATION BLOCKED: supply the private review files locally.');
  console.error('Missing files: ' + missing.join(', '));
  process.exit(1);
}
const mock = read(inputs[0]);
const answerKey = read('answer-key.objective.private.json');
const official = read('official.objective.json');
const pools = read('age-pools.json');
const blueprint = read('selection-blueprint.json');
const errors = [];
const requireCheck = (condition, message) => { if (!condition) errors.push(message); };

function calculatePrompt(prompt) {
  const match = /^Calculate: ([0-9]+(?:\s[+−×÷]\s[0-9]+)+) = \?$/.exec(prompt);
  if (!match) return null;
  const tokens = match[1].split(/\s+/);
  let total = Number(tokens[0]);
  for (let i = 1; i < tokens.length; i += 2) {
    const value = Number(tokens[i + 1]);
    if (!Number.isFinite(value)) return null;
    total = tokens[i] === '+' ? total + value : tokens[i] === '−' ? total - value : tokens[i] === '×' ? total * value : total / value;
  }
  return String(total);
}

function validateBank(bank, label, expectedPrefix) {
  requireCheck(Array.isArray(bank), label + ' must be an array');
  requireCheck(bank.length === 120, label + ' must contain 120 items (30 per age band)');
  const ids = new Set();
  const prompts = new Set();
  const byBand = Object.fromEntries(bands.map((band) => [band, 0]));
  for (const [index, q] of bank.entries()) {
    const where = label + '[' + index + ']';
    requireCheck(typeof q.question_id === 'string' && q.question_id.startsWith(expectedPrefix), where + ': invalid question ID');
    requireCheck(!ids.has(q.question_id), where + ': duplicate question ID ' + q.question_id);
    ids.add(q.question_id);
    requireCheck(typeof q.question === 'string' && !prompts.has(q.question), where + ': duplicate or missing prompt');
    prompts.add(q.question);
    requireCheck(bands.includes(q.age_band), where + ': unknown age band');
    if (byBand[q.age_band] !== undefined) byBand[q.age_band]++;
    requireCheck(Array.isArray(q.options) && q.options.length === 4 && q.options.every((x) => typeof x === 'string' && x.trim()) && new Set(q.options).size === 4, where + ': options must be four unique non-empty strings');
    requireCheck(Number.isInteger(q.correct_option_index) && q.correct_option_index >= 0 && q.correct_option_index < 4, where + ': invalid correct option index');
    requireCheck(typeof q.answer === 'string' && q.options[q.correct_option_index] === q.answer, where + ': answer does not match the keyed option');
    requireCheck(calculatePrompt(q.question) === q.answer, where + ': arithmetic expression does not match the answer');
    requireCheck(typeof q.explanation === 'string' && q.explanation.trim().length >= 12, where + ': missing rationale');
    requireCheck(Number.isFinite(q.time_seconds) && q.time_seconds > 0, where + ': invalid time allowance');
    requireCheck(q.review_status === 'pending_review' || q.review_status === 'reviewed', where + ': invalid review status');
  }
  for (const band of bands) requireCheck(byBand[band] === 30, label + ': expected 30 items for ' + band + ', found ' + byBand[band]);
  return { ids, byBand, prompts };
}

const mockCheck = validateBank(mock, 'practice bank', 'ABACUS-INTL-MOCK-');
const officialCheck = validateBank(official, 'official bank', 'ABACUS-INTL-OFF-');
validateBank(answerKey, 'private answer-key source', 'ABACUS-INTL-MOCK-');

const mockPrompts = new Set(mock.map((q) => q.question));
const officialPrompts = new Set(official.map((q) => q.question));
for (const prompt of mockPrompts) requireCheck(!officialPrompts.has(prompt), 'practice prompt is reused in official paper');
for (const band of bands) {
  for (const topic of ['Addition', 'Subtraction', 'Mixed operations', 'Multiplication', 'Division']) {
    const count = official.filter((q) => q.age_band === band && q.topic === topic).length;
    requireCheck(count >= 3, 'official paper ' + band + ' needs at least 3 questions for ' + topic + '; found ' + count);
  }
}

for (const id of mockCheck.ids) requireCheck(!officialCheck.ids.has(id), 'mock/official ID collision: ' + id);
for (const q of mock) {
  const key = answerKey.find((entry) => entry.question_id === q.question_id);
  requireCheck(!!key, 'missing private answer key for ' + q.question_id);
  if (key) {
    requireCheck(key.answer === q.answer, 'private answer key mismatch for ' + q.question_id);
    requireCheck(key.correct_option_index === q.correct_option_index, 'private correct-option mismatch for ' + q.question_id);
  }
}
for (const band of bands) {
  const pool = pools?.[band]?.mixed;
  requireCheck(Array.isArray(pool) && pool.length === 30 && new Set(pool).size === 30, 'age pool must have 30 unique mock IDs for ' + band);
  if (Array.isArray(pool)) for (const id of pool) requireCheck(mockCheck.ids.has(id) && mock.find((q) => q.question_id === id)?.age_band === band, 'age pool contains wrong/missing question ' + id);
  const paper = blueprint?.[band];
  requireCheck(Array.isArray(paper) && paper.length === 1 && paper[0]?.[0] === 'mixed' && paper[0]?.[1] === 30, 'official blueprint must select exactly 30 questions for ' + band);
  const officialForBand = official.filter((q) => q.age_band === band);
  requireCheck(officialForBand.length === 30, 'official paper must have 30 items for ' + band);
}

const pending = [...mock, ...official].filter((q) => q.review_status !== 'reviewed').length;
if (!structureOnly) requireCheck(pending === 0, pending + ' questions still require independent subject-matter review; do not package or publish official competition content');

if (errors.length) {
  console.error('ABACUS BANK VALIDATION FAILED');
  for (const error of errors) console.error(' - ' + error);
  process.exitCode = 1;
} else {
  console.log('ABACUS BANK STRUCTURE VALID');
  console.log('Practice items: ' + mock.length + '; official items: ' + official.length + '; age bands: ' + bands.length);
  if (pending) {
    console.error('PROMOTION BLOCKED: ' + pending + ' practice/official items are marked pending_review. Independent maths/content review is required before packaging.');
    if (!structureOnly) process.exitCode = 1;
  } else {
    console.log('Review gate passed.');
  }
}
