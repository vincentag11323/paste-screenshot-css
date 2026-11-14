// Real end-to-end QA: calls the actual Cent AI vision endpoint (src/vision.ts,
// compiled) against every real screenshot fixture, bypassing only the VS Code
// UI shell (clipboard read + editor insertion) — everything else is real.
// Run with: npm run qa   (needs .env filled in, builds first via `npm run compile`)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { callVisionApi } from '../out/src/vision.js';

const apiKey = process.env.LLM_API_KEY;
const baseUrl = process.env.LLM_BASE_URL ?? 'https://api.cent-ai.dev/v1';
if (!apiKey) {
  console.error('Set LLM_API_KEY first (copy .env.example to .env and fill it in).');
  process.exit(1);
}

const MODEL = 'claude-haiku-5.5';
const fixturesDir = new URL('../test/fixtures/real-screenshots/', import.meta.url);
const files = readdirSync(fixturesDir).filter((f) => f.endsWith('.png')).sort();

// Structural-sanity checks only (no ground-truth image comparison available in
// this script — that needs a human/vision pass, done separately and documented
// in requirements/PROMPT_REFINEMENT.md).
const PLACEHOLDER_PATTERNS = [/\btodo\b/i, /lorem ipsum/i, /\bfixme\b/i, /\[insert/i, /your text here/i];

function checkOutput(name, code) {
  const problems = [];
  if (code === 'NOT_A_UI_SCREENSHOT') {
    return { problems: [], skipped: true };
  }
  if (!code || code.trim().length === 0) {
    problems.push('empty output');
  }
  if (/^```/.test(code.trim()) || /```$/.test(code.trim())) {
    problems.push('leaked markdown code fence');
  }
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(code)) {
      problems.push(`placeholder text matched ${pattern}`);
    }
  }
  const hasTag = /<[a-zA-Z][^>]*>/.test(code);
  if (!hasTag) {
    problems.push('no HTML tag found — does not look like markup');
  }
  // Void/self-closing elements never have a closing tag; exclude them before
  // comparing open vs close counts, or every valid page with <meta>/<br>/
  // <input> trips a false "unbalanced" positive.
  const VOID_TAGS = /^(meta|link|br|hr|img|input|source|area|base|col|embed|param|track|wbr)$/i;
  const openTags = (code.match(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g) ?? []).filter((tag) => {
    const name = tag.match(/^<([a-zA-Z][a-zA-Z0-9]*)/)[1];
    return !VOID_TAGS.test(name) && !tag.endsWith('/>');
  }).length;
  const closeTags = (code.match(/<\/[a-zA-Z][^>]*>/g) ?? []).length;
  if (Math.abs(openTags - closeTags) > 2) {
    problems.push(`tag-balance mismatch: ~${openTags} open vs ${closeTags} close`);
  }
  return { problems, skipped: false };
}

const results = [];
for (const file of files) {
  const imageBase64 = readFileSync(new URL(file, fixturesDir)).toString('base64');
  console.log(`\n=== ${file} ===`);
  const start = Date.now();
  try {
    const code = await callVisionApi({ apiKey, baseUrl, model: MODEL, flavor: 'css', imageBase64 });
    const elapsed = Date.now() - start;
    const { problems, skipped } = checkOutput(file, code);
    console.log(`${elapsed}ms, ${code.length} chars${skipped ? ' (model said NOT_A_UI_SCREENSHOT)' : ''}`);
    console.log(code.slice(0, 500));
    if (problems.length) {
      console.log('PROBLEMS:', problems.join('; '));
    } else {
      console.log('OK — no structural problems found.');
    }
    writeFileSync(new URL(`../.qa-output-${file}.html`, import.meta.url), code);
    results.push({ file, elapsed, chars: code.length, problems });
  } catch (err) {
    console.log('ERROR:', err.message);
    results.push({ file, error: err.message });
  }
}

console.log('\n=== SUMMARY ===');
let failed = 0;
for (const r of results) {
  if (r.error || (r.problems && r.problems.length)) {
    failed++;
    console.log(`FAIL ${r.file}: ${r.error ?? r.problems.join('; ')}`);
  } else {
    console.log(`PASS ${r.file} (${r.elapsed}ms, ${r.chars} chars)`);
  }
}
console.log(`${results.length - failed}/${results.length} fixtures passed structural checks.`);
process.exit(failed > 0 ? 1 : 0);
