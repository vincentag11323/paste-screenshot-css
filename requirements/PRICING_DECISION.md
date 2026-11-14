# Pricing & Licensing Decision

**Decision: $12, one-time, honor-pricing via a Gumroad link. No license key, no gating code, no free-tier-cap logic.** This is exactly the PRD §7 v1 recommendation — implementing it means doing nothing extra, not adding anything.

## Why no gating

VS Code Marketplace has no native paywall, so a real price enforcement needs either (a) a shared rate-limited dev-provided key for a free trial + license-key validation on the paid path, or (b) ship it fully free/functional and ask for payment on the honor system. Option (a) is real extra build/maintenance surface (key issuance, validation logic, revocation-less signed tokens) for a $12 one-time-purchase product with no backend otherwise. Option (b) costs zero extra code. Given this repo's whole thesis is "no backend, zero COGS," (b) is the only option consistent with the product itself.

## Why $12 specifically — anchored against real comparables

Searched for actual shipping products doing the same job (screenshot/image → code, bring-your-own-API-key, no server-side proxy):

| Product | Platform | Price | Model |
|---|---|---|---|
| **Pixel — Vision to Code** | Chrome extension | **$14.99** one-time | 5 free conversions, then pay once, BYO key (Claude/GPT-4o/Gemini) |
| **Spec Coder** | VS Code extension | **$9.99** one-time (Gumroad) | BYO API key, AI coding assistant features |
| Superflex | VS Code extension | $12/mo (subscription) | Figma-to-code, codebase-aware — different segment (subscription, team features), not a one-time-purchase comparable |
| SnapCode AI / Jinx | VS Code extension | Free on Marketplace | Paste-image-as-code, BYO key — no purchase at all, monetizes nothing |

The two real one-time-purchase BYOK comparables (Pixel, Spec Coder) bracket **$9.99–$14.99**. The PRD's original $12 sits right in that band — not picked from nothing, and not re-derived here just to look busy. **Keeping $12.**

## What ships

- No `licenseKey` setting, no machine-id tracking, no free-use counter.
- README's Pricing section (above) states the extension is free/unlocked, with a one-time $12 "if this saved you time" link.
- The Gumroad link itself is **not live** — there is no Gumroad account for this project in this environment, so the README/launch copy reference it as a placeholder (`<gumroad-link-tbd>`) rather than a working URL. Creating the actual Gumroad listing is a 10-minute manual task for whoever owns payment credentials; nothing in the code depends on it existing.

## Revisit trigger

Per PRD §12: if 30 days post-launch produce fewer than 5 total honor-payments despite 100+ installs, that is a distribution-fit signal, not a pricing signal — don't respond by adding a gate; investigate positioning/distribution first.
