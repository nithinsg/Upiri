# Uppi — the character asset pipeline

How the approved Uppi becomes an interactive character, what exists today, and
exactly what a designer has to deliver for the Rive path to take over.

---

## The three layers, and why they are separate

```
CHARACTER ASSET        public/uppi/avatar.js        the rig
                       public/uppi/avatar-rive.js   the same interface, driving a .riv
        ↓ setMouth / setViseme / setEyes / setLids / blink / look / setBrows /
          setExpression / setPose / parts
ANIMATION SYSTEM       public/uppi/states.js        18 states, resolved from inputs
                       public/uppi/motion.js        the movement each state performs
        ↓ states.set('isListening', true)
WEBSITE RUNTIME        public/uppi/chat.js          the panel, the dock, the CTAs
                       public/uppi/presence.js      scroll, pointer, inactivity
```

Nothing above the asset layer knows how the character is drawn. Nothing below
the runtime knows what the visitor is doing. **The website sets inputs; the
state machine decides behaviour; the asset performs it.**

That is why `states.js` is written as `set('isListening', true)` rather than
`play('listen')`: those are Rive state-machine inputs by another name, so the
swap is an import change rather than a rewrite.

---

## What ships today

A vector rig generated at runtime by `build()` in `avatar.js`, viewBox
`0 0 372 572`. It exists because the approved artwork has only ever reached this
project as images inside a conversation — there is no layered master file in the
repository to rig — and because the brief requires a mouth that forms real
shapes while speaking, which no flat image can do.

It is not a placeholder. It carries:

- the approved anatomy and palette — lung-pair head with bronchial tracery, a
  ribbed trachea, brown eyes, the navy Yashoda hoodie with the marigold petal
  mark and orange drawstrings, khaki cargo trousers, navy-and-cream sneakers;
- gradients and occlusion shading on every large surface, so it reads as a
  character rather than as clip art;
- eyelids that hood, droop and close, which is what makes tired, dozing and
  concerned three different faces;
- switchable arm poses — `rest`, `hip`, `wave`, `point`, `chin`;
- the ten visemes the speaking pipeline drives.

## What a Rive board would add

Real deformation. The vector rig transforms parts; a rigged board can bend,
squash and follow-through properly — a hoodie that lags the torso, a head that
overshoots and settles, weight that shifts through the hips. That is the
difference between "well animated parts" and "an animated character", and it is
authored, not coded.

---

## What the designer delivers

1. **The artwork**, as a layered file (Illustrator, Figma or Rive-native), with
   the parts named as below and drawn to the same proportions and palette as the
   approved reference. `SKIN` at the top of `avatar.js` holds the exact colours.
2. **One artboard**, named `Uppi`.
3. **One state machine**, named `Uppi`, exposing exactly these inputs:

| Input | Type | Meaning |
|---|---|---|
| `isTalking`, `isListening`, `isThinking` | boolean | what he is doing in the conversation |
| `isUrgent`, `isAppointment` | boolean | the triage outcome |
| `userInactive`, `scrolling` | boolean | what the visitor is doing |
| `attention`, `energy` | number 0…1 | how much of the visitor he has; 1 awake … 0 asleep |
| `emotion` | number | index — see `EMOTION_INDEX` in `avatar-rive.js` |
| `viseme` | number | index — see `VISEME_INDEX`; driven per frame while speaking |
| `lids` | number 0…1 | 0 open, 1 shut |
| `lookX`, `lookY` | number −1…1 | pupil direction; (0,0) is straight at the visitor |
| `browAngle` | number | degrees; positive raises the inner ends |
| `poseLeft`, `poseRight` | number | index — see `POSE_INDEX` |
| `triggerWave`, `triggerGreeting`, `triggerSleep`, `triggerGoodbye`, `triggerBlink` | trigger | one-shot events |

4. **The states**, matching `STATES` in `states.js`: ENTRY, WALKING, LANDING,
   WAVE, GREETING, IDLE, WAITING, LISTENING, THINKING, SPEAKING, CURIOUS, HAPPY,
   CONCERNED, TIRED, SLEEPING, URGENT, APPOINTMENT, GOODBYE.

5. **Independent control** of body, head, eyes, pupils, eyebrows, eyelids,
   mouth, arms, hands, legs, plus breathing and blinking — the list in §3 of the
   brief.

Keep the file small and prefer one artboard with one state machine; it is
lazy-loaded, but it still has to arrive over a hospital lobby's wifi.

---

## Wiring it up

Three steps, and only the first involves this repository's code:

1. Commit the board as `public/uppi/uppi.riv`, and set `RIVE_SRC` in
   `avatar-rive.js` to `'/uppi/uppi.riv'`.
2. `npm install @rive-app/canvas` — the adapter imports it dynamically, so it is
   fetched only where a board exists.
3. Nothing else. `chat.js` already reads
   `riveAvailable() ? new UppiRiveAvatar(...) : new UppiAvatar(...)`.

Then run `npm test`. The browser suite drives the character through the whole
behaviour ladder by its interface, not by its internals, so it validates the
Rive board exactly as it validates the vector rig — if the board is wired
correctly, the suite passes unchanged. `rig.test.mjs` is the exception: it tests
the SVG shape tables directly and stays with the vector rig.

---

## The rule that must survive the swap

Everything above the asset layer talks to it through `setMouth` / `setViseme` /
`setEyes` / `setLids` / `blink` / `look` / `setBrows` / `setExpression` /
`setPose` and the `parts` map, **and through nothing else**. If a future change
needs the character to do something new, add it to that interface and implement
it in both assets. A single reach into `avatar.svg` from outside is what would
turn the next swap back into a rewrite.
