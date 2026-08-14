# ŪPIRI — Precision Pulmonary Care

Awareness and self-management tools for the ŪPIRI lung programme: risk check, breath
score / lung age, the nodule journey, the Rendo Ūpiri quit challenge, condition clubs,
symptom triage, the allergy calendar and the Shikhar altitude assessment.

## What gets deployed

`npm run build` prerenders every route into `dist/`, which is what Vercel serves.
`scripts/prerender.mjs` loads `public/index.html` once per route in a real browser, waits for
the runtime to render, and writes the result — so each route ships its content, `<title>`,
meta description, canonical and JSON-LD in the initial HTML. The original `<template>` is
re-inserted into every file, so the page still hydrates into the full app on load: crawlers
get the text, users get the app.

Route list comes from the page's own data (`KH_TOPICS`, `DOCTORS`, `PROCEDURES`), so it
cannot drift. `/upiri-2.0.html` redirects to `/`.

The React app under `src/` is the previous (v2) implementation. It is **retired from the
deploy** — kept in the repo for reference and history, but no longer built or served.

```bash
npm install
npm run dev    # http://localhost:5173 — serves public/ unbuilt
npm run build  # prerender every route into dist/
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
| `/doctors`, `/doctors/:id` | Specialist finder and profiles (15 consultants) |
| `/tests-and-procedures`, `/tests-and-procedures/:id` | Tests & procedures (9) |
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
| `KH_SYMPTOMS`, `KH_CATEGORIES`, `KH_SUGGESTED` | Intent-grouped search and the Knowledge Hub category bands |
| `TOPIC_GROUPS`, `ENTRY_POINTS` | Homepage "Explore pulmonary care" and "What brings you here?" |
| `DOCTORS` | Specialist finder, profiles, and condition/procedure cross-links |
| `PROCEDURES` | Tests & procedures pages, with `dp` matching doctors who perform them |
| `LANGS`, `I18N` | The language chooser and every translated string (see below) |

Adding an article is one entry in `KH_ARTICLES`; adding a condition is one entry in
`KH_TOPICS` and its detail page, related content and search entry all follow.

## Brand

ŪPIRI is a Yashoda Hospitals service, so the Yashoda identity sits beside the ŪPIRI mark in
the navbar and footer and on both doctor-facing sections.

| File | Used for |
|---|---|
| `public/yashoda-mark.png` | the flower mark — navbar, section headers, cards |
| `public/yashoda-logo.png` | the full lockup — footer and doctor-facing headers |
| `public/favicon.svg` | the ŪPIRI lungs mark (browser tab) |
| `public/og-image.png` | 1200×630 share image |

On boot the page probes for the mark and only swaps the text lockup for the image once it
has actually loaded, so a missing or renamed file can never render broken in production.
`BRAND` at the top of the component holds the filenames, the name and the unit.

## Navigation

One pill, three widths:

- **≥1151px** — ŪPIRI lockup · Yashoda lockup · grouped menus · space selector · language ·
  Book.
- **901–1150px** — the Yashoda lockup drops out first, since it costs the most width.
- **≤900px** — a phone toolbar: menu button on the left, **ŪPIRI centred in the pill**, and
  the **Yashoda mark plus the Book CTA on the right**. The grouped menus, the space selector
  and the language button move into the sheet behind the menu button, which also carries the
  full Yashoda lockup. Below 520px the ŪPIRI lockup stacks (ŪPIRI over ఊపిరి); below 360px
  the brand centres in the space it has rather than in the pill, so it can never collide.

The centring is measured against the pill itself rather than against whatever happens to sit
either side, so it holds as labels change length between languages.

## Videos

`KH_VIDEOS` maps topics to YouTube videos via a `yt` video id. `ch` names the source
channel and defaults to Yashoda; entries with `ext: true` come from another institution
(Mayo Clinic, Cleveland Clinic) and render an **External source** tag so they are never
mistaken for Yashoda's own content. Entries without a `yt` render an "In preparation" /
"Video in production" card. Coverage today: 16 of 18 topics — 24 Yashoda videos plus 7
external.

Cards show the real YouTube still (`i.ytimg.com/vi/<id>/hqdefault.jpg`) with a play button,
and load the player **only when the viewer clicks** — the facade pattern. No YouTube script
runs on page load, and the player uses `youtube-nocookie.com`. Only one video plays at a
time (`khPlaying` state). If the thumbnail CDN is unreachable the card falls back to the
brand indigo rather than a blank box, and a "YouTube" link is always present as a fallback.

## Reading language

English, తెలుగు, ಕನ್ನಡ and বাংলা. The choice lives in the navbar on desktop and in the menu
sheet on phones, and is remembered in `localStorage` and reflected in the URL (`?lang=te`),
so a link can be shared in the language it was read in. `<html lang>` follows the choice, and
the matching Noto face is fetched **only** when a reader actually picks that language —
English pays nothing for the Indic fonts.

How it works: the page is authored in English, `I18N` in `public/index.html` holds the
translations keyed by the exact English string, and `public/support.js` runs every string
through the installed translator on its way into the DOM. That covers static markup, `{{ }}`
values and the reader-facing attributes (`aria-label`, `placeholder`, `title`, `alt`) without
the template being rewritten, and **a string with no entry simply stays in English** rather
than breaking. Adding a translation is one line in `I18N`; no markup changes.

What is covered: navigation, buttons, headings, prompts, filters, condition names in common
use, and the safety notices. What is **not**: clinical body copy. A wrong word in a symptom
list or a treatment description is a patient-safety problem, so that text stays in English
until a Yashoda clinician signs the wording off — the language menu says exactly that, and
offers Google's translation proxy for the whole page as an explicit, labelled choice.

Each route also advertises its language variants with `rel="alternate" hreflang` links (en,
te, kn, bn and `x-default`), while the canonical stays language-neutral.

**The translations themselves are pending review** by Yashoda Pulmonology alongside the
English text.

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
- **The Telugu, Kannada and Bengali strings need a review pass** by a clinician or a
  language reviewer at Yashoda before launch, the same as the English copy.
- **The YouTube video ids need one spot-check pass.** They were sourced by web search;
  YouTube is unreachable from the build environment, so none was opened and confirmed.
- Two topics still have no video: **CPET / exercise testing** and **occupational lung
  disease** — no suitable video found from Yashoda, Mayo or Cleveland.
- No real photography anywhere yet — every visual is drawn in SVG or CSS.
