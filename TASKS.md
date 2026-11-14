---
tags: [tasks, planning, paste-screenshot-css]
created: 2026-11-14
---

# Project Tasks — Paste Screenshot as CSS

Task list for `paste-screenshot-css`, following the tagging convention from
`youtube_reviewer/requirements/TASKS.md`. This pass covers PRD Build Plan Day 1-3
only (scaffold, clipboard read, vision call, insert-at-cursor) — Day 4-7
(output flavors, error-path polish, prompt refinement, packaging, launch) are
tracked but not started.

## Tag convention

| Tag | Scope |
|---|---|
| `[T-xx]` | General task |
| `[SEC-xx]` | Security |
| `[FE-xx]` | Extension-side feature (command, UI, insertion) |
| `[BE-xx]` | Backend-ish logic (clipboard read, API call) — no real backend exists |
| `[E2E-xx]` | End-to-end / real-system testing |

## Agent/skill conventions for whoever picks up a task

- **Default implementation style: ponytail mode** (smallest complete change, no speculative abstraction, reuse before building, one small test for new non-trivial logic).
- **Code/comment hygiene: antislop-code** on any diff that touches comments.
- **`[SEC-xx]` tasks: use the `security-review` skill** before marking done.
- **`[E2E-xx]` tasks:** real systems, no mocks — real macOS clipboard, real Cent AI API call.

---

## Phase 0 — Scaffold

- [x] **T-01:** `git init` the repo at `~/Desktop/paste-screenshot-css`, TypeScript VS Code extension manifest (`package.json`, `tsconfig.json`), command + keybinding registration (`Cmd+Shift+V` / `Ctrl+Shift+V`).
- [x] **T-02:** Copy the PRD into `requirements/PRD.md`.

## Phase 1 — Day 1: Clipboard read (macOS only, per PRD §5's platform-fragility note)

- [x] **BE-01:** `src/clipboard.ts` — `readClipboardImageMac()`, shells out to `osascript` (`the clipboard as «class PNGf»` → temp file → read bytes → unlink). Windows/Linux paths explicitly out of scope this pass.
- [x] **E2E-01:** Real test (`test/clipboard.test.ts`) — puts a known PNG on the actual macOS clipboard via `osascript`, reads it back through `readClipboardImageMac()`, asserts the PNG signature bytes match. Second case asserts a clear error when the clipboard has no image.

## Phase 2 — Day 2: Vision call

- [x] **BE-02:** `src/vision.ts` — `callVisionApi()` builds an Anthropic-Messages-shape request (image content block) against Cent AI (`api.cent-ai.dev/v1/messages`, `x-api-key` header), per the task's explicit deviation from the PRD's raw-OpenAI-key plan.
- [x] **BE-03:** Model smoke test (`scripts/smoke-test.mjs`) against 3 candidates (`claude-haiku-5.5`, `claude-sonnet-4-6`, `claude-fable-5.1`) using the real `dev/shot.png` screenshot — latency + token counts compared, result documented in `.env.example`'s rationale comment.
- [x] **E2E-02:** Unit test (`test/vision.test.ts`) for `stripCodeFences()` — the markdown-fence-stripping logic the real API response gets run through.
- [x] **SEC-01:** API key stored via VS Code `SecretStorage` (`pasteScreenshotAsCss.setApiKey` command), never written to `settings.json` — matches PRD §5's trust-boundary requirement. The repo's own `.env` (dev-only, for the smoke-test script) is gitignored.

## Phase 3 — Day 3: Insert-at-cursor + status spinner

- [x] **FE-01:** `src/extension.ts` — `insertAtCursor()` reads the cursor line's leading whitespace and prefixes every inserted line after the first, inserted via the standard `TextEditor.edit()` API (undoable with one Cmd+Z, no custom diff view).
- [x] **FE-02:** Status-bar spinner during the API call via `vscode.window.withProgress({ location: ProgressLocation.Window, cancellable: true })` — reuses the built-in VS Code feature instead of a custom `StatusBarItem`; cancellation rejects the in-flight call.
- [ ] **E2E-03:** Full flow driven through the actual VS Code Extension Development Host (press the real keybinding, watch the real insertion). **Not done this pass** — no VS Code GUI driver available in this build environment; verified instead at the module level (real clipboard test, real API smoke test, clean `tsc` compile against `@types/vscode`). Flagged as the one open risk before calling Day 1-3 fully closed.

## Not started (Day 4-7, out of scope for this pass)

- [ ] **FE-03 (Day 4):** 3-way output flavor setting (Tailwind/JSX, Tailwind/HTML, plain CSS/HTML) + quick-pick, remembered after first use.
- [ ] **T-03 (Day 4):** Error-path polish — Retry button on API error/timeout, explicit no-API-key and no-clipboard-image UX pass beyond the current plain error messages.
- [ ] **T-04 (Day 5):** Prompt refinement pass against 8-10 varied fixture screenshots (buttons, cards, nav bars, forms, landing page section).
- [ ] **T-05 (Day 5):** "Regenerate with more detail" secondary command.
- [ ] **T-06 (Day 6):** Marketplace README polish (hero GIF), icon, `vsce package`/`vsce publish`.
- [ ] **T-07 (Day 6):** Pricing/licensing decision (PRD §7 recommends honor-pricing via Gumroad link — no gating code).
- [ ] **T-08 (Day 7):** Product Hunt / Twitter / subreddit launch prep.
