---
title: "PRD — Paste Screenshot as CSS (VS Code Extension)"
tags: [saas, vscode-extension, solo-dev, quick-cash, prd, gpt-4o, tailwind]
status: draft
pricing_model: one-time
target_build_days: 7
---

# PRD: Paste Screenshot as CSS (VS Code Extension)

## 1. Problem Statement (buyer's perspective)

"I get a Figma link or a screenshot of a mockup from a designer / client / PM, and I have to manually recreate it as HTML/JSX + Tailwind classes. Measuring paddings, guessing hex colors, eyeballing font sizes — it's 20-40 minutes of tedious translation work *before* I even get to the logic. I do this 5-10 times a week. There's no fast way to go from 'picture of a UI' to 'working markup' without leaving my editor, uploading the image somewhere, copy-pasting code back, and reformatting it to match my project's conventions."

The pain is not "I can't build the UI" — it's the **translation tax**: visual → code is manual, repetitive, and happens dozens of times per project. Existing tools either require a subscription SaaS dashboard (builder.io, Locofy, Anima — $20-40/mo, account creation, a web UI you must tab into) or ChatGPT's own UI (works, but breaks flow: screenshot → switch to browser → paste → prompt → copy output → switch back → paste → reformat indentation).

## 2. Target Buyer

**Primary persona: "Dani, the freelance frontend dev."**
- Works solo or on a 2-3 person contract team, bills hourly or per-project on Upwork/Contra/direct clients.
- Gets mockups as Figma frames, PNG exports, or screenshots dropped in Slack — not clean design-system handoffs.
- Already lives in VS Code 8+ hours/day, already uses Tailwind on most client projects (it's the default for freelance landing pages, dashboards, SaaS front-ends in 2024-2026).
- Has their own OpenAI API key already (uses ChatGPT Plus or API for other coding help) or is willing to create one for $5 of credit — not price-sensitive on usage, allergic to *another monthly subscription* on top of Vercel/Figma/GitHub Copilot they already pay for.
- Values speed over perfection: wants "80% there in 10 seconds, I'll fix the rest by hand" — not a pixel-perfect design-to-code pipeline.

**Secondary persona:** Indie hacker / solo founder building their own SaaS front-end, has a Figma mockup they made themselves or bought a UI kit, wants to skip the markup-writing step entirely to get to feature logic.

**Explicitly NOT the buyer:** Design agencies needing team collaboration, design-system sync, or multi-framework export (that's builder.io/Locofy's $40+/mo territory) — v1 does not compete there and should not try to.

## 3. Solution / What It Does

A VS Code extension that turns a screenshot sitting in the clipboard into Tailwind-flavored JSX/HTML, inserted directly at the cursor, in one command.

1. User copies an image to the system clipboard (screenshot tool, "Copy as PNG" in Figma, or any image copy).
2. User runs the command **"Paste Screenshot as Code"** (default keybinding `Cmd+Shift+V` / `Ctrl+Shift+V`, chosen to not collide with the standard paste; command palette entry as fallback).
3. Extension reads the image straight from the OS clipboard (no upload, no intermediate file dialog), base64-encodes it, and sends one request to the OpenAI Chat Completions API (`gpt-4o`, vision-enabled) with a prompt tuned specifically for Tailwind output.
4. Response streams back; the generated JSX/HTML/Tailwind block is inserted at the current cursor position in the active editor, indentation-matched to the surrounding file.
5. User edits/accepts in place — it's just text in their file, no special UI, no diff view, no lock-in.

No backend, no account, no telemetry server. The extension is a thin client: clipboard → OpenAI API → cursor. The developer (me) touches zero user data and pays zero inference cost.

## 4. Core User Flow (step by step)

1. **Install** — one-click install from VS Code Marketplace. On first activation, extension checks for an OpenAI API key in settings; if missing, shows a one-time notification: *"Paste Screenshot as Code needs your OpenAI API key (gpt-4o vision). Add it now?"* → opens extension settings pane with the `pasteScreenshotAsCode.openaiApiKey` field focused. Link to "How to get an API key" (OpenAI docs) included in the notification.
2. **Capture mockup** — user screenshots a region of Figma, a browser, a PDF spec, or any image, OR uses Figma's native "Copy as PNG" on a selected frame. Image is now in system clipboard.
3. **Invoke** — in any open file (`.tsx`, `.jsx`, `.html`, `.vue`), place cursor where markup should go, press `Cmd+Shift+V` or run `Paste Screenshot as Code` from the command palette.
4. **Clipboard read** — extension reads clipboard image via OS-level clipboard API (see §6). If clipboard has no image, shows a non-blocking error: *"No image found in clipboard — copy a screenshot first."*
5. **Framework/style hint (optional, remembered)** — first run only (or via a settings/status-bar toggle), user picks an output flavor: `Tailwind + JSX` (default), `Tailwind + plain HTML`, `Plain CSS + HTML`. Choice is persisted in workspace settings so repeat use is zero-friction.
6. **API call** — extension builds a vision request to `gpt-4o` with the base64 image and the tuned system prompt (see §6), shows a status-bar spinner: *"Generating UI from screenshot…"*.
7. **Insert** — on response, the code block is extracted (strip markdown fences if the model wraps it), indentation is normalized to match the line at the cursor, and the text is inserted via the standard VS Code edit API — this is undoable with a single `Cmd+Z` like any other edit.
8. **Iterate** — user tweaks classes/text by hand, or re-runs the command with a refined screenshot/crop if the first pass missed something. No session state is kept between runs — each invocation is a fresh, stateless API call.
9. **Error paths**: invalid/missing API key → inline error with a link to settings; API timeout/5xx → error message with a "Retry" button; rate-limited → surfaces OpenAI's error text directly (no custom retry/backoff logic needed for v1 — shortcut, see §12).

## 5. Tech Stack & Implementation Decisions

- **Platform**: VS Code Extension (TypeScript), using `vscode` Extension API only. No separate CLI, no companion app.
- **Language**: TypeScript — plays directly to the developer's strongest skill, zero ramp-up time.
- **No backend, no server, no database.** This is the central cost/complexity decision: the extension is a pure client that calls OpenAI's API directly from the user's machine using the user's own key. Zero infra for the developer to run, scale, secure, or pay for. Zero COGS beyond Marketplace/Gumroad listing time.
- **Clipboard image access**: VS Code's built-in clipboard API (`vscode.env.clipboard`) only handles text, not images, so image reading needs a small native shell-out:
  - macOS: `pngpaste` if present, else AppleScript (`osascript`) call to grab clipboard as PNG via `the clipboard as «class PNGf»`.
  - Windows: PowerShell one-liner (`Get-Clipboard -Format Image`) saved to a temp PNG.
  - Linux: `xclip -selection clipboard -t image/png -o` (X11) with a note in the README that Wayland support depends on `wl-paste` being installed.
  - This is the single platform-fragile piece of the build; budget real testing time here (see Build Plan, Day 3).
- **Vision call**: OpenAI Chat Completions endpoint, `model: gpt-4o`, image passed as a base64 data URL in the `image_url` content block, `max_tokens` capped (~1500) since output is markup, not prose. Call made directly from the extension process via `fetch`/`node-fetch` — no proxy, no SDK dependency needed beyond `undici`/global fetch available in VS Code's Node runtime.
- **API key storage**: VS Code's `SecretStorage` API (not plain `settings.json`) so the key isn't synced in plaintext via Settings Sync or visible in a committed `.vscode/settings.json`. This is a small but real trust-boundary detail worth getting right — users are pasting their own API key into *something*, and getting this wrong (plaintext in settings) is the kind of thing that tanks Marketplace reviews.
- **Prompt engineering** (the actual product value): a single, carefully tuned system prompt instructing the model to (a) output only a Tailwind-classed JSX/HTML block, no prose, no markdown fences in the ideal case, (b) infer spacing/sizing using Tailwind's default scale rather than arbitrary values, (c) use placeholder text/icons (e.g., `lucide-react` icon names as comments) where exact assets can't be inferred, (d) default to semantic HTML tags. This prompt is the extension's entire IP — budget iteration time on it, not on scaffolding.
- **No build step for the user** — ships as a prebuilt `.vsix`, standard Marketplace install.
- **No telemetry, no analytics SDK.** Selling point for privacy-conscious freelancers; also removes a whole category of GDPR/privacy-policy work.

## 6. Data Model

**There is none, by design.**
- No database, no user accounts, no server-side storage of any kind.
- The OpenAI API key lives in the user's local VS Code `SecretStorage` (OS keychain-backed), never transmitted anywhere except directly to `api.openai.com` as the user's own auth header.
- The screenshot image is read from clipboard, base64-encoded in memory, sent once to OpenAI, and discarded — never written to disk by the extension (beyond the brief OS-level clipboard-image temp file on Windows/Linux paste-helpers, which the OS manages, not the extension).
- The generated code is inserted directly into the user's open file — it becomes part of *their* file, their git history, their project. The extension keeps no copy, no history, no "past generations" list in v1.
- Settings persisted locally: chosen output flavor (Tailwind/JSX vs HTML vs plain CSS), that's it.

This is a feature, not a gap: "we never see your screenshots or your code" is a real distribution/trust angle for the Product Hunt launch and Marketplace description.

## 7. Pricing & Packaging

- **$12, one-time purchase. No subscription, no tiers, no usage limits imposed by the extension.**
- User's own OpenAI usage cost is separate and theirs (gpt-4o vision calls run roughly $0.01-0.03 per screenshot at typical image sizes — cheap enough not to matter, but worth one line in the README/FAQ so there are no surprised reviews).
- **Distribution channel for payment — VS Code Marketplace does not support paid extensions directly**, so the actual mechanics are:
  - List the extension **free** on the Marketplace (required — Marketplace has no native paywall), but gate full functionality behind a license key:
    - Free tier: 3 free generations total (no key needed, uses a shared *developer-provided* low-volume key with hard rate limiting) — this is the only exception to "zero COGS," and it's capped tightly (e.g., 3 lifetime uses tracked via a machine-id stored locally) purely as a try-before-you-buy hook. Budget: a handful of dollars/month at most at low volume; cut it immediately if abused.
    - Paid: user buys a $12 license on **Gumroad**, receives a license key, pastes it into the extension's settings (`pasteScreenshotAsCode.licenseKey`) to unlock unlimited use with their own API key. License validation is a simple offline-checkable signed token (no license server needed — shortcut: no revocation possible if a key leaks, upgrade only if piracy becomes a real problem) or, more simply, no enforcement at all beyond the free-tier cap and an honest-pricing honor system with a visible "Buy a license" nudge after the free uses are exhausted.
  - Alternative, simpler packaging to consider shipping with first (recommended): **skip the free-tier/license-key complexity entirely for the initial launch** — ship the extension fully free and functional on the Marketplace (bring-your-own-key, no gate at all), and sell it as a **$12 Gumroad "supporter / pro" purchase** that unlocks nothing functionally but is positioned as "pay once if this saves you time, no pressure" — many solo-dev tools (e.g., early CodeStream, countless VS Code themes) succeed with this honor-pricing model and it cuts real build time (no license validation code at all). **This is the v1 recommendation** — ungate everything, sell goodwill + a Gumroad "buy me a coffee at scale" link, measure conversion, add a real paywall only if data shows people would pay for a gate.
- **Decision point for the developer**: pick honor-pricing-via-Gumroad-link (zero extra build days) vs. license-gated free-tier (adds ~1 build day for key validation logic). Given the "weeks not months" constraint, **default to honor pricing for launch**, revisit gating post-launch if revenue is too low.

## 8. Build Plan (solo dev, 7 days)

**Day 1 — Scaffold & clipboard image read**
- `yo code` extension scaffold, TypeScript template.
- Implement clipboard image extraction for macOS first (dev's primary OS) — shell out to `osascript`/`pngpaste`, write temp PNG, read bytes, base64-encode.
- Wire up command registration + keybinding + command palette entry.
- Milestone: running the command on macOS with an image in clipboard logs a valid base64 string to the console.

**Day 2 — OpenAI vision call + prompt v1**
- Implement `SecretStorage`-backed API key setting + first-run prompt notification.
- Build the `gpt-4o` vision request (image + system prompt), parse response, strip markdown fences.
- Write prompt v1 focused on Tailwind+JSX output; manually test against 8-10 varied screenshots (buttons, cards, nav bars, forms, a full landing page section) saved as fixtures.
- Milestone: command produces usably-close Tailwind/JSX for at least 7/10 fixture screenshots.

**Day 3 — Cross-platform clipboard + insertion polish**
- Add Windows (PowerShell) and Linux (`xclip`/`wl-paste`) clipboard paths; detect platform via `process.platform`, graceful "unsupported — please install xclip" error if tooling missing on Linux.
- Implement cursor-position insertion with indentation matching (read current line's leading whitespace, prefix all inserted lines).
- Add status-bar spinner during the API call, cancel-on-Escape.
- Milestone: full flow works end-to-end on at least 2 of 3 platforms (test on the dev's own machines; ask a friend/beta tester for the third).

**Day 4 — Output flavor options + error handling**
- Add the 3-way output flavor setting (Tailwind/JSX, Tailwind/HTML, plain CSS/HTML) — essentially 3 prompt variants, selected via a quick-pick on first use, remembered after.
- Error paths: no API key → actionable notification; no image in clipboard → clear message; API error/timeout → surfaced message + Retry button.
- Milestone: every error path in §4 has a tested, non-crashing UI response.

**Day 5 — Prompt refinement pass**
- Re-run all fixture screenshots, tighten the prompt based on failure patterns (common issues to expect: wrong spacing scale, missing semantic tags, over-literal colors instead of Tailwind's palette, wrapping output in explanatory prose despite instructions not to).
- Add a short "regenerate with more detail" secondary command that re-prompts the same image with an added instruction, for cases where the first pass is too shallow (keeps prompt engineering as the only "feature work" — resist adding real settings/config beyond this).
- Milestone: 9/10 fixtures produce output the dev would accept with only minor hand-edits.

**Day 6 — Packaging, README, Marketplace listing**
- Write the Marketplace README: hero GIF (record the exact Figma-screenshot → pasted-JSX flow, 10-15 seconds), feature bullets, "bring your own API key" messaging up front (sets correct expectations, avoids 1-star "why do I need my own key" reviews), FAQ (cost per generation, supported frameworks, privacy — "we never see your screenshots").
- Set up Gumroad page (if going the paid-license route) or just the honor-pricing "Buy me a coffee" link (recommended per §7).
- `vsce package` and `vsce publish` to Marketplace; verify install from a clean VS Code profile.
- Milestone: extension is live and installable from the public Marketplace URL.

**Day 7 — Launch prep & buffer**
- Record the Product Hunt demo GIF/video (can reuse Day 6's GIF, maybe a longer version).
- Draft Product Hunt listing copy and the Twitter/X thread (see §9).
- Buffer day for whatever broke during cross-platform testing or Marketplace review queue delays (Marketplace review is usually fast/automatic, but budget slack anyway).
- Soft-launch to a small dev community (a relevant subreddit, a Discord, or direct outreach to 5-10 freelancer contacts) before the full Product Hunt push, to catch obvious bugs with real strangers' screenshots before the bigger audience hits it.

## 9. Distribution & First-10-Customers Plan

**VS Code Marketplace listing optimization**
- Extension **name**: lead with the literal action — "Paste Screenshot as Code" (not a clever brand name) because Marketplace search is keyword-driven and devs search "screenshot to code vscode," "figma to tailwind," "image to jsx."
- **Keywords/tags** in `package.json`: `tailwind`, `figma`, `screenshot`, `gpt-4`, `jsx`, `html`, `ui-to-code`, `design-to-code`.
- **Short description** (shows in search results): *"Paste a screenshot, get Tailwind JSX. Your OpenAI key, your data, no subscription."* — leads with the differentiator (no subscription) since every competitor in this space is a $20-40/mo SaaS.
- **Icon**: simple, high-contrast (screenshot-to-bracket glyph) — Marketplace icons are tiny, most competitors have generic/blurry icons, an easy differentiation win.
- **README hero**: the GIF above the fold, nothing else before it — Marketplace README renders markdown directly and most visitors bounce in under 10 seconds.

**Product Hunt launch**
- Launch on a Tuesday-Thursday (historically higher PH traffic than Mon/Fri/weekend).
- Tagline: *"Screenshot → Tailwind code, right in VS Code. $12 once, no subscription."*
- First comment (from the maker account) tells the origin story in 3 sentences: freelancer pain → built it for myself → shipping it because every "AI design to code" tool out there is a $30/mo SaaS wrapper around the same GPT-4o call this does for $12 once.
- Ask 5-10 people in your network (the beta testers from Day 7) to be ready to comment/upvote in the first hour — PH ranking is heavily front-loaded.
- Reply to every comment same-day; "shipped by a solo dev, AMA" tone performs well in that community.

**Demo GIF tweet thread (concrete angle)**
- Tweet 1 (hook, video/GIF attached showing the exact flow — screenshot a Figma card component, `Cmd+Shift+V` in VS Code, Tailwind JSX appears at cursor in ~3 seconds): *"I was tired of manually recreating every Figma mockup as Tailwind by hand. So I built a VS Code extension that does it in one keystroke. Screenshot → paste → working JSX. Here's the whole flow:"* [GIF]
- Tweet 2: the "why it's not another subscription" angle — *"Every 'AI screenshot to code' tool I found is $20-40/mo and routes your screenshots through someone else's server. This one's $12 once. You bring your own OpenAI key, it talks directly to OpenAI, I never see your screenshots or your code."*
- Tweet 3: the specific use case callout to hook freelancers — *"If you're a freelancer who gets 'just make it look like this screenshot' from clients every week, this is for you."* + Marketplace/Gumroad link.
- Tweet 4 (next day, if traction): before/after thread — a messier real-world screenshot (not a clean Figma export) to show it handles realistic input, not just cherry-picked demos.
- Post the thread the same morning as the Product Hunt launch, cross-link both directions, and drop it in 2-3 relevant subreddits (r/webdev, r/vscode, r/Frontend) same day, each tailored (don't cross-post identical copy — Reddit penalizes that) framed as "I built this, here's a demo" rather than a sales pitch.

**First-10-customers math**: at $12/unit, 10 customers = $120 — the realistic goal is proving the funnel (install → trial → honor-pay or license-buy) works at all, not revenue. Watch Marketplace install count vs. Gumroad/license conversions as the core signal to decide whether to invest further (more prompt tuning, a Cursor/JetBrains port, paid tiers) or move on.

## 10. Risks & Fastest Mitigations

| Risk | Mitigation (fastest, not fanciest) |
|---|---|
| GPT-4o output quality is inconsistent/hallucinates classes or layout | Spend Day 5 explicitly on prompt iteration against real fixtures before launch; set expectations in README copy ("80% there, you finish the polish") so reviews don't expect pixel-perfection |
| Clipboard image reading breaks on some OS/VS Code version combo (highest technical risk — it's the one non-standard, shell-dependent piece) | Test on all 3 OSes before launch (Day 3); ship a clear error message naming the missing system dependency (e.g., "install xclip") rather than failing silently; treat Windows/macOS as must-work, Linux/Wayland as best-effort with a documented caveat |
| Builder.io/Locofy/v0.dev/similar tools are free or already well-known, nobody pays $12 for a narrower tool | Lead distribution copy with the specific wedge they don't have: in-editor, one keystroke, no subscription, no account, no server — don't try to out-feature them, out-simplify them |
| OpenAI changes vision API pricing/access and user's own key stops working or gets expensive | Zero action needed from the developer — it's the user's cost and key, not a developer liability; just keep README's cost-estimate line roughly current |
| Marketplace paid-extension limitation forces an awkward Gumroad detour, friction loses buyers | Default to honor-pricing (§7) for launch — removes the friction entirely; only add license-gating if post-launch data shows people would pay for enforcement |
| A user pastes a clearly non-UI image (a cat photo) and gets garbage output, leaves a bad review | One line in the system prompt instructing the model to say "this doesn't look like a UI screenshot" if confidence is low, and surface that message directly to the user instead of forcing fake output |
| Low distribution reach — Marketplace listing gets zero organic traffic | Don't rely on Marketplace SEO alone; the Product Hunt + Twitter thread + targeted subreddit posts (Day 7 plan) are the actual first-10-customers engine, Marketplace SEO is a long-tail compounding channel, not day-one traffic |

## 11. Out of Scope for v1

- Any backend, account system, or server-side anything.
- License-key server / revocation / seat management (ship honor-pricing first; see §7).
- Figma plugin or direct Figma API integration (clipboard-paste covers the real workflow without needing Figma API tokens/OAuth).
- Multi-image / multi-page batch generation.
- Support for frameworks beyond Tailwind/JSX/HTML/plain CSS (no Vue SFC, no Svelte, no CSS-in-JS/styled-components variants) — can be a paid "pack" later if demand shows up in reviews/requests.
- A "history" or "past generations" panel inside the extension.
- Fine-tuning or a custom model — stock `gpt-4o` only.
- JetBrains/Cursor/other-editor ports (Cursor is VS Code-compatible so the same `.vsix` likely installs there with no extra work — verify, but don't build a separate listing/support burden for it in v1).
- Team/collaboration features of any kind.
- Automatic design-token extraction (exact hex-to-brand-color mapping, font-family detection from the image) — out of scope; the model free-infers reasonable Tailwind defaults instead.

## 12. Success Metric for the POC

**Primary metric: 10 paying/honor-paying customers within 30 days of Product Hunt launch**, validating that strangers (not just the dev's own workflow) find enough value in a one-keystroke screenshot-to-Tailwind flow to pay $12 once for it.

**Leading indicators to watch in the first 7 days** (cheaper/faster signal than waiting a full month for the primary metric):
- Marketplace install count (target: 100+ installs in week 1 off the PH/Twitter push — installs are free and should be the easy part; the real test is below).
- Ratio of installs → actual command invocations (via no-telemetry proxy: Marketplace "active users" stat if available, or simply ask early users) — tests whether people who install actually try it, not just star/forget.
- Qualitative signal: do PH comments / Twitter replies mention *wanting* to pay, or ask "why isn't this free" — directly informs whether to keep honor-pricing or need a harder paywall.

**Kill/double-down threshold**: if 30 days post-launch produce fewer than 5 total payments/honor-payments despite 100+ installs, treat it as a distribution-fit failure (people like the demo but won't pay for this narrow a tool) rather than iterating further on prompt quality — the fastest next move at that point is repositioning the free tier itself as a lead magnet for a different, bigger product, not adding features to this one.
