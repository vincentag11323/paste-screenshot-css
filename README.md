# Paste Screenshot as CSS

Copy a screenshot to the macOS clipboard, run a command, get back HTML + CSS
at your cursor. Uses your own Cent AI key, no backend, no account.

## Status

Day 1-5 of the build plan (see `requirements/PRD.md` §8). macOS only.

- Clipboard image read: real, tested against the actual macOS clipboard.
- Vision call to Cent AI (Anthropic-Messages-shape, Claude-family model): real, tested against the live API, 5/5 real fixtures passing (`npm run qa`, see `requirements/PROMPT_REFINEMENT.md`).
- Output-flavor picker (Tailwind classes / plain CSS / inline style) and a Retry action on failure.
- Insert-at-cursor with indentation matching: real, verified in a real VS Code Extension Host via `@vscode/test-electron` (caught and fixed a real activation bug — see `TASKS.md`'s `FIX-01`). That test harness was then removed at the developer's request (it launches a visible VS Code window) — current verification is module-level only (`npm test`), see `TASKS.md`'s `E2E-05`.
- Code review pass (security + comment hygiene): `requirements/CODE_REVIEW_V1.md`.
- Not yet packaged (`vsce package`) or published — see `TASKS.md`'s Day 6-7 section.

## Try it yourself

1. `npm install && npm run compile`
2. Package it: `npx @vscode/vsce package` (produces a `.vsix`), then in VS Code: Extensions panel → `...` menu → "Install from VSIX...".
3. Or run it from source without packaging: open this folder in VS Code and press `F5` (launches the real Extension Development Host with this extension loaded).
4. Open any file, run `Paste Screenshot as CSS: Set Cent AI API Key` once, copy a screenshot to the clipboard, then run `Paste Screenshot as CSS` (`Cmd+Shift+V`).

## Setup

```bash
npm install
npm run compile
npm test
```

Copy `.env.example` to `.env` and fill in `LLM_API_KEY` to run `scripts/smoke-test.mjs`
(compares candidate Cent AI models against a real screenshot; not used by the extension
itself at runtime — the extension stores its key in VS Code `SecretStorage` via the
"Paste Screenshot as CSS: Set Cent AI API Key" command).

## Commands

- `Paste Screenshot as CSS` (`Cmd+Shift+V` / `Ctrl+Shift+V`) — reads the clipboard image, sends it to Cent AI, inserts the result at the cursor.
- `Paste Screenshot as CSS: Set Cent AI API Key` — stores your key in SecretStorage.

## Model choice

See `.env.example` for the chosen model and the smoke-test numbers behind it.
