---
tags: [tasks, planning, paste-screenshot-css]
created: 2026-11-14
---

# Project Tasks — Paste Screenshot as CSS

Task list for `paste-screenshot-css`, following the tagging convention from
`youtube_reviewer/requirements/TASKS.md`. Day 1-3 (scaffold, clipboard read,
vision call, insert-at-cursor) and most of Day 4-5 (output flavors, retry UX,
prompt refinement, real QA, a code review pass) are done. Day 6-7 (packaging,
Marketplace listing, launch prep) are tracked but not started.

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
- [x] **E2E-03:** Full flow driven through the actual VS Code Extension Development Host. **Done, then retired:** `@vscode/test-electron` was installed and it genuinely worked — real activation, real macOS clipboard image, real Cent AI call, real text inserted into a real open document, asserted in a real Mocha run inside a real Extension Host (two independent runs, ~9.3s each, both passing). It also caught a real bug (**FIX-01** below) that no module-level check could have found. The approach was then **deliberately removed mid-session at the user's explicit request** — it was popping visible Electron/VS Code windows on their physical laptop and disrupting them — not because it was infeasible. Replaced by module-level verification only from here on (see **E2E-05**, plus the existing real clipboard/vision tests and `scripts/qaFullFlow.mjs`).

## Phase 4 — Day 4-5: Output flavors, retry UX, prompt refinement, real QA

- [x] **FE-03:** Output-flavor quick-pick (Tailwind classes / plain CSS / inline style attributes) — one shared system-prompt template with a per-flavor instruction slot (`src/vision.ts`'s `buildSystemPrompt`), not three separate prompts/code paths. Quick-pick on first run, remembered in `globalState`; `pasteScreenshotAsCss.setOutputFlavor` command to change it later. Commit `9c5fef2`.
- [x] **T-03:** Retry-on-failure UX — API/network failure now shows a `'Retry'` action instead of a dead end; clicking it re-runs the command once. No silent automatic retries. Commit `9c5fef2`.
- [x] **E2E-04:** Added 4 real screenshot fixtures (`test/fixtures/real-screenshots/`) alongside the original `shot.png`, for prompt-refinement and QA use. Commit `0bccc17`.
- [x] **T-04:** Prompt refinement pass + `scripts/qaFullFlow.mjs` — ran the real pipeline against all 5 real fixtures, found and fixed a real truncation bug (`max_tokens` cap too low on dense screenshots, confirmed via the API's own `stop_reason: "max_tokens"`), added a prompt instruction capping dense repeated-element enumeration. Before/after detail: `requirements/PROMPT_REFINEMENT.md`. Full before/after suite: 2/5 → 5/5. Commits `efe7b6c`, `b83ff94`.
- [x] **FIX-01:** `package.json`'s `main` pointed at `./out/extension.js`, a path `tsc` never produces (real output is `./out/src/extension.js` given `rootDir: '.'`) — real VS Code would have failed to activate the extension. Found by actually loading the extension in a real VS Code instance (see E2E-03/E2E-05). Commit `02c8c94`.
- [x] **E2E-05:** Extracted `insertAtCursor`'s indentation math into a `vscode`-free module (`src/indent.ts`) and unit-tested it directly — module-level coverage for the one pipeline piece that otherwise needs a real `vscode.TextEditor`, now that E2E-03's Electron-based test is retired. Commit `446732c`.
- [x] **SEC-02:** `security-review` pass on SecretStorage API-key handling and the Cent AI network call — found and fixed one real issue (unbounded upstream error body going straight into a UI toast, capped at 300 chars); everything else (key handling, `.env` hygiene, image-data-as-base64 injection risk) checked out clean. Also an `antislop-code` pass (one over-explained comment trimmed) and a flag on the real-screenshot fixtures' privacy exposure if this repo ever goes public. Full findings: `requirements/CODE_REVIEW_V1.md`. Commit `6448c58`.
- [x] **SEC-03:** Ran `npx @vscode/vsce package` for real (not just read as theoretical) to verify the packaging instructions — with no `.vscodeignore`, it was about to bundle the real `.env` key plus the full `test/` fixtures/`scripts/`/`requirements/`/`src/` into the `.vsix`; `vsce`'s own guard caught `.env` specifically but nothing else. Added `.vscodeignore`; re-ran for real — clean 8.95 KB `.vsix`, verified by reading its actual file listing. Commit `0090755`.

- [x] **E2E-06:** Real visual-fidelity QA (`scripts/demoGen.mjs` + `requirements/DEMO.md`) — 3 of 5 fixtures x 2 flavors (css, tailwind), real Cent AI calls, rendered headlessly via Chrome `--headless=new`, compared against source via `ffmpeg ssim` + side-by-side images, stitched into `requirements/demo/demo-5-paste-screenshot.mp4`. No VS Code/Electron window launched. Closes the "needs a human/vision pass" gap noted in `qaFullFlow.mjs`/`CODE_REVIEW_V1.md`. Verdict: real-01/real-03 (CLI dashboard) read as faithful at a glance (SSIM 0.66-0.72); real-05-shot (Wikipedia page) is structurally correct but the weakest visual match (SSIM 0.59-0.60).

## Phase 5 — Day 6-7: packaging, pricing, launch prep (credential-free portion)

- [x] **T-05:** "Regenerate with more detail" secondary command — `pasteScreenshotAsCss.regenerateMoreDetail`, reuses the existing `run()`/retry-UX pattern with a `moreDetail` flag threaded into `buildSystemPrompt()` (one extra instruction appended, not a second prompt). One unit test on the prompt-building logic (`test/vision.test.ts`). Commit `9f551fc`.
- [~] **T-06 (partial — real completion state below):**
  - [x] Extracted 3 frames from the existing `requirements/demo/demo-5-paste-screenshot.mp4` via `ffmpeg` into a looping hero GIF: `requirements/demo/hero.gif` (720x270, 80 KB, 1.5s/frame, `-loop 0`).
  - [x] 128x128 icon generated via a one-shot `ffmpeg drawtext` command (dark background, cyan `</>` glyph + "PNG" label) — `icon.png` at repo root, wired into `package.json`'s `icon` field.
  - [x] README.md rewritten to Marketplace-listing quality: hero GIF embedded above the fold, what-it-does, install/setup, commands, pricing, limitations, links to the other requirements docs.
  - [x] Ran `npx @vscode/vsce package` for real — **required `--no-rewrite-relative-links`** to succeed: with no git remote, vsce can't rewrite the README's relative `requirements/demo/hero.gif` link to an absolute URL, and refuses to package by default (treats it as a Marketplace-page-breaking error, not just a warning). Real output: clean 13.75 KB `.vsix`, 9 files, verified by reading its actual file listing (`icon.png`, `readme.md`, compiled `out/src/*.js`). **Known real limitation, not faked:** the hero GIF will render in this README locally/on GitHub but would 404 on an actual Marketplace listing page until this repo has a real git remote (or `--baseImagesUrl` is set at publish time) — document, don't silently "fix" with a fake repo URL.
  - [ ] **`vsce publish` — blocked.** No VS Code Marketplace publisher account exists in this environment; not attempted, not faked.
- [x] **T-07:** `requirements/PRICING_DECISION.md` — recommends sticking with the PRD's **$12 one-time, honor-pricing via Gumroad, no gating code** (PRD §7's own v1 recommendation — costs zero extra build, consistent with "no backend" thesis). Anchored against two real comparables found via web search: **Pixel — Vision to Code** (Chrome, BYOK screenshot-to-code, $14.99 one-time) and **Spec Coder** (VS Code, BYOK, $9.99 one-time via Gumroad) — $12 sits inside that real $9.99-$14.99 band, not picked from nothing. **The Gumroad link itself does not exist** — no Gumroad account in this environment; README/launch copy reference it as `<gumroad-link-tbd>`, not a working URL.
- [x] **T-08:** `requirements/LAUNCH_COPY.md` — Product Hunt tagline + description + first comment, a 4-tweet X thread draft, an r/vscode post draft. **Drafts only — nothing posted.** No social accounts were touched.

## Not started / explicitly blocked (credentials that don't exist in this environment)

- [ ] **`vsce publish`** — needs a VS Code Marketplace publisher account. Not created, not attempted.
- [ ] **Gumroad product page** — needs a Gumroad account. Not created; pricing decision and number are ready (`requirements/PRICING_DECISION.md`), the actual listing is a ~10-minute manual task for whoever holds payment credentials.
- [ ] **Posting `LAUNCH_COPY.md`** to Product Hunt/Twitter/Reddit — needs those accounts; copy is drafted and ready, nothing has been posted.
