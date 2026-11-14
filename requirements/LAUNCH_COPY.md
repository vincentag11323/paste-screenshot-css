# Launch Copy (drafts — nothing below has been posted anywhere)

All of this is a draft for a human to review, edit, and post manually.
No API calls, no scheduled posts, no accounts were touched to produce this.
The `<gumroad-link-tbd>` placeholder is not a real URL — see
`requirements/PRICING_DECISION.md` for why.

## Product Hunt listing

**Tagline:** Screenshot → working HTML/CSS, right at your cursor in VS Code.

**Description:**

Paste Screenshot as CSS turns any screenshot sitting on your clipboard into
HTML/CSS (or Tailwind, or inline styles) inserted directly at your cursor —
one keystroke, no browser tab, no upload.

Copy a Figma frame, a mockup, a screenshot of someone else's site — press
`Cmd+Shift+V` in VS Code — get back usable markup in a few seconds. Not
happy with the first pass? Run "Regenerate with more detail" on the same
image.

Bring your own Cent AI API key. No account, no backend, no subscription,
no telemetry — the extension never sees your screenshots or your code; it's
a thin client straight from your clipboard to your own API key. Free and
fully functional on the Marketplace; pay once (honor pricing, no gate) if
it saves you real time.

**First comment (from the maker account):**

I kept getting handed Figma screenshots and spending 20-30 minutes
eyeballing paddings and hex codes before I even got to real logic. Built
this to kill that specific tax. It's deliberately narrow — one job, done
in-editor, no dashboard to tab into. Bring your own key, I never see your
data. Happy to answer anything about the build (it's a solo 7-day build,
AMA).

## Twitter/X thread (4 tweets)

**1/** I was tired of manually recreating every Figma screenshot as
HTML/CSS by hand. So I built a VS Code extension that does it in one
keystroke. Screenshot → `Cmd+Shift+V` → working markup at your cursor.
Here's the whole flow: [attach: requirements/demo/hero.gif]

**2/** Every "AI screenshot to code" tool I found is either a $20-40/mo
SaaS dashboard or routes your screenshot through someone else's server.
This one's a plain VS Code extension — bring your own API key, it talks
directly to the provider, I never see your screenshots or your code.

**3/** If you're a freelancer who gets "just make it look like this
screenshot" from a client every week, this is for you. Three output
flavors (Tailwind / plain CSS / inline styles), a "regenerate with more
detail" button for when the first pass is too shallow. Free to use, pay
once if it saves you time: <gumroad-link-tbd>

**4/** (post next day if there's traction) Here's it handling a messier,
real-world screenshot — not a cherry-picked clean Figma export. [attach a
side-by-side from requirements/demo/]

## Subreddit post draft (r/vscode)

**Title:** I built a VS Code extension that turns a clipboard screenshot into HTML/CSS at your cursor

**Body:** Built this for my own freelance work — I kept getting Figma
screenshots/mockups from clients and burning 20-30 minutes manually
recreating them as markup before I could even start on real logic. It's a
small VS Code extension: copy a screenshot, press `Cmd+Shift+V`, get back
HTML/CSS (or Tailwind, or inline styles — pick once, remembered after) at
your cursor, indentation-matched and undoable like any normal edit. Bring
your own Cent AI API key — no account, no backend, no subscription, and the
extension never sees your screenshots or code since it talks straight to
the API from your machine. There's a "regenerate with more detail" command
if the first pass comes back too shallow. macOS only for now (clipboard
image reading is the platform-fragile part). It's free and fully
functional; I'm asking for a one-time $12 honor payment if it actually
saves you time, no gate, no pressure either way. Would genuinely appreciate
feedback from anyone who tries it on their own messy real-world screenshots
rather than a clean demo.
