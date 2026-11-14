// Compares candidate Cent AI vision models on one real screenshot.
// Run with: npm run smoke-test   (needs .env filled in, see .env.example)
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const apiKey = process.env.LLM_API_KEY;
const baseUrl = process.env.LLM_BASE_URL ?? 'https://api.cent-ai.dev/v1';
if (!apiKey) {
  console.error('Set LLM_API_KEY first (copy .env.example to .env and fill it in).');
  process.exit(1);
}

const imagePath = process.argv[2] ?? new URL('../test/fixtures/sample.png', import.meta.url);
const imageBase64 = readFileSync(imagePath).toString('base64');

const candidates = (process.argv[3] ?? 'claude-haiku-5.5,claude-sonnet-4-6,claude-fable-5.1').split(',');
const maxTokens = 2200;

const SYSTEM_PROMPT = `You convert UI screenshots into code. Reproduce the screenshot as a single
self-contained HTML snippet with an inline <style> block (plain CSS, not Tailwind).
Infer spacing, colors, and font sizes as best you can. Use semantic HTML tags.
Output ONLY the code — no prose, no explanation, no markdown code fences.
If the image clearly isn't a UI screenshot (e.g. a photo), respond with exactly:
NOT_A_UI_SCREENSHOT`;

for (const model of candidates) {
  const start = performance.now();
  try {
    const res = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
              { type: 'text', text: 'Reproduce this UI as HTML + inline CSS.' },
            ],
          },
        ],
      }),
    });
    const elapsedMs = performance.now() - start;
    const json = await res.json();

    if (!res.ok) {
      console.log(`\n=== ${model} === FAILED (HTTP ${res.status}) in ${elapsedMs.toFixed(0)}ms`);
      console.log(JSON.stringify(json).slice(0, 400));
      continue;
    }

    const text = (json.content ?? []).map((b) => b.text ?? '').join('');
    const usage = json.usage ?? {};
    const truncated = usage.output_tokens >= maxTokens;
    console.log(`\n=== ${model} === ${elapsedMs.toFixed(0)}ms | input_tokens=${usage.input_tokens} output_tokens=${usage.output_tokens}${truncated ? ' (TRUNCATED, hit max_tokens)' : ''}`);
    console.log(text.slice(0, 600));
    writeFileSync(new URL(`../.smoke-output-${model}.html`, import.meta.url), text);
  } catch (err) {
    console.log(`\n=== ${model} === ERROR: ${err.message}`);
  }
}
