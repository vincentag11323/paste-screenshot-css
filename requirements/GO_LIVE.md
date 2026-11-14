---
tags: [go-live, checklist, paste-screenshot-css]
created: 2026-11-14
---

# Go Live — what only you can do

Everything buildable without your own credentials is done: the extension works end to end (real clipboard, real Cent AI vision calls, 2 output flavors QA'd with real screenshots, "regenerate with more detail" shipped), the `.vsix` packages clean (13.75KB), README/icon/hero-GIF are ready, pricing is decided and justified (`requirements/PRICING_DECISION.md`), and launch copy is drafted (`requirements/LAUNCH_COPY.md`). Three things need your own accounts — nothing else is missing.

## 1. VS Code Marketplace publisher account (~15 min)
1. Create a publisher at https://marketplace.visualstudio.com/manage — needs a Microsoft/Azure DevOps account (free) and a Personal Access Token (Azure DevOps → User Settings → Personal Access Tokens → scope: Marketplace → Manage).
2. `npx vsce login <publisher-name>`, paste the PAT when prompted.
3. `package.json`'s `publisher` field needs to match your real publisher name — currently a placeholder, check it before publishing.
4. From the repo root: `npx vsce publish` (this will re-run `vsce package` itself; the clean 13.75KB build already proven in this session should carry through unchanged).
5. **Known gap to fix before publishing, not after:** the README's hero GIF is a relative link (`requirements/demo/hero.gif`) — `vsce package` needed `--no-rewrite-relative-links` to skip link-rewriting since there's no git remote yet. Push this repo to a real GitHub remote FIRST (even a private-then-public repo), so the GIF resolves on the live Marketplace page instead of 404ing. Then `vsce publish` without the `--no-rewrite-relative-links` flag.

## 2. Gumroad account for the honor-pricing link (~10 min)
1. Create a Gumroad account, add a product at the recommended **$12 one-time** price (see `requirements/PRICING_DECISION.md` for why — anchored against two real comparable extensions, Pixel $14.99 and Spec Coder $9.99).
2. Replace the `<gumroad-link-tbd>` placeholder in the README and `requirements/LAUNCH_COPY.md` with the real product URL.
3. No gating code needed or built — this is intentionally honor-pricing per the PRD, nothing to wire up.

## 3. Post the launch copy (~30 min, your accounts)
`requirements/LAUNCH_COPY.md` has a ready Product Hunt tagline/description/first-comment, a 4-tweet X thread, and an r/vscode post draft. Nothing has been posted — needs your own PH/X/Reddit accounts. Post after step 1's GitHub-remote fix, so every link in the copy actually resolves.

## One last visual check before any of this ships
`vision_analyze` has been non-functional all session — the icon (`icon.png`) and hero GIF (`requirements/demo/hero.gif`) were verified only by file format/dimensions, never actually eyeballed by an AI or a human. Open both yourself for 10 seconds before publishing; that's the one real unverified risk left in this project.
