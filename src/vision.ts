export type OutputFlavor = 'tailwind' | 'css' | 'inline';

// One phrase slotted into the shared prompt below — not three separate prompts/code paths.
const FLAVOR_INSTRUCTIONS: Record<OutputFlavor, string> = {
  tailwind: 'Style every element using Tailwind utility classes only. Do not output a <style> block and do not use inline style attributes.',
  css: 'Style every element using plain CSS in a single inline <style> block. Do not use Tailwind classes and do not use inline style attributes.',
  inline: 'Style every element using inline style="..." attributes only. Do not output a <style> block and do not use Tailwind classes.',
};

function buildSystemPrompt(flavor: OutputFlavor): string {
  return `You convert UI screenshots into code. Reproduce the screenshot as a single
self-contained HTML snippet. ${FLAVOR_INSTRUCTIONS[flavor]}
IMPORTANT: if the screenshot contains many repeated small elements (a long list of labels,
a map with dozens of place names or pin/marker icons, a dense table), you MUST cap it at
8-10 representative items and skip the rest — never enumerate every single instance, even
if that means the layout is not 100% complete. Getting cut off mid-tag is worse than being
incomplete.
Infer spacing, colors, and font sizes as best you can. Use semantic HTML tags.
Output ONLY the code, with no markdown code fences anywhere in the response.
If the image clearly isn't a UI screenshot (e.g. a photo), respond with exactly:
NOT_A_UI_SCREENSHOT`;
}

export interface VisionCallOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  imageBase64: string;
  flavor: OutputFlavor;
  mediaType?: string;
}

/** Calls Cent AI's Anthropic-Messages-shape endpoint with a vision content block. */
export async function callVisionApi(opts: VisionCallOptions): Promise<string> {
  const res = await fetch(`${opts.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 6144, // raised again (4096 → 6144) after real-02.png (a dense map screenshot) still truncated mid-tag; paired with the enumeration-cap instruction above
      // shortcut: still a fixed cap, not a token-based retry; if a screenshot is dense enough to
      // truncate at 6144 too, raise again once real usage shows it (same pattern as this fix).
      system: buildSystemPrompt(opts.flavor),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: opts.mediaType ?? 'image/png', data: opts.imageBase64 },
            },
            { type: 'text', text: 'Reproduce this UI as code.' },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Cent AI request failed: ${res.status} ${await res.text()}`);
  }

  const json: any = await res.json();
  const text = (json.content ?? []).map((block: any) => block.text ?? '').join('');
  return stripCodeFences(text);
}

/** Strips a single ```lang ... ``` wrapper the model adds despite being told not to. */
export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  return fenced ? fenced[1].trim() : trimmed;
}
