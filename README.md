# ŪPIRI — Precision Pulmonary Care

Awareness and self-management tools for the ŪPIRI lung programme: risk check, breath
score / lung age, the nodule journey, the Rendo Ūpiri quit challenge, condition clubs,
symptom triage, the allergy calendar and the Shikhar altitude assessment.

## What gets deployed

The site is **static**: Vercel serves `public/` as-is, with no build step (see
`vercel.json`). `public/index.html` is the ŪPIRI 2.0 page and `public/support.js` is its
runtime; `/upiri-2.0.html` redirects to `/` so the earlier link keeps working.

The React app under `src/` is the previous (v2) implementation. It is **retired from the
deploy** — kept in the repo for reference and history, but no longer built or served.

```bash
npm install
npm run dev    # http://localhost:5173 — serves public/
npm run lint
```

`public/index.html` loads `/support.js` from the site root, so it needs to be served over
HTTP rather than opened straight from disk.

## Routes

Every screen has a real URL. `vercel.json` rewrites unknown paths to `index.html`, and the
page reads `location.pathname` on load, pushes state on navigation and handles Back.

| Path | Screen |
|---|---|
| `/` | Home |
| `/risk-check`, `/lung-age`, `/nodule-journey`, `/rendo-upiri` | Existing tools |
| `/symptom-checker`, `/clubs`, `/allergy-calendar`, `/case-of-the-month`, `/shikhar` | Existing tools |
| `/for-doctors`, `/for-corporates`, `/for-schools` | Existing spaces |
| `/alumni` | ŪPIRI Clinical Network |
| `/knowledge-hub` | Yashoda Knowledge Hub |
| `/knowledge-hub/:topic` | Knowledge Hub topic detail (18 topics) |

`?startScreen=<name>` still works as a review override, and each route sets its own
`<title>` and meta description.

## The ŪPIRI 2.0 page

It is a design-context export, not hand-written HTML. Its markup uses `sc-if` / `sc-for`
control-flow elements with `{{ path }}` bindings, and its behaviour ships as a
`<script type="text/x-dc">` class extending `DCLogic`. The exporter expects a `support.js`
alongside the page to supply that base class and render the template — `public/support.js`
is that runtime. It handles:

- `{{ path }}` in text and attributes; `style="{{ obj }}"` React-style style objects
- `style-hover="…"` hover overlays, `onClick` / `onChange` handlers, `value` bindings
- `<sc-if>` / `<sc-for>`, `<helmet>` hoisting into `<head>`
- in-place DOM patching, so typing, focus and running CSS animations survive a re-render

Screens are linkable for review via the export's own props, e.g. `/?startScreen=triage`
(`home`, `risk`, `breath`, `journey`, `rendo`, `triage`, `clubs`, `club`, `allergy`,
`case`, `shikhar`, `doctors`, `corporates`, `schools`), plus `?showDemoControls=false`
and `?confetti=false`.

Two edits were made to the raw export so it runs as a real page: the template markup is
wrapped in an inert `<template data-dc-template>` (otherwise the browser tries to parse
`{{ … }}` as SVG geometry and logs errors while loading), and a small-screen stylesheet was
appended to the export's own `<helmet>` block, since the design is authored for a desktop
canvas with inline styles only. **Re-exports need the same two edits.**

## Content data

Both new sections are data-driven — the card markup is written once and repeated with
`sc-for`, so content changes never touch the UI. The arrays live at the top of the
`<script type="text/x-dc">` block in `public/index.html`:

| Array | Feeds |
|---|---|
| `NET_WHY` | Clinical Network "Why join?" cards |
| `REFER_TRIGGERS` | "Know when to refer" clinical cards |
| `COUNCIL_ROLES` | Clinical Council placeholder profiles |
| `ALUMNI_ENGAGE` | Network engagement cards |
| `KH_TOPICS` | Topic grid **and** every topic detail page |
| `KH_ARTICLES`, `KH_VIDEOS`, `KH_CASES` | Article / video / case libraries, related lists, search |
| `KH_ICONS` | Shared stroke icons, reused across topics |

Adding an article is one entry in `KH_ARTICLES`; adding a condition is one entry in
`KH_TOPICS` and its detail page, related content and search entry all follow.

## Before launch

- The `wa.me/91XXXXXXXXXX` link in `public/index.html` is a placeholder — every "Book on
  WhatsApp" CTA is dead until the real ŪPIRI booking line is set. Same placeholder lives in
  `src/config.js` as `WHATSAPP_NUMBER`.
- `BRAND_TAGLINE_TE` in `src/config.js` is a placeholder pending brand-team confirmation.
- The tools are awareness aids, pending clinical validation and medico-legal sign-off.
- **Knowledge Hub topic text is a draft pending clinical review** by Yashoda Pulmonology;
  each topic page says so.
- Everything marked "Placeholder" needs real content: article bodies and dates, video URLs
  and expert names, full clinical cases, and Clinical Council member names.
- Knowledge Hub topic text is rendered client-side. For search-engine indexing of the 18
  topic pages, add a prerender step that writes static HTML per topic — see the SEO note in
  the commit history.
