// Demo-video generator: reuses qaFullFlow.mjs's real-pipeline approach (same
// callVisionApi import, same fixtures dir) for 3 fixtures x 2 flavors, then
// renders each result in headless Chrome and builds an original|AI-rendered
// comparison PNG. No VS Code/Electron is ever launched — see requirements/DEMO.md.
// Run with: node --env-file=.env scripts/demoGen.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { callVisionApi } from '../out/src/vision.js';

const execFileAsync = promisify(execFile);
const apiKey = process.env.LLM_API_KEY;
const baseUrl = process.env.LLM_BASE_URL ?? 'https://api.cent-ai.dev/v1';
if (!apiKey) {
  console.error('Set LLM_API_KEY first (copy .env.example to .env and fill it in).');
  process.exit(1);
}
const MODEL = 'claude-haiku-5.5';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const fixturesDir = new URL('../test/fixtures/real-screenshots/', import.meta.url);
const outDir = new URL('../requirements/demo/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const CASES = ['real-01.png', 'real-03.png', 'real-05-shot.png'];
const FLAVORS = ['css', 'tailwind'];

function wrapHtml(code, flavor) {
  const head = flavor === 'tailwind' ? '<script src="https://cdn.tailwindcss.com"></script>' : '';
  return `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>${code}</body></html>`;
}

async function renderPng(htmlPath, pngPath, width, height) {
  await execFileAsync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
}

async function sideBySide(origPath, renderedPath, outPath) {
  // Scale both to the same height (720), then hstack — plain ffmpeg, no new npm dep.
  await execFileAsync('ffmpeg', [
    '-y', '-i', origPath, '-i', renderedPath,
    '-filter_complex', '[0:v]scale=-1:720[a];[1:v]scale=-1:720[b];[a][b]hstack=inputs=2',
    outPath,
  ]);
}

const comparisons = [];
for (const file of CASES) {
  const imageBase64 = readFileSync(new URL(file, fixturesDir)).toString('base64');
  for (const flavor of FLAVORS) {
    const label = `${file.replace('.png', '')}-${flavor}`;
    console.log(`\n=== ${label} ===`);
    const start = Date.now();
    const code = await callVisionApi({ apiKey, baseUrl, model: MODEL, flavor, imageBase64 });
    console.log(`${Date.now() - start}ms, ${code.length} chars`);
    if (code === 'NOT_A_UI_SCREENSHOT') {
      console.log('SKIPPED: model said NOT_A_UI_SCREENSHOT');
      continue;
    }
    const htmlPath = new URL(`${label}.html`, outDir);
    writeFileSync(htmlPath, wrapHtml(code, flavor));
    const renderedPath = new URL(`${label}-rendered.png`, outDir).pathname;
    await renderPng(htmlPath.pathname, renderedPath, 1280, 900);
    const comparePath = new URL(`${label}-compare.png`, outDir).pathname;
    await sideBySide(new URL(file, fixturesDir).pathname, renderedPath, comparePath);
    console.log(`rendered + compare written: ${comparePath}`);
    comparisons.push(comparePath);
  }
}
writeFileSync(new URL('comparisons.json', outDir), JSON.stringify(comparisons, null, 2));
console.log(`\nDone. ${comparisons.length} comparison images.`);
