/*
 * Uppi's movement.
 *
 * Everything here drives the rig's named parts through the Web Animations API
 * and CSS transforms only, so it stays on the compositor: no layout, no paint,
 * no jank on a mid-range Android in a hospital lobby.
 *
 * The brief is specific about the register (§1): this should read as a polished
 * modern 3D brand character arriving, not a cartoon bouncing in. That means
 * natural acceleration and deceleration, a real stride, weight landing through
 * a small compression, and then a body that never goes completely still —
 * breathing, blinking, a shift of weight. Stillness is what makes a character
 * look like a sticker.
 *
 * Under prefers-reduced-motion (§24) the entrance collapses to a short fade and
 * slide, the loops stop, and the mouth still forms shapes while Uppi speaks —
 * because that is captioning, not decoration.
 */

import { MOUTHS, visemeFor } from './avatar.js';

export function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

const EASE_RUN = 'cubic-bezier(.16,.62,.28,1)';
const EASE_SETTLE = 'cubic-bezier(.34,1.4,.5,1)';
const EASE_SOFT = 'cubic-bezier(.4,0,.2,1)';

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

/* Cancels an animation without the console noise a rejected .finished throws. */
function stop(anim) {
  if (!anim) return;
  try { anim.cancel(); } catch { /* already gone */ }
}

export class Motion {
  /**
   * @param {UppiAvatar} avatar
   * @param {HTMLElement} stage the element that carries Uppi across the screen
   */
  constructor(avatar, stage) {
    this.a = avatar;
    this.stage = stage;
    this.loops = [];
    this.timers = [];
    this.reduced = prefersReducedMotion();
    this._speaking = null;
    this._blinkTimer = null;
  }

  /* ---------------- lifecycle ---------------- */

  track(anim) { if (anim) this.loops.push(anim); return anim; }

  clearLoops() {
    for (const a of this.loops) stop(a);
    this.loops = [];
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  destroy() {
    this.clearLoops();
    this.stopSpeaking();
    this.stopBlinking();
  }

  /* ---------------- entrance (§1) ---------------- */

  /**
   * Uppi runs in from the right, decelerates, lands, settles, looks at the
   * visitor and waves. Resolves when the wave is finished and he is idling.
   */
  async enter() {
    const { stage } = this;
    stage.style.willChange = 'transform, opacity';

    if (this.reduced) {
      /* §24: the elaborate entrance becomes a short, calm arrival */
      await stage.animate(
        [{ transform: 'translateX(26px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 420, easing: EASE_SOFT, fill: 'both' }
      ).finished.catch(() => {});
      this.a.setExpression('idle');
      this.startIdle();
      return;
    }

    /* 1–3. off-screen right, running in, decelerating.
       The distance is expressed in viewport widths so the run reads the same on
       a 320px phone and a 2560px monitor. */
    const run = stage.animate(
      [
        { transform: 'translateX(calc(100vw + 220px))' },
        { transform: 'translateX(0)' }
      ],
      { duration: 1500, easing: EASE_RUN, fill: 'both' }
    );
    this.runCycle(1500);
    /* the body leans into the run and comes upright as he slows */
    this.a.parts.body.animate(
      [{ transform: 'rotate(-5deg)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(0deg)' }],
      { duration: 1500, easing: EASE_RUN, fill: 'both' }
    );
    /* looking ahead while running, then round to the visitor */
    this.a.look(-0.7, 0);
    this.a.setMouth('small');
    await run.finished.catch(() => {});

    /* 4–5. weight lands: a short compression and one overshoot, no more */
    this.a.parts.svg.animate(
      [
        { transform: 'scale(1,1)' },
        { transform: 'scale(1.055,.93)', offset: 0.25 },
        { transform: 'scale(.982,1.028)', offset: 0.62 },
        { transform: 'scale(1,1)' }
      ],
      { duration: 420, easing: EASE_SETTLE, fill: 'none' }
    );
    await wait(180);

    /* 6. he looks at you */
    this.a.look(0, 0);
    this.a.setExpression('idle');
    this.startBlinking();
    await wait(220);

    /* 7. the wave */
    await this.wave();

    /* 8. and settles into breathing */
    this.startIdle();
  }

  /** Legs and arms cycling for the duration of a run, slowing as he arrives. */
  runCycle(duration) {
    const { legLeft, legRight, armLeft, armRight, body, head } = this.a.parts;
    const stride = 300;
    const cycles = Math.max(1, Math.round(duration / stride));
    const opts = { duration: stride, iterations: cycles, easing: 'ease-in-out', fill: 'none' };

    this.track(legLeft.animate([{ transform: 'rotate(24deg)' }, { transform: 'rotate(-24deg)' }, { transform: 'rotate(24deg)' }], opts));
    this.track(legRight.animate([{ transform: 'rotate(-24deg)' }, { transform: 'rotate(24deg)' }, { transform: 'rotate(-24deg)' }], opts));
    this.track(armLeft.animate([{ transform: 'rotate(-26deg)' }, { transform: 'rotate(22deg)' }, { transform: 'rotate(-26deg)' }], opts));
    /* the raised arm swings much less — it is already up */
    this.track(armRight.animate([{ transform: 'rotate(6deg)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(6deg)' }], opts));
    /* the body rises and falls once per step, which is what sells a stride */
    this.track(body.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-7px)' }, { transform: 'translateY(0)' }],
      { duration: stride / 2, iterations: cycles * 2, easing: 'ease-in-out', fill: 'none' }));
    this.track(head.animate([{ transform: 'translateY(0) rotate(-2deg)' }, { transform: 'translateY(-9px) rotate(1deg)' }, { transform: 'translateY(0) rotate(-2deg)' }],
      { duration: stride / 2, iterations: cycles * 2, easing: 'ease-in-out', fill: 'none' }));
  }

  /** Three unhurried waves from the shoulder, with the head tipping along. */
  async wave() {
    const { armRight, head } = this.a.parts;
    this.a.setExpression('happy');
    if (this.reduced) { await wait(200); this.a.setExpression('idle'); return; }
    const w = armRight.animate(
      [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(-17deg)' },
        { transform: 'rotate(11deg)' },
        { transform: 'rotate(-15deg)' },
        { transform: 'rotate(9deg)' },
        { transform: 'rotate(-12deg)' },
        { transform: 'rotate(0deg)' }
      ],
      { duration: 1450, easing: 'ease-in-out', fill: 'none' }
    );
    head.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(0deg)' }],
      { duration: 1450, easing: 'ease-in-out', fill: 'none' }
    );
    await w.finished.catch(() => {});
    this.a.setExpression('idle');
  }

  /* ---------------- idle (§1: subtle breathing, blinking) ---------------- */

  startIdle() {
    this.clearLoops();
    this.startBlinking();
    if (this.reduced) return;
    const { body, head, svg } = this.a.parts;

    /* breathing — a pair of lungs ought to, and at 4.2s it reads as calm rather
       than as an effect */
    this.track(body.animate(
      [{ transform: 'scaleY(1) translateY(0)' }, { transform: 'scaleY(1.016) translateY(-1px)' }, { transform: 'scaleY(1) translateY(0)' }],
      { duration: 4200, iterations: Infinity, easing: 'ease-in-out' }
    ));
    this.track(head.animate(
      [{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translateY(-3px) rotate(.8deg)' }, { transform: 'translateY(0) rotate(-.6deg)' }, { transform: 'translateY(0) rotate(0deg)' }],
      { duration: 8400, iterations: Infinity, easing: 'ease-in-out' }
    ));
    /* a slow shift of weight, so he is never geometrically still */
    this.track(svg.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(2.5px)' }, { transform: 'translateX(0)' }, { transform: 'translateX(-2.5px)' }, { transform: 'translateX(0)' }],
      { duration: 11000, iterations: Infinity, easing: 'ease-in-out' }
    ));
  }

  /* ---------------- listening (§13) ---------------- */

  /*
   * The brief calls this out as extremely important, and it is: a character
   * that freezes while you talk to it stops being a character. He leans in,
   * his eyes widen, he keeps breathing, and every few seconds he nods — the
   * small "go on, I'm with you" that a person does without thinking.
   */
  startListening() {
    this.clearLoops();
    this.a.setExpression('listening');
    this.startBlinking(2200, 4200);
    const { body, head } = this.a.parts;

    if (this.reduced) {
      head.style.transform = 'translateY(3px) rotate(2deg)';
      return;
    }

    this.track(body.animate(
      [{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translateY(4px) rotate(1.6deg)' }],
      { duration: 420, easing: EASE_SOFT, fill: 'forwards' }
    ));
    /* leaning in, and breathing a little deeper than at rest */
    this.track(head.animate(
      [{ transform: 'translateY(4px) rotate(2deg)' }, { transform: 'translateY(1px) rotate(2.6deg)' }, { transform: 'translateY(4px) rotate(2deg)' }],
      { duration: 3200, iterations: Infinity, easing: 'ease-in-out' }
    ));

    const nod = () => {
      if (!this.a.parts.head.isConnected) return;
      this.a.parts.head.animate(
        [{ transform: 'translateY(4px) rotate(2deg)' }, { transform: 'translateY(9px) rotate(3.4deg)' }, { transform: 'translateY(4px) rotate(2deg)' }],
        { duration: 520, easing: 'ease-in-out', composite: 'replace' }
      );
      this.timers.push(setTimeout(nod, 2800 + Math.random() * 2600));
    };
    this.timers.push(setTimeout(nod, 1800));
  }

  /* ---------------- thinking ---------------- */

  startThinking() {
    this.clearLoops();
    this.a.setExpression('thinking');
    this.startBlinking(1400, 2600);
    if (this.reduced) return;
    const { head, body } = this.a.parts;
    this.track(head.animate(
      [{ transform: 'rotate(-4deg) translateY(0)' }, { transform: 'rotate(-6deg) translateY(-2px)' }, { transform: 'rotate(-4deg) translateY(0)' }],
      { duration: 2400, iterations: Infinity, easing: 'ease-in-out' }
    ));
    this.track(body.animate(
      [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.014)' }, { transform: 'scaleY(1)' }],
      { duration: 3400, iterations: Infinity, easing: 'ease-in-out' }
    ));
    /* eyes wander while he works it out, rather than staring through you */
    let n = 0;
    const glance = () => {
      const spots = [[0.6, -0.8], [0.35, -0.6], [-0.4, -0.7], [0.55, -0.5]];
      this.a.look(...spots[n++ % spots.length]);
      this.timers.push(setTimeout(glance, 700 + Math.random() * 500));
    };
    glance();
  }

  /* ---------------- concerned / urgent ---------------- */

  startConcerned() {
    this.clearLoops();
    this.a.setExpression('concerned');
    this.startBlinking(2600, 5000);
    if (this.reduced) return;
    const { body } = this.a.parts;
    /* very little movement. An urgent screen should feel steady, not agitated. */
    this.track(body.animate(
      [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.01)' }, { transform: 'scaleY(1)' }],
      { duration: 5200, iterations: Infinity, easing: 'ease-in-out' }
    ));
  }

  /* ---------------- blinking ---------------- */

  startBlinking(min, max) {
    this.stopBlinking();
    const lo = min || 2600;
    const hi = max || 6200;
    const tick = () => {
      if (!this.a.parts.svg.isConnected) return;
      this.a.blink().then(() => {
        /* people occasionally double-blink; it costs one line and reads as alive */
        if (Math.random() < 0.18) setTimeout(() => this.a.blink(), 180);
      });
      this._blinkTimer = setTimeout(tick, lo + Math.random() * (hi - lo));
    };
    this._blinkTimer = setTimeout(tick, lo + Math.random() * (hi - lo));
  }

  stopBlinking() {
    if (this._blinkTimer) clearTimeout(this._blinkTimer);
    this._blinkTimer = null;
  }

  /* ---------------- speaking (§14) ---------------- */

  /*
   * The mouth is driven by the speech itself, not by a canned loop.
   *
   * Two sources, in order of fidelity:
   *   level  — real amplitude from an AnalyserNode over hosted TTS audio;
   *   char   — the character currently being spoken, from the browser voice's
   *            word-boundary events, mapped through the viseme table.
   * With neither, it falls back to a rhythm around the vowel positions of the
   * text, which still tracks the sentence rather than flapping at random.
   *
   * `source` is { getLevel(): number|null, getChar(): string|null }.
   */
  startSpeaking(source) {
    this.stopSpeaking();
    this.clearLoops();
    this.a.setExpression('speaking');
    this.startBlinking(2400, 5200);

    const { head, body } = this.a.parts;
    if (!this.reduced) {
      this.track(body.animate(
        [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.014)' }, { transform: 'scaleY(1)' }],
        { duration: 3600, iterations: Infinity, easing: 'ease-in-out' }
      ));
      /* the head moves a little with the speech — people do not talk from a
         locked neck — but nothing that competes with the mouth */
      this.track(head.animate(
        [{ transform: 'rotate(0deg) translateY(0)' }, { transform: 'rotate(1.4deg) translateY(-2px)' }, { transform: 'rotate(-1deg) translateY(0)' }, { transform: 'rotate(0deg) translateY(0)' }],
        { duration: 5200, iterations: Infinity, easing: 'ease-in-out' }
      ));
    }

    let last = '';
    let i = 0;
    const step = () => {
      let shape;
      const level = source && source.getLevel ? source.getLevel() : null;
      if (typeof level === 'number') {
        shape = level < 0.06 ? 'closed' : level < 0.18 ? 'small' : level < 0.4 ? 'mid' : level < 0.68 ? 'smile' : 'wide';
      } else {
        const ch = source && source.getChar ? source.getChar() : null;
        shape = ch ? visemeFor(ch) : ['mid', 'small', 'wide', 'mid', 'o', 'small'][i % 6];
      }
      /* never the same shape twice running — a mouth that holds a pose for
         200ms looks stuck, and one extra step of variation fixes it */
      if (shape === last && MOUTHS[shape]) shape = shape === 'closed' ? 'small' : shape === 'wide' ? 'mid' : 'closed';
      last = shape;
      i++;
      this.a.setMouth(shape);
    };
    step();
    this._speaking = setInterval(step, 92);
  }

  stopSpeaking() {
    if (this._speaking) clearInterval(this._speaking);
    this._speaking = null;
  }
}
