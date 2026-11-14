# Paste Screenshot as CSS

Copy a screenshot to the macOS clipboard, run a command, get back HTML + CSS
at your cursor. Uses your own Cent AI key, no backend, no account.

## Status

Day 1-3 of the build plan (see `requirements/PRD.md` §8). macOS only.

- Clipboard image read: real, tested against the actual macOS clipboard.
- Vision call to Cent AI (Anthropic-Messages-shape, Claude-family model): real, tested against the live API.
- Insert-at-cursor with indentation matching: implemented, compiles against `@types/vscode`.
- Not yet launched in VS Code's Extension Development Host (no GUI driver in this build environment) — see TASKS.md.

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
