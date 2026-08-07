# ŪPIRI — Precision Pulmonary Care

Awareness and self-management tools for the ŪPIRI lung programme: risk check, breath
score / lung age, the nodule journey, the Rendo Ūpiri quit challenge, condition clubs,
symptom triage, the allergy calendar and the Shikhar altitude assessment.

Two things live in this repo:

| | |
|---|---|
| **React app** | `src/` — Vite + React + Tailwind, served at `/` |
| **ŪPIRI 2.0 page** | `public/upiri-2.0.html` — the design-team export, served at `/upiri-2.0.html` |

## Running it

```bash
npm install
npm run dev      # http://localhost:5173  (and /upiri-2.0.html)
npm run build    # -> dist/
npm run preview  # serve the build
npm run lint
```

`public/upiri-2.0.html` is self-contained apart from `public/support.js`, so it also opens
straight from disk (`file://…/public/upiri-2.0.html`) with no server.

## The ŪPIRI 2.0 page

`upiri-2.0.html` is a design-context export, not hand-written HTML. Its markup uses
`sc-if` / `sc-for` control-flow elements with `{{ path }}` bindings, and its behaviour ships
as a `<script type="text/x-dc">` class extending `DCLogic`. The exporter expects a
`support.js` alongside the page to supply that base class and render the template —
`public/support.js` is that runtime. It handles:

- `{{ path }}` in text and attributes; `style="{{ obj }}"` React-style style objects
- `style-hover="…"` hover overlays, `onClick` / `onChange` handlers, `value` bindings
- `<sc-if>` / `<sc-for>`, `<helmet>` hoisting into `<head>`
- in-place DOM patching, so typing, focus and running CSS animations survive a re-render

Screens are linkable for review via the export's own props, e.g.
`upiri-2.0.html?startScreen=triage` (`home`, `risk`, `breath`, `journey`, `rendo`, `triage`,
`clubs`, `club`, `allergy`, `case`, `shikhar`, `doctors`, `corporates`, `schools`), plus
`?showDemoControls=false` and `?confetti=false`.

Two edits were made to the raw export so it runs as a real page: the template markup is
wrapped in an inert `<template data-dc-template>` (otherwise the browser tries to parse
`{{ … }}` as SVG geometry and logs errors while loading), and a small-screen stylesheet was
appended to the export's own `<helmet>` block, since the design is authored for a desktop
canvas with inline styles only. Re-exports need the same two edits.

## Before launch

- `WHATSAPP_NUMBER` in `src/config.js` and the `wa.me/91XXXXXXXXXX` link in
  `upiri-2.0.html` are placeholders — set the real ŪPIRI booking line in both.
- `BRAND_TAGLINE_TE` is a placeholder pending brand-team confirmation.
- The tools are awareness aids, pending clinical validation and medico-legal sign-off.
