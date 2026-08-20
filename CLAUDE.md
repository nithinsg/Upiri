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
1. **This is not React.** The site is one 7,300-line `public/index.html` rendered by a
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
api/uppi/              four Vercel Node serverless functions
test/                  the committed suite — `npm test`
scripts/prerender.mjs  Playwright prerender of 89 routes into dist/ — also WRITES sitemap.xml
scripts/check-html.mjs Structural check of index.html — run this FIRST, it is two seconds
scripts/artwork.mjs    the Knowledge Hub illustrations — `npm run artwork`
public/kh/             25 generated .webp images, committed
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
| `presence.js` | Scroll, pointer, inactivity, doze, wake, and the offers of help. |
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
| `core/contact.js` | Phone numbers, booking path and the call-back route — single source. |

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

**His mouth is CLOSED unless he is speaking.** The resting face is `grin`, a
closed warm smile; `soft`, `neutral`, `small` and `concerned` are the other
closed shapes. `smile` is drawn OPEN, with teeth and a tongue, and it was the
default for a while — the result was a character whose mouth hung open for the
entire session, which reads as vacant rather than friendly. Open shapes belong
to the visemes, which are driven by speech, and to the yawn. `browser.test.mjs`
asserts the resting shape is closed and that no tongue shows while he is silent.

Two SVG traps this rig has already hit:

- **`hidden` does nothing on SVG elements** — it is an HTML global attribute. Use
  `style.display`. Every arm pose was visible at once until this was found.
- **Gradient, clip-path and filter ids must be per instance.** Uppi is mounted twice
  when the panel is open, and duplicate ids make the second instance paint with the
  first one's definitions.

---

### Offering help, and offering to ring back

Two things Uppi does unprompted, both governed by restraint.

**The offers of help (§7, §8).** `presence.js` shows a bubble when someone has
been idle (`curiousAfter`, 46s) or has been *reading* — a scroll session that
survives the pauses a person takes, not unbroken scrolling. The first version
demanded 5.2s of continuous scrolling and therefore never fired for a real
reader; the reading-session model in `onScroll` is the fix, and
`browser.test.mjs` drives it on the real clock because no input-level test
catches that class of bug. Capped at two a session, behind a 95s cooldown, and
silent once a conversation starts. `DEFAULT_TIMING` is overridable via
`window.__UPPI_PRESENCE_TIMING`.

**The call-back request (§15).** When triage says someone should be seen, Uppi
offers to have the Yashoda team ring them: `setPose('right','phone')`, an offer
line from `callbackOffer()`, and a two-field form that POSTs to
`/api/uppi/callback`.

Three rules that must not be relaxed:

1. **Only name, phone, preferred time and the triage BAND leave.** Never the
   conversation, never the symptoms. The consent line under the form says so,
   and `browser.test.mjs` asserts the exact key set that reaches the
   destination.
2. **Nothing is logged.** Not on success, not on failure.
3. **No destination configured → the offer is not rendered at all.** `GET
   /api/uppi/callback` reports `configured`, and `chat.js` drops the CTA when it
   is false. A form that takes a worried patient's number and discards it is
   worse than no form. Same rule as the microphone.

In an **emergency** the ambulance is the first action and the call back is the
last, never a substitute for going now — pinned by a test on the action order.

### His voice, and the reader's language

`chat.js` had no idea what language the page was in: he greeted a Telugu reader
in English, in an English voice, every time. Three rules now hold.

1. **The language channel is `<html lang>`.** The page already writes the
   reader's choice there in `installTranslator`. Uppi reads it and watches it
   with a `MutationObserver`, so a mid-session switch lands immediately. No new
   global, and it survives a reload because the page restores the choice on boot.
2. **His own lines come from the same dictionary as the page.** `support.js`
   exposes `window.__dcTranslate`; `chat.js` calls it through `t()` and
   `local()`. He renders his own DOM outside the dc runtime, so this is the only
   way his wording and the page's wording cannot drift.
3. **The voice follows the TEXT, never the site setting alone.** `speakAs`
   resolves three cases: a translated line on a device with that voice is spoken
   in that language; a line with no translation is spoken in English; and a
   translated line on a device with *no* such voice is shown translated but
   **spoken from the English original**, because pushing Telugu script through
   an English voice produces syllable soup. `tts.canSpeak(code)` is the test.

`VOICE_PREFS` is gone; `scoreVoice` ranks candidates per locale and **prefers a
male voice by name** (the API exposes no gender), with `rate 0.98 / pitch 0.96`
for a warm young man. Pitch was 1.04, which lifted every voice towards boyish
and undid the point of picking a male one. `SpeechInput.setLanguage` moves the
recogniser too, so a Telugu speaker can use the microphone in Telugu.

**The Telugu for Uppi's lines is in `I18N.te`, flagged `TODO(yashoda)`: it has
not been reviewed by a Telugu-speaking clinician.** ACT, CAT and mMRC stay in
English — they are validated instruments, and `pages.test.mjs` excludes them
from the coverage check for that reason.

Four traps, each of which shipped a bilingual panel that looked fine in review:

1. **The keys must be the EXACT strings the code emits.** Straight `'` vs curly
   `’` is the obvious one; less obvious is that some literals are
   double-quoted, so a single-quote-only extractor misses them.
2. **`tx` in `support.js` TRIMS before looking up.** A key with a trailing
   space can never match. The dictionary is emitted trimmed.
3. **Translating the text is not enough — the RENDER SITE has to ask.** Chips,
   action buttons, the band chip, the alert heading, the panel chrome and the
   visitor's own echoed message each needed `this.t()` adding; the strings were
   in the dictionary the whole time and still came out English.
4. **A tapped chip is shown translated but SUBMITTED in English**, because the
   extractor's patterns are English. `addYou` re-translates it for display so
   the visitor's own message does not answer back in the wrong language.

Sentences Uppi assembles rather than writes — the verdicts, which wrap a
combining LIST of triage reasons — are handled by `UPPI_PATTERNS` in `chat.js`,
which translates the frame and sends each reason back through the dictionary.
Enumerating those as keys would mean one entry per combination.

**How to check a change, rather than eyeballing it:** the harvest scripts in
this session drove the real engine over ~20 openers x ~50 follow-ups and
collected every distinct sentence, chip, action and band. `pages.test.mjs` now
runs five conversations end to end and fails if ANY visible string is still in
Latin script. Add a line he says without its translation and that test goes
red.

### Knowledge Hub artwork

`public/kh/*.webp` are generated from `scripts/artwork.mjs` by `npm run artwork`
and committed, so a deploy never depends on the script having been run. Chromium
does the encoding through a canvas — there is no image tool in this environment,
and as 24-bit PNG the set came to 4.9 MB against 300 KB as WebP.

`KH_ART` in `index.html` lists which subjects have artwork. A subject that is
not listed keeps its old stroke icon (`sc-if` on `art` / `noArt`), so adding a
topic can never render a broken image. **Keep `KH_ART` and the SCENES in
`artwork.mjs` in step.**

These are illustrations, not photographs and not diagnostic diagrams — subject
markers, drawn to a house style documented at the top of `artwork.mjs`. Real
clinical photography still has to come from Yashoda.

### The Knowledge Hub reads, and the rails

Three things were added on top of the eighteen condition pages, and they share
one rule: **a card that opens nothing is worse than no card.**

- **`KH_ARTICLES` (20) and `KH_CASES` (6) carry their own `body`.** Each has an
  `id` that is its URL — `/knowledge-hub/guide/<id>` and
  `/knowledge-hub/case/<id>` — and an `src` array printed at the foot of the
  page. Nothing is `placeholder: true` any more, and `pages.test.mjs` fails the
  build if anything becomes one again.
- **Teaching cases say what they are.** Every case page carries, above the fold,
  that it is an illustrative scenario built on published guidance and not a
  record of a real patient. Writing a case that reads as a Yashoda patient would
  be an invented clinical claim. Do not remove that line.
- **`SERVICE_LINKS` maps every "Relevant Yashoda services" chip to a real
  destination** — a club, a route, a procedure, a topic or a guide. The chips
  used to be inert `<li>` pills. If you add a service name to a topic's `svc`,
  add its link here in the same edit; the suite fails on an unlinked chip.
- **`[data-rail]` is the horizontal carousel**, used by the videos, the
  specialists and the ECMO page. One timer in `startRails()` walks every rail on
  the page rather than each rail owning a timer, because the dc runtime replaces
  these elements on re-render. It advances every `RAIL_MS` (2s) and holds when
  the rail `:hover`s, contains focus, contains a playing `iframe`, or was
  touched in the last few seconds. **Hover is asked at tick time, never
  remembered:** `pointermove` stops firing when a pointer stops, so an
  event-driven hold lapsed and scrolled the card away from the person reading
  it. Under `prefers-reduced-motion` it does not self-advance at all.
- **Videos carry `also`**, the other topics a video belongs on, so one video
  serves two subjects without appearing twice in the hub's own list.

### ECMO & the air ambulance (`/ecmo-and-air-ambulance`)

Written only from Yashoda's published pages, listed in `ECMO_SRC`. The 24×7
cover, the national and international transfers, the transfer types, the terrace
evacuation at Hitec City, the Awake ECMO series and the Advanced Lung Failure
Unit are all sourced there; the explanation of what ECMO does is ELSO-level
general education. **No volume, first or outcome may be added here that is not
on one of those pages.**

The airlift scene is choreographed in `runAirlift()` and reaches Uppi through
exactly one seam, `__uppi.airlift(phase)` in `chat.js`, which sets the
`isAppointment` INPUT rather than touching `motion` or the rig. The page owns the
helicopter; Uppi owns Uppi. Keep it that way.

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
npm run build   # prerender 89 routes into dist/ (~60s), and rewrite sitemap.xml
npm run lint    # oxlint — keep it clean
```

```bash
npm test              # 487 assertions across five suites (~15min)
npm test conversation # one suite by name
```

`test/` has no dependencies beyond Playwright, which the prerender already needs.

| Suite | What it pins |
|---|---|
| `core.test.mjs` | Red flags with their negation and hypothetical guards, duration parsing, extraction including denials, every triage band, retrieval, the safety gate. |
| `conversation.test.mjs` | The six conversations in §30 of the brief, plus the properties that must hold across all of them: no repeated question, no repeated paragraph, nothing forgotten, one question per reply. |
| `rig.test.mjs` | The ten visemes, the digraph mapping, the schedule, and the approved palette. |
| `pages.test.mjs` | Real Chromium: the voice is male and follows the reader's language in both directions, every route renders with its own title and canonical, every guide and teaching case has a body and sources, a case says on its face it is not a real patient, the video rail advances/holds/wraps, the branch selector filters, every service chip resolves, and the whole airlift choreography. |
| `browser.test.mjs` | Real Chromium: entrance, **that he stops waving**, **that his mouth is CLOSED at rest**, blinking, scroll, the curious→tired→sleeping ladder, waking, the nudge cooldown, **the idle and reading popups on the real clock**, **the whole call-back flow against a stub destination including what does NOT leave with it**, a two-turn conversation, the offline emergency path, all seven widths, reduced motion, and zero console errors. |

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

0. `node scripts/check-html.mjs` — catches the silent breakages first, in seconds
1. `npm run lint`
2. `npm test` — must report `all suites passed` (487 assertions)
3. `npm run build` — must report `prerendered 89/89 routes`
4. Load a **non-homepage** route (`/knowledge-hub`, `/doctors`) and confirm it renders
5. Confirm no Uppi markup is baked into `dist/index.html`:
   `grep -c "uppi-root" dist/index.html` → `0`

The browser suite already covers the seven widths, the offline emergency path and the
console, so step 2 replaces most of what used to be a manual pass.
