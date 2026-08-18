# CLAUDE.md — ŪPIRI

Permanent project instructions. Read this before touching anything.
Full current state, verified against the repo: **`docs/UPPI_PROJECT_STATE.md`**.

ŪPIRI is the pulmonary platform of **Yashoda Hospitals, Hyderabad**. Real patients will
read it. Live at <https://upiri.vercel.app>.

---

## The five things most likely to trip you up

1. **This is not React.** The site is one 5,955-line `public/index.html` rendered by a
   custom runtime in `public/support.js`. `react`/`vite`/`tailwind` in `package.json`
   belong to the retired `src/` app. Do not import them, do not "modernise" the site.
2. **`public/index.html` is a single file with no build step.** A careless line-range
   edit has already broken every non-homepage route once (nested `<section>` elements
   inside the care hub). Match tags in a balanced way and verify a non-homepage route
   after any structural change.
3. **Uppi's medical decisions are made by rules, not the LLM.** See below. Do not
   "simplify" by letting the model decide urgency.
4. **`vercel.json` and `package.json` scripts contain three fixed traps.** Never re-add
   `cleanUrls`; never rename `build:vercel` back to `vercel-build`; never add a
   `functions` block; keep `Permissions-Policy: microphone=(self)`; keep the `/api/`
   exclusion in the SPA rewrite.
5. **Rebase onto production before starting work** (see Git below), or every PR conflicts.

---

## Architecture

```
public/index.html      the entire site — markup, data arrays, component logic
public/support.js      the dc template runtime ({{ }}, sc-if, sc-for, in-place patching)
public/uppi/           Uppi, the lung companion (browser)
public/uppi/core/      SHARED with api/ — triage, red flags, knowledge, safety
api/uppi/              three Vercel Node serverless functions
scripts/prerender.mjs  Playwright prerender of 62 routes into dist/
src/                   RETIRED React v2. Not built, not served. Leave it alone.
```

### The design-context (dc) format

Markup lives inside `<x-dc>` with `<sc-if value="{{ cond }}">`,
`<sc-for list="{{ a }}" as="o">` and `{{ path }}` bindings. Logic is a
`<script type="text/x-dc">` block containing `class Component extends DCLogic`, whose
`renderVals()` returns the object the template binds against. Content changes belong in
the data arrays (`DOCTORS`, `PROCEDURES`, `KH_TOPICS`, `QUESTIONS`, `I18N`, …), never in
the markup.

`<template data-dc-template>` at line 265 is a **required** local edit over the raw
export — without it the browser parses `{{ … }}` as SVG geometry. `scripts/prerender.mjs`
re-inserts it into every written file so prerendered pages stay hydratable.

---

## Uppi

An animated lung character who runs in from the right on load, greets the visitor, and
holds a triage conversation. **He is the chat button** — no bubble icon.

### The pipeline — this is the spine, do not rearrange it

```
message → normalise → RED FLAGS → symptom extraction → conversation memory
        → STRUCTURED TRIAGE → knowledge retrieval → model → SAFETY GATE → answer
```

The capitalised stages are deterministic code in `public/uppi/core/`. **Nothing medical
is decided by the model.** It receives the triage decision as a constraint and phrases it;
`core/safety.js` then reads the finished text and **discards it entirely** if it asserts
a diagnosis, rules one out, over-reassures, prescribes, claims to be a clinician, or
fails to convey an emergency. The model's one permitted decision is to **raise** urgency,
never lower it — and if it raises to emergency, its reply is thrown away and
`composeUrgent()` writes the copy.

Consequences you must preserve:

- **Red flags run in the browser first.** "I'm coughing blood" produces the 108 screen
  with no network, no key, no warm function. An emergency response that depends on a
  fetch succeeding is not an emergency response.
- **`ANTHROPIC_API_KEY` is optional.** Without it `core/compose.js` builds the answer
  from the triage decision and the curated knowledge base. That is the floor, not a stub.
- **The reply is not streamed.** A gate cannot validate unfinished text.

### Modules

| File | Role |
|---|---|
| `boot.js` | Lazy entry. Bails on `window.__UPIRI_NO_UPPI` (set by the prerenderer). |
| `avatar.js` | Runtime-generated SVG rig, viewBox `0 0 372 572`. No image file exists. |
| `motion.js` | WAAPI: entrance, run cycle, wave, idle, listening, thinking, visemes. |
| `states.js` | 11 states with declared transitions. |
| `speech.js` | TTS + STT, browser-first with a replaceable server fallback. |
| `conversation.js` | Turns, client-side red-flag pre-check, `sessionStorage` only. |
| `chat.js` | Dock, greeting bubble, panel, CTAs, accessibility. |
| `core/redflags.js` | 9 emergency rules, with negation and hypothetical guards. |
| `core/symptoms.js` | 14 symptoms + context, duration parsing, at-rest/exertion. |
| `core/triage.js` | 18 rules → `emergency`/`urgent`/`doctor`/`insufficient`/`routine`. |
| `core/knowledge.js` | **The entire medical content surface.** 17 guideline-cited entries. |
| `core/safety.js` | The output gate. |
| `core/contact.js` | Phone numbers and booking path — single source. |

**To change what Uppi knows, edit `core/knowledge.js`'s `ENTRIES` array.** Nothing else
reads clinical content from anywhere else.

**`public/uppi/core/` is imported by both the browser and `api/uppi/chat.js`.** A change
there ships to both. That is deliberate — the triage rules must exist exactly once.

### The character asset

There is **no PNG, SVG file or Rive board**. `build()` in `avatar.js` generates the rig
at runtime. Everything above it talks only through `setMouth` / `setEyes` / `blink` /
`look` / `setBrows` / `setExpression` and the `parts` map, so replacing `build()` swaps
in a real rigged asset without touching another file. Keep that boundary intact.

---

## Standing instructions from the product owner

These override your own judgement about what would be nice to write.

1. **No invented clinical claims. Ever.** Every achievement, "first", volume figure,
   outcome or procedure name must come from Yashoda's own published material or from him
   directly. If you cannot source it, **leave a clearly-marked TODO — never plausible
   copy.** `ACHIEVEMENTS = []` in `index.html` exists because of this rule; do not fill it.
2. **When asked for a rewrite, offer 2–3 options in chat** and put your best pick in the
   code. Do not silently choose.
3. **Do not break existing functionality.** Verify non-homepage routes after any change
   to `index.html`.
4. Uppi is a companion, not a chatbot. Never write "How can I assist you today?", never
   mention being an AI, never let him claim or rule out a diagnosis.

---

## Never do these

- Re-add `cleanUrls` to `vercel.json`.
- Rename `build:vercel` → `vercel-build` (Vercel would run the 62-route prerender twice).
- Add a `functions` block to `vercel.json` (one build per function — four passes).
- Change `Permissions-Policy` away from `microphone=(self)`.
- Remove the `/api/` exclusion from the SPA rewrite.
- Translate the ACT, CAT or mMRC wording, or add it to `I18N`.
- Render model output as `innerHTML`, or surface `raise_reason` to the UI.
- Put an API key anywhere under `public/`.
- Mount anything inside `<x-dc>` — the runtime patches its own subtree.

---

## Commands

```bash
npm run dev     # vite --root public → http://localhost:5173
npm run build   # prerender 62 routes into dist/ (~30s)
npm run lint    # oxlint — keep it clean
```

There is **no committed test suite**. The 263 assertions that validated the Uppi build
ran from scratch harnesses that were deleted before commit. Recreating them under
`test/` is the highest-value outstanding task — see `docs/UPPI_PROJECT_STATE.md` §26 for
the specific regressions worth pinning.

---

## Git

```
dev:   claude/publish-html-repo-hcls2s
prod:  claude/file-access-request-jqxrqt   ← Vercel deploys this
```

PRs are **rebase-merged**, so after each merge the dev branch carries commits whose
content is already on production under different SHAs. Before starting new work:

```bash
git fetch origin claude/file-access-request-jqxrqt
git reset --soft origin/claude/file-access-request-jqxrqt   # trees are identical
```

Push with `git push -u origin claude/publish-html-repo-hcls2s`. Only open a PR when asked.

---

## Verifying a change

1. `npm run lint`
2. `npm run build` — must report `prerendered 62/62 routes`
3. Load a **non-homepage** route (`/knowledge-hub`, `/doctors`) and confirm it renders
4. For Uppi changes, check 320px and 1440px, and confirm the emergency path with the
   network offline
5. Confirm no Uppi markup is baked into `dist/index.html`:
   `grep -c "uppi-root" dist/index.html` → `0`
