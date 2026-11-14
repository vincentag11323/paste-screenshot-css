---
title: "Prompt Refinement Pass (T-04) — real screenshots"
tags: [paste-screenshot-css, prompt-engineering, qa]
---

# Prompt refinement pass — T-04

Ran the real `callVisionApi()` (real Cent AI call, model `claude-haiku-5.5`) against
5 real fixtures in `test/fixtures/real-screenshots/` via `npm run qa`
(`scripts/qaFullFlow.mjs`): 4 fresh screenshots plus the original `shot.png` from
Day 1-3. This doc is the before/after record — not "improved the prompt," but the
specific real problem found and the specific fix, with evidence.

## Real problem found: truncation on dense/busy screenshots

**Not** the problems the PRD anticipated (hallucinated colors, ignoring layout,
missing semantic tags) — those didn't show up in 5/5 runs; output consistently had
real `<!DOCTYPE html>`/`<head>`/`<style>`/semantic-tag structure with content that
matched each screenshot's actual subject (a terminal, a Google Maps view, a card
UI, a Wikipedia-style page).

The actual problem: **two fixtures (`real-05-shot.png`, a Wikipedia-style page, and
`real-02.png`, a Google Maps view with dozens of place-name labels/pin markers)
hit the original `max_tokens: 2048` cap and got cut off mid-tag** — confirmed via
the API's own `stop_reason: "max_tokens"` field, not guessed from truncated-looking
output. The existing code comment on that line had literally predicted this
("raise if real usage shows truncated output") — this pass is that prediction
coming true.

### Before (original Day 1-3 prompt, `src/vision.ts`)

```
You convert UI screenshots into code. Reproduce the screenshot as a single
self-contained HTML snippet with an inline <style> block (plain CSS, not Tailwind).
Infer spacing, colors, and font sizes as best you can. Use semantic HTML tags.
Output ONLY the code — no prose, no explanation, no markdown code fences.
If the image clearly isn't a UI screenshot (e.g. a photo), respond with exactly:
NOT_A_UI_SCREENSHOT
```
`max_tokens: 2048`

Real output on `real-05-shot.png` (Wikipedia-style page): cut off mid-sentence —
`<p>Krásná Lípa was founded in the 14th century at the</p>\n</div>\n\n<div class="infobox">` ...
(file ends there, no closing `</div></body></html>`). API confirmed
`stop_reason: "max_tokens"`, `output_tokens: 2048` (exactly at the cap).

### Fix 1 — raise the cap

`max_tokens: 2048 → 4096`. Verified via a direct call: same image, `stop_reason:
"end_turn"`, `output_tokens: 2283` — comfortably under the new cap, no longer
truncated. Re-ran the full 5-fixture suite: 4/5 passed clean, but `real-02.png`
(the map) *still* truncated at 4096 — it's not just "shot.png was close to the old
cap," the map image specifically prompts the model to enumerate many
labels/markers (observed drawing raw SVG `<circle>`/`<path>` pins for every visible
marker), which scales with how busy the screenshot is, not a fixed amount.

### Fix 2 — tell the model not to enumerate dense repeated elements

Added to the system prompt:

```
IMPORTANT: if the screenshot contains many repeated small elements (a long list of labels,
a map with dozens of place names or pin/marker icons, a dense table), you MUST cap it at
8-10 representative items and skip the rest — never enumerate every single instance, even
if that means the layout is not 100% complete. Getting cut off mid-tag is worse than being
incomplete.
```

Also raised `max_tokens: 4096 → 6144` as a second, cheaper layer of the same fix
(the instruction reduces *how often* the model tries to enumerate everything; the
raised cap gives headroom for the cases where it still does).

### After

Ran `real-02.png` through `callVisionApi()` 3 times back-to-back after both
changes landed: all 3 ended with a real, present `</html>` close tag (lengths
8541-10617 chars) — no truncation across 3 consecutive real calls, where before
it truncated consistently. Full 5-fixture suite: **5/5 passed** (`npm run qa`),
up from 2/5 on the very first unmodified-script run (that first "2/5" also
included 3 false positives from the QA script's own tag-balance heuristic not
excluding void/self-closing tags — fixed in the script itself, see
`scripts/qaFullFlow.mjs`'s `VOID_TAGS` handling; the *real* defect count across
the whole pass was 2 truncated outputs, both now fixed).

## What did NOT need fixing

No hallucinated-color or ignored-layout problems were observed in any of the 5
outputs in a plain read of the generated HTML/CSS against what each screenshot's
filename/content implies (terminal prompt colors, map region names, card layout
structure, nav/header markup) — this is a structural/textual read, not pixel-level
visual comparison (see the main report's honesty note on `vision_analyze` quota
being exhausted for this session, which is the tool that would do a true
pixel-level check). If a future pass has that tool available again, re-verify
color/layout accuracy directly against each screenshot as a stronger check than
this pass could do.

## Residual known risk

`max_tokens` is still a fixed cap, not an adaptive/retry mechanism — an
extraordinarily dense screenshot could still truncate. The code comment next to
the constant documents this and says to raise it again the same way if real usage
shows it (same shortcut pattern used twice already in this pass).
