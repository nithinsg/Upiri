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

`public/index.html` is self-contained apart from `public/support.js`, so it also opens
straight from disk (`file://…/public/index.html`) with no server at all.

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

## Before launch

- The `wa.me/91XXXXXXXXXX` link in `public/index.html` is a placeholder — every "Book on
  WhatsApp" CTA is dead until the real ŪPIRI booking line is set. Same placeholder lives in
  `src/config.js` as `WHATSAPP_NUMBER`.
- `BRAND_TAGLINE_TE` in `src/config.js` is a placeholder pending brand-team confirmation.
- The tools are awareness aids, pending clinical validation and medico-legal sign-off.
