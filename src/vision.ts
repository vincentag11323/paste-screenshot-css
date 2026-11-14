const SYSTEM_PROMPT = `You convert UI screenshots into code. Reproduce the screenshot as a single
self-contained HTML snippet with an inline <style> block (plain CSS, not Tailwind).
Infer spacing, colors, and font sizes as best you can. Use semantic HTML tags.
Output ONLY the code — no prose, no explanation, no markdown code fences.
If the image clearly isn't a UI screenshot (e.g. a photo), respond with exactly:
NOT_A_UI_SCREENSHOT`;

export interface VisionCallOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  imageBase64: string;
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
      max_tokens: 2048, // shortcut: fixed cap tuned for one screenshot-sized snippet; raise if real usage shows truncated output
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: opts.mediaType ?? 'image/png', data: opts.imageBase64 },
            },
            { type: 'text', text: 'Reproduce this UI as HTML + inline CSS.' },
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
