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
npm run build  # prerender every route into dist/ (~30s)
npm run lint
```

Vercel runs `npm run vercel-build`, which is `npm run build` with a
`playwright install chromium` in front of it — the build image ships the Playwright
package but not its browser, and without that step the prerender cannot launch one.
The prerender drops every request that is not to its own local server, so no webfont,
thumbnail or third-party outage can slow the build down or fail it.

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
| `/asthma-control-test`, `/copd-assessment-test` | ACT, and CAT + mMRC, scored in the waiting room |
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

## The homepage

The page opens with the question the patient already has, in their own words, rather than
with categories of information. Hero: **ŪPIRI** → *Yashoda Pulmonology · Precision and
Personalized Pulmonary Care* (one bordered institutional lockup) → "Not breathing right?
Let's find out why." Then
**"What brings you here today?"** and six questions, each leading straight into the ŪPIRI
experience that answers it:

| Question | Next step |
|---|---|
| I've been coughing for a while… | symptom checker, **cough already ticked** |
| I feel breathless… | symptom checker, **breathlessness already ticked** |
| I have asthma. Am I really in control? | the **Asthma Control Test** (ACT) |
| I have COPD… | the **COPD Assessment Test** (CAT) |
| My scan showed a lung nodule… | the nodule journey |
| I want to understand my lungs better… | the risk check |

`QUESTIONS` holds the text; `renderVals` maps each `k` to its action, so changing a question
or where it leads is one line.

Section order follows *need → next step → depth*: questions, then the pulmonologists and the
patient tools, then the procedure list, and only then the directories (conditions, tests).
On a phone the hero's decorative lung stage and drifting dust are hidden and the chip row
scrolls horizontally, so "What brings you here today?" reaches the first screen instead of
sitting a screen and a half down.

**Procedures we perform** is an SEO block: the nine `PROCEDURES` as indexable text — real
name, a plain-language line and each entry's `kw` search terms — linking to the procedure
pages, and declared in the homepage JSON-LD as an `ItemList` of `MedicalProcedure`.

**Find a pulmonologist near you** lists all fifteen consultants grouped by unit (Hitec City,
Secunderabad, Somajiguda, Malakpet) in collapsible panels. Phones start every unit collapsed
so the section is four rows rather than a long scroll; wider screens open the first unit.

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
| `QUESTIONS` | The homepage "What brings you here today?" cards |
| `ACT`, `CAT`, `MMRC` | The waiting-room questionnaires — items, options and bands |
| `ACHIEVEMENTS` | Institutional achievement chips under the hero — **empty, TODO** |
| `TOPIC_GROUPS` | The homepage "Conditions we treat" directory |
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

The Yashoda mark **turns continuously** in the navbar — `markSpin`, one linear infinite
rotation, no easing and no hover variation, transform-only so it stays on the compositor.

## Navigation

Every top-level item navigates on click. Only **Tools** and **Profile** open a menu, and
each of their entries is a real destination — nothing in the bar is a label that looks
tappable and then does nothing.

| Item | Goes to |
|---|---|
| Explore Care | `/knowledge-hub` — conditions, articles, videos, guides |
| Doctors | `/doctors` — the specialist finder |
| Tests & Procedures | `/tests-and-procedures` |
| Tools ▾ | the eight patient experiences (risk check, symptom checker, lung age, nodule journey, breath clubs, allergy calendar, Rendo Ūpiri, Shikhar) |
| Profile ▾ | People `/` · Doctors `/for-doctors` · Corporate `/for-corporates` · Schools `/for-schools` |

**Profile** replaced the old space `<select>`, and absorbed the former *For Doctors* menu:
the Clinical Network and Case of the Month now sit on the doctor space page itself, so each
piece of content has exactly one home.

One pill, three widths:

- **≥1151px** — ŪPIRI lockup · Yashoda lockup · nav items · Profile · language · Book.
- **901–1150px** — the Yashoda lockup drops out first, since it costs the most width.
- **≤900px** — a phone toolbar: menu button on the left, **ŪPIRI centred in the pill**, and
  the **Yashoda mark plus the Book CTA on the right**. Nav items, Profile and the language
  button move into the sheet behind the menu button, which also carries the full Yashoda
  lockup. Below 520px the ŪPIRI lockup stacks (ŪPIRI over ఊపిరి); below 380px the Book CTA
  becomes its icon (`font-size:0`, so its name survives in the accessibility tree) rather
  than the brand giving up the centre.

The centring is `left:50%` + `translate(-50%)` measured **on the pill**, not the leftover
flex space, so the lockup holds its position however wide the menu button, the CTA or the
translated labels become — verified at 360/375/393/412/430/768/820px, menu open and closed,
in every language.

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

## Accessibility

- Keyboard: every control is a real `button`/`a`, and `:focus-visible` draws one explicit
  3px marigold ring outside the control — the browser default was easy to lose against the
  glass surfaces. Escape closes any open menu.
- Touch: sheet rows and chips carry a 44px minimum height.
- Contrast: every text/background pair on the flat surfaces meets WCAG AA, verified by
  computing the ratio for each rendered text node. The palette was adjusted to get there —
  secondary ink `#8A88B8→#6966A4`, sub-copy `#6C6A9E→#69679C`, card CTAs `#B35A08→#A95508`,
  and the status colours `#2F8F5B→#27784C`, `#C98A00→#916300`, `#CE4438→#BE3A2F`. Text over
  the hero gradient is checked by hand against its darkest and lightest stops; the ŪPIRI
  wordmark is exempt as logotype (WCAG 1.4.3).
- Nothing depends on hover: menus open on click, and every top-level nav item navigates.

## Waiting-room questionnaires

`/asthma-control-test` (ACT, 5 items, 5–25) and `/copd-assessment-test` (CAT, 8 items, 0–40)
are meant to be filled in the lobby and shown to the clinician in the room. Each ends in a
score, its band, what that band means, and a bordered **"Show this to your doctor"** panel
listing every item with the answer given, the instrument name, the date and the total. The
previous score is kept in `localStorage`, so the result also says how today compares.

The COPD page carries a second instrument below the CAT block: the **mMRC Dyspnoea Scale**,
one question graded 0–4. It answers on the spot — a single question needs no submit step —
and its grade joins the CAT total in the doctor panel, which is how the two are read in
clinic. `MMRC` holds the grade wording and the plain meaning for each.

`ACT`, `CAT` and `MMRC` at the top of the component hold the items, the option wording and
the bands — scoring is `sum(answers)` for ACT and CAT, and the band is the first whose `min`
the score reaches.

Two rules about these two arrays:

- **The items are reproduced verbatim and are never translated.** A home-made translation of
  a validated instrument is not the validated instrument; official translations are licensed
  separately. Their strings are deliberately absent from `I18N`, and the language switch
  leaves them in English.
- **Licensing is a TODO before launch** — see the comment above `ACT`. The Asthma Control
  Test is a QualityMetric trademark; the COPD Assessment Test is © GSK, which permits
  clinical use unmodified and with the copyright notice shown. Both notices render on their
  pages. Confirm the ACT position with the rights holder before this goes live. The mMRC
  scale carries no such restriction — it descends from the Medical Research Council
  breathlessness scale and is in general free use.

## Open TODOs in the code

Two things are deliberately blank rather than filled with plausible copy:

- `ACHIEVEMENTS` (top of the component) — the hero chips. The three that stood there
  ("AI second read on every X-ray", "Priority nodule appointment", "MDT Nodule Board
  review") were removed as unsourced. The row renders nothing while the array is empty.
  It also carries a second TODO: the cone-beam CT claim needs its scope confirmed —
  "South India's first" vs "India's first" — and its exact modality wording, before it
  goes anywhere near the page.
- `footerUnits` — the footer lists the four unit names, which are sourced from the doctor
  roster, but each unit's address line is empty pending real addresses.

## Before launch

- **The `wa.me/91XXXXXXXXXX` link is a placeholder.** Every "Book" CTA opens WhatsApp against
  a number that does not exist — and the homepage is now built end to end around giving the
  patient a next step, so this is the single most damaging gap left. One constant in `wal()`
  in `public/index.html`; the same placeholder lives in `src/config.js` as `WHATSAPP_NUMBER`.
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
