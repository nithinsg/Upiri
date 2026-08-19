# CLAUDE.md — ŪPIRI

Permanent project instructions. Read this before touching anything.
Full current state, verified against the repo: **`docs/UPPI_PROJECT_STATE.md`**.

ŪPIRI is the pulmonary platform of **Yashoda Hospitals, Hyderabad**. Real patients will
read it. Live at <https://upiri.vercel.app>.

---

## The six things most likely to trip you up

0. **Set inputs on Uppi's state machine; never call the motion layer directly.**
   `states.set('isListening', true)`, not `motion.startListening()`. The machine is
   the only thing that talks to the rig, and that is what keeps his face from
   contradicting his advice.
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
public/uppi/core/      SHARED with api/ — engine, triage, red flags, knowledge, safety
api/uppi/              three Vercel Node serverless functions
test/                  the committed suite — `npm test`
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
| `avatar.js` | Runtime-generated SVG rig, viewBox `0 0 372 660`. No image file exists. |
| `motion.js` | WAAPI: run-in, land, wave, idle, curious, tired, sleeping, visemes. |
| `states.js` | **18 states driven by runtime inputs**, not by direct calls. See below. |
| `presence.js` | Scroll, pointer, inactivity, doze and wake. Sets inputs only. |
| `speech.js` | TTS + STT, browser-first with a replaceable server fallback. |
| `conversation.js` | Turns, client-side red-flag pre-check, `sessionStorage` only. |
| `chat.js` | Dock, greeting bubble, panel, CTAs, accessibility. |
| `core/engine.js` | **`assess(messages)` — the whole pipeline, shared browser↔server.** |
| `core/redflags.js` | 10 emergency rules, with negation and hypothetical guards. |
| `core/symptoms.js` | Symptoms, denials, duration, severity, onset, triggers, exposure. |
| `core/state.js` | **The conversation state and the question ledger.** See below. |
| `core/intents.js` | The §13 taxonomy. Names what is being discussed, never a diagnosis. |
| `core/triage.js` | 26 rules → `emergency`/`urgent`/`doctor`/`insufficient`/`routine`. |
| `core/knowledge.js` | **The entire medical content surface.** 17 guideline-cited entries. |
| `core/safety.js` | The output gate. |
| `core/contact.js` | Phone numbers and booking path — single source. |

### The behaviour machine — set inputs, never states

`states.js` resolves runtime inputs (`isTalking`, `isListening`, `isThinking`,
`emotion`, `attention`, `energy`, `isUrgent`, `isAppointment`, `userInactive`,
`scrolling`, and the one-shot `trigger*`) into one of 18 states. **Callers set
inputs; only the machine picks a state, and only the machine talks to the rig.**

```js
chat.states.set('isListening', true);   // right
chat.motion.startListening();           // wrong — bypasses the machine
```

Read `target()` in `states.js` top to bottom and you have the complete
description of what Uppi does in any situation. Those input names are chosen to
map onto Rive state-machine inputs, so the `.riv` swap stays a one-file change.

### The question ledger — why he does not repeat himself

`core/state.js` holds the structured state (§9) and two things that make the
conversation a conversation:

- **A slot is filled by a yes OR a no.** "The cough is dry" answers the phlegm
  question as firmly as "green phlegm" does. Denials come from `matchPatterns`
  in `redflags.js`, which reports assertion and denial separately.
- **`questionsAlreadyAsked`** is rebuilt deterministically by replaying the
  selection over the conversation prefix, and cross-checked against the
  `echoes` of each question so a model-rephrased question still counts.

A question is offered only when its slot is empty **and** it has never been
asked. `nextQuestion` returning `null` is correct, not a gap: a conversation
that knows enough should act rather than keep interrogating.

Likewise `compose.js` never sends a paragraph twice — `selectTeaching` consults
a ledger of what has already been said, and returns `null` when the relevant
material is spent.

**To change what Uppi knows, edit `core/knowledge.js`'s `ENTRIES` array.** Nothing else
reads clinical content from anywhere else.

**`public/uppi/core/` is imported by both the browser and `api/uppi/chat.js`.** A change
there ships to both. That is deliberate — the triage rules must exist exactly once.

### The character asset

There is **no PNG, SVG file or Rive board**. `build()` in `avatar.js` generates the rig
at runtime, built to the approved reference render in a viewBox of `0 0 372 660` — the
reference's own proportions. The landmarks are listed in a comment above the geometry
(trachea, lung mass, eyes, mouth, shoulders, hem, hips, ground); keep a change in
register with them. He is **taller than he is wide**, so `.uppi-stage` is sized by a
width chosen to land his HEIGHT where the page was designed for him — sizing him by
width alone had him rising a third of the way up the hero. Everything above it talks only through `setMouth` / `setViseme` / `setEyes` /
`setLids` / `blink` / `look` / `setBrows` / `setExpression` / `setPose` and the `parts`
map, so replacing `build()` swaps in a real rigged asset without touching another file.
Keep that boundary intact.

**Arms hold poses, not one fixed shape.** `setPose('right', 'wave' | 'rest' | 'hip' |
'point')` and `setPose('left', 'hip' | 'rest' | 'chin')` switch between pre-built groups.
The default idle is `left: hip, right: rest`. The old rig drew the right arm permanently
raised, which is why Uppi appeared to wave forever — it was the geometry, not the
animation. Do not reintroduce a raised default.

Two SVG traps this rig has already hit:

- **`hidden` does nothing on SVG elements** — it is an HTML global attribute. Use
  `style.display`. Every arm pose was visible at once until this was found.
- **Gradient, clip-path and filter ids must be per instance.** Uppi is mounted twice
  when the panel is open, and duplicate ids make the second instance paint with the
  first one's definitions.

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

```bash
npm test              # 285 assertions across four suites (~90s)
npm test conversation # one suite by name
```

`test/` has no dependencies beyond Playwright, which the prerender already needs.

| Suite | What it pins |
|---|---|
| `core.test.mjs` | Red flags with their negation and hypothetical guards, duration parsing, extraction including denials, every triage band, retrieval, the safety gate. |
| `conversation.test.mjs` | The six conversations in §30 of the brief, plus the properties that must hold across all of them: no repeated question, no repeated paragraph, nothing forgotten, one question per reply. |
| `rig.test.mjs` | The ten visemes, the digraph mapping, the schedule, and the approved palette. |
| `browser.test.mjs` | Real Chromium: entrance, **that he stops waving**, blinking, scroll, the curious→tired→sleeping ladder, waking, the nudge cooldown, a two-turn conversation, the offline emergency path, all seven widths, reduced motion, and zero console errors. |

`test/_server.mjs` mounts the real `api/uppi/*` handlers next to `public/`, so the
browser suite exercises the deployed code rather than a mock.

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
2. `npm test` — must report `all suites passed` (285 assertions)
3. `npm run build` — must report `prerendered 62/62 routes`
4. Load a **non-homepage** route (`/knowledge-hub`, `/doctors`) and confirm it renders
5. Confirm no Uppi markup is baked into `dist/index.html`:
   `grep -c "uppi-root" dist/index.html` → `0`

The browser suite already covers the seven widths, the offline emergency path and the
console, so step 2 replaces most of what used to be a manual pass.
