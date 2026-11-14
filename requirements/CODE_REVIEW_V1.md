---
title: "Code Review V1 — Paste Screenshot as CSS"
tags: [paste-screenshot-css, code-review, security]
---

# Code Review V1

Scope: `security-review` skill applied specifically to SecretStorage API-key
handling and the Cent AI network call (injection via unsanitized image data,
error-message leakage), plus an `antislop-code` pass on comment hygiene across
`src/`, `scripts/`, and `test/`.

## Security review

### 1. Secrets (SecretStorage / API key handling) — clean

- API key is captured via `vscode.window.showInputBox({ password: true })`
  (masked input) and stored only via `context.secrets.store(...)`
  (`src/extension.ts`'s `setApiKey`) — never written to `settings.json`, never
  logged, never echoed back to the UI. Confirmed by reading every call site
  (`grep` found no `console.log`/`showInformationMessage` call that includes
  the key value itself).
- `.env` (the dev-only key used by `scripts/smoke-test.mjs`/`scripts/qaFullFlow.mjs`)
  is gitignored and confirmed **never** committed at any point in this repo's
  history (`git log --all --full-history -- .env` returns nothing).
- `.env.example` contains no real key, only a placeholder and a comment
  pattern hint (`cai_...`).
- `npm audit`: 0 vulnerabilities (checked after removing the
  `@vscode/test-electron`/`mocha` devDependencies added and then rolled back
  this session — see the handoff note on why).
- No hardcoded key/token pattern found anywhere in `src/`/`scripts/` (`grep`
  for `cai_`, `sk-`, and `apiKey.*=.*['"]` literal assignments: no matches).

### 2. Cent AI network call — one real finding, fixed

- **Image-data injection:** the clipboard PNG is base64-encoded and placed
  into the JSON request body via `JSON.stringify(...)`. Base64's charset
  (`A-Za-z0-9+/=`) contains no JSON- or HTTP-injection-relevant characters,
  and `JSON.stringify` escapes it correctly regardless — not exploitable.
  Nothing to fix here.
- **Error-message leakage (found, fixed):** on a non-OK response, the code
  threw `` `Cent AI request failed: ${res.status} ${await res.text()}` `` —
  the *entire*, unbounded upstream response body landed directly in a
  `vscode.window.showErrorMessage(...)` toast. This isn't a secrets leak (the
  API key is only ever sent in a request header, never echoed by a
  well-behaved API in its response body), but an oversized or unexpectedly
  verbose upstream error could dump a large/ugly blob into the user's editor
  UI. **Fix:** capped the body to 300 characters before it's ever thrown
  (`src/vision.ts`).
- **No request timeout:** `fetch()` has no `AbortController`/timeout, so a
  hung Cent AI connection could hang indefinitely. Not fixed this pass — it's
  already mitigated by the existing `vscode.window.withProgress({
  cancellable: true })` UI, which gives the user a real cancel button that
  rejects the in-flight call (see `extension.ts`'s `Promise.race` against
  `token.onCancellationRequested`). A hard server-side timeout would be the
  next step if a real hang is ever observed, not before.

### 3. Data exposure outside the code itself — flag, not a code fix

`test/fixtures/real-screenshots/` now contains 5 of the developer's real
screenshots (added this session for QA). Two of them render as dark-themed
terminal/dashboard screens — the model's own generated output titled one
`"Models & Quota"` — which likely reflects real account usage/billing-adjacent
information from the *developer's own tooling*, not test data. This repo has
no `git remote` configured yet (confirmed via `git remote -v`), so nothing is
exposed publicly today, but **flagging before any future `git push`/public
mirror**: decide whether to keep these fixtures, replace them with screenshots
that don't reveal account-specific info, or gitignore them and keep them
local-only before this repo goes anywhere public (e.g., before Marketplace
publishing work in the PRD's Day 6).

## Antislop-code pass (comment hygiene)

Read every comment in `src/*.ts`, `scripts/*.mjs`, `test/*.ts`. Verdict: the
existing comments already lean toward the "keep" side (prompt-engineering
rationale, shortcut/trade-off notes, platform-fragility notes) rather than
AI-slop patterns (no decorative separators, no step-by-step narration, no
vague TODOs, no emoji, no restating-the-obvious). One real finding:

- `src/vision.ts`'s `max_tokens` line had grown into a 3-line "over-explained"
  comment stacking the full before/after history (2048→4096→6144) and the
  reasoning chain inline in the code. Per `antislop-code`'s "Over-Explained
  Comment" pattern, trimmed to a single actionable line that points at
  `requirements/PROMPT_REFINEMENT.md` for the full history, rather than
  duplicating that history in two places.

No other changes made — everywhere else, comment length already matched the
fact being conveyed.

## Fixes applied as part of this review

1. `src/vision.ts` — cap the upstream Cent AI error body at 300 chars before
   it's thrown/surfaced to the user.
2. `src/vision.ts` — trimmed the over-explained `max_tokens` comment block to
   one line.

Both are included in this review's own commit (see `TASKS.md`'s `[SEC-02]`
entry for the exact commit).
