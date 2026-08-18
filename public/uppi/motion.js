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

import { MOUTHS, visemeFor, visemeSchedule } from './avatar.js';

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
    this._glanceTimer = null;
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
    this.stopGlancing();
  }

  /* ---------------- poses ---------------- */

  /**
   * The resting pose (§6). Hand on hip, other arm relaxed — the single change
   * that stops Uppi looking like he is waving at the visitor forever.
   */
  poses(left, right) {
    this.a.setPose('left', left);
    this.a.setPose('right', right);
  }

  /* ---------------- entrance (§5) ---------------- */

  /**
   * Off-screen right → running in → decelerating. Resolves when he arrives.
   * The state machine owns the sequence; this owns the movement.
   */
  async runIn() {
    const { stage } = this;
    stage.style.willChange = 'transform, opacity';
    this.poses('rest', 'rest');

    if (this.reduced) {
      /* §25: the elaborate entrance becomes a short, calm arrival */
      await stage.animate(
        [{ transform: 'translateX(26px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 420, easing: EASE_SOFT, fill: 'both' }
      ).finished.catch(() => {});
      return;
    }

    /* The distance is expressed in viewport widths so the run reads the same on
       a 320px phone and a 2560px monitor. */
    const run = stage.animate(
      [{ transform: 'translateX(calc(100vw + 220px))' }, { transform: 'translateX(0)' }],
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
  }

  /** Weight lands: one short compression, one overshoot, then he looks at you. */
  async land() {
    if (this.reduced) { this.a.look(0, 0); this.a.setExpression('default'); return; }
    this.a.parts.svg.animate(
      [
        { transform: 'scale(1,1)' },
        { transform: 'scale(1.055,.93)', offset: 0.25 },
        { transform: 'scale(.982,1.028)', offset: 0.62 },
        { transform: 'scale(1,1)' }
      ],
      { duration: 420, easing: EASE_SETTLE, fill: 'none' }
    );
    await wait(240);
    /* he looks at the visitor before he does anything else */
    this.a.look(0, 0);
    this.a.setExpression('default');
    this.startBlinking();
    await wait(200);
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

  /**
   * Three unhurried waves from the shoulder, then the arm comes back DOWN.
   *
   * The arm is switched into its waving pose for the duration and out of it
   * afterwards. Previously the rig was drawn mid-wave, so "stop waving" was not
   * something the animation layer could express at all (§6).
   */
  async wave() {
    const { armRight, head } = this.a.parts;
    this.a.setExpression('happy');
    this.a.setPose('right', 'wave');
    if (this.reduced) {
      await wait(320);
      this.a.setPose('right', 'rest');
      return;
    }
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
    /* down again, and into the resting pose */
    this.a.setPose('right', 'rest');
  }

  /* ---------------- idle (§1: subtle breathing, blinking) ---------------- */

  startIdle() {
    this.clearLoops();
    /* §6: hand on hip, shoulders down. This is the DEFAULT — not a pose he
       reaches on request. */
    this.poses('hip', 'rest');
    this.a.setExpression('default');
    this.startBlinking();
    this.startGlancing();
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

  /**
   * The eyes wander and come back to the visitor (§6, §8).
   *
   * This is the cheapest thing in the file and the one that does most of the
   * work: a face whose eyes never move is a picture, whatever else is
   * animating around it.
   */
  startGlancing(interval) {
    this.stopGlancing();
    const gap = interval || 3200;
    const spots = [[0, 0], [0.45, -0.15], [0, 0], [-0.5, 0.1], [0, 0], [0.2, 0.3], [0, 0], [-0.3, -0.3]];
    let n = 0;
    const tick = () => {
      if (!this.a.parts.svg.isConnected) return;
      /* look at the visitor twice as often as anywhere else */
      this.a.look(...spots[n++ % spots.length]);
      this._glanceTimer = setTimeout(tick, gap + Math.random() * gap * 0.8);
    };
    this._glanceTimer = setTimeout(tick, gap);
  }

  stopGlancing() {
    if (this._glanceTimer) clearTimeout(this._glanceTimer);
    this._glanceTimer = null;
  }

  /** Turns the eyes towards a point in the viewport — the presence layer's cue. */
  lookToward(x, y) {
    const box = this.a.parts.svg.getBoundingClientRect();
    if (!box.width) return;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height * 0.36;
    this.a.look(
      Math.max(-1, Math.min(1, (x - cx) / (box.width * 2.4))),
      Math.max(-1, Math.min(1, (y - cy) / (box.height * 1.6)))
    );
  }

  /* ---------------- greeting, happy, waiting ---------------- */

  startGreeting() {
    this.clearLoops();
    this.poses('hip', 'rest');
    this.a.setExpression('happy');
    this.startBlinking();
    this.startGlancing(2600);
    if (this.reduced) return;
    const { body } = this.a.parts;
    this.track(body.animate(
      [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.02) translateY(-1px)' }, { transform: 'scaleY(1)' }],
      { duration: 3600, iterations: Infinity, easing: 'ease-in-out' }
    ));
  }

  startHappy() {
    this.startIdle();
    this.a.setExpression('happy');
    if (this.reduced) return;
    /* one small bob — pleasure, not a bounce */
    this.a.parts.svg.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }],
      { duration: 620, easing: EASE_SETTLE }
    );
  }

  /** Present but not demanding: he waits, and lets the visitor read the page. */
  startWaiting() {
    this.startIdle();
    this.startGlancing(5200);
    this.a.setExpression('neutral');
  }

  /* ---------------- curious, tired, sleeping (§8) ---------------- */

  /** Head tilt, brows up, eyes on the visitor. "Need a hand?" */
  startCurious() {
    this.clearLoops();
    this.poses('hip', 'rest');
    this.a.setExpression('curious');
    this.stopGlancing();
    this.a.look(0, 0);
    this.startBlinking(2000, 3800);
    if (this.reduced) return;
    const { head, body } = this.a.parts;
    this.track(head.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-7deg) translateY(-2px)' }],
      { duration: 420, easing: EASE_SETTLE, fill: 'forwards' }
    ));
    this.track(body.animate(
      [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.014)' }, { transform: 'scaleY(1)' }],
      { duration: 3800, iterations: Infinity, easing: 'ease-in-out' }
    ));
  }

  /**
   * Heavy-lidded, slower, with the occasional yawn. Charm rather than reproach:
   * he is not sulking that you did not talk to him, he is just a character in a
   * quiet room (§8).
   */
  startTired() {
    this.clearLoops();
    this.poses('hip', 'rest');
    this.a.setExpression('tired');
    this.stopGlancing();
    this.startBlinking(3200, 6400);
    if (this.reduced) return;
    const { body, head } = this.a.parts;
    this.track(body.animate(
      [{ transform: 'scaleY(1) translateY(0)' }, { transform: 'scaleY(1.02) translateY(1px)' }, { transform: 'scaleY(1) translateY(0)' }],
      { duration: 6200, iterations: Infinity, easing: 'ease-in-out' }
    ));
    this.track(head.animate(
      [{ transform: 'rotate(0deg) translateY(0)' }, { transform: 'rotate(-3deg) translateY(3px)' }, { transform: 'rotate(0deg) translateY(0)' }],
      { duration: 9000, iterations: Infinity, easing: 'ease-in-out' }
    ));

    const yawn = () => {
      if (!this.a.parts.svg.isConnected) return;
      this.a.setMouth('yawn');
      this.a.setLids(0.7, 260);
      this.a.parts.head.animate(
        [{ transform: 'rotate(0deg)' }, { transform: 'rotate(4deg) translateY(-3px)' }, { transform: 'rotate(0deg)' }],
        { duration: 900, easing: 'ease-in-out' }
      );
      this.timers.push(setTimeout(() => { this.a.setMouth('soft'); this.a.setLids(0.45, 320); }, 900));
      this.timers.push(setTimeout(yawn, 11000 + Math.random() * 7000));
    };
    this.timers.push(setTimeout(yawn, 3200));
  }

  /** Dozing: eyes shut, deep slow breathing, the head dipping and catching. */
  startSleeping() {
    this.clearLoops();
    this.poses('rest', 'rest');
    this.stopGlancing();
    this.stopBlinking();
    this.a.setExpression('asleep');
    if (this.reduced) return;
    const { body, head } = this.a.parts;
    this.track(body.animate(
      [{ transform: 'scaleY(1) translateY(0)' }, { transform: 'scaleY(1.03) translateY(2px)' }, { transform: 'scaleY(1) translateY(0)' }],
      { duration: 7200, iterations: Infinity, easing: 'ease-in-out' }
    ));
    this.track(head.animate(
      [
        { transform: 'rotate(0deg) translateY(0)' },
        { transform: 'rotate(-5deg) translateY(7px)', offset: 0.45 },
        { transform: 'rotate(-2deg) translateY(2px)', offset: 0.55 },
        { transform: 'rotate(-5deg) translateY(7px)', offset: 0.9 },
        { transform: 'rotate(0deg) translateY(0)' }
      ],
      { duration: 7200, iterations: Infinity, easing: 'ease-in-out' }
    ));
  }

  /** Wakes up: eyes open, a startle, then back to whatever is next (§8). */
  async wake() {
    /* Deliberately does NOT clear the loops: waking is a flourish played over
       whatever the machine has already resolved to. Clearing here stopped the
       breathing that the new state had just started. */
    this.a.setLids(0, 160);
    if (!this.reduced) {
      this.a.parts.svg.animate(
        [{ transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(-5px) scale(.99,1.02)' }, { transform: 'translateY(0) scale(1,1)' }],
        { duration: 460, easing: EASE_SETTLE }
      );
      this.a.parts.head.animate(
        [{ transform: 'rotate(-4deg) translateY(4px)' }, { transform: 'rotate(2deg) translateY(-2px)' }, { transform: 'rotate(0deg) translateY(0)' }],
        { duration: 520, easing: EASE_SETTLE, fill: 'none' }
      );
    }
    await this.a.blink();
  }

  /* ---------------- appointment, goodbye ---------------- */

  /** Caring and slightly forward — the buttons matter more than he does here. */
  startAppointment() {
    this.clearLoops();
    this.poses('hip', 'rest');
    this.a.setExpression('caring');
    this.startBlinking(2600, 5200);
    this.startGlancing(4200);
    if (this.reduced) return;
    this.track(this.a.parts.body.animate(
      [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.013)' }, { transform: 'scaleY(1)' }],
      { duration: 4600, iterations: Infinity, easing: 'ease-in-out' }
    ));
  }

  async startGoodbye() {
    this.a.setExpression('happy');
    await this.wave();
    this.startIdle();
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
    this.stopGlancing();
    this.poses('hip', 'rest');
    this.a.setExpression('listening');
    this.a.look(0, 0);
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
    this.stopGlancing();
    /* hand to the chin — the pose does more than the head tilt does (§20) */
    this.poses('chin', 'rest');
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
    this.stopGlancing();
    this.poses('rest', 'rest');
    this.a.setExpression('concerned');
    this.a.look(0, 0);
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
    this.stopGlancing();
    this.poses('hip', 'rest');
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

    /*
     * Sources, in order of fidelity (§18):
     *
     *   1. getVisemeAt(ms)  a real schedule — character-level timings from the
     *                       speech provider, mapped to visemes and played back
     *                       against the audio clock. This is the only source
     *                       that puts the right shape on the right sound.
     *   2. getChar()        the character currently being spoken, from the
     *                       browser voice's boundary events.
     *   3. getLevel()       amplitude. Deliberately LAST: a mouth driven by
     *                       volume alone opens on every loud consonant and
     *                       closes through every quiet vowel, which is the
     *                       "flapping jaw" the brief rules out. It is used only
     *                       when nothing better exists, and only to choose
     *                       between three openness bands rather than shapes.
     *   4. the text's own vowel rhythm, when there is no timing at all.
     */
    const started = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const fallback = source && source.text ? visemeSchedule(source.text) : null;
    let last = '';
    let i = 0;

    const step = () => {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;
      let shape = null;

      if (source && typeof source.getVisemeAt === 'function') {
        shape = source.getVisemeAt(now);
      }
      if (!shape && source && typeof source.getChar === 'function') {
        const ch = source.getChar();
        if (ch) shape = visemeFor(ch);
      }
      if (!shape && source && typeof source.getLevel === 'function') {
        const level = source.getLevel();
        if (typeof level === 'number') shape = level < 0.06 ? 'neutral' : level < 0.2 ? 'sh' : level < 0.45 ? 'ai' : 'aa';
      }
      if (!shape && fallback && fallback.length) {
        /* no timing at all: walk the text's own shape sequence at a natural
           speaking rate, so the mouth still tracks the sentence */
        shape = fallback[Math.floor(now / 92) % fallback.length].viseme;
      }
      if (!shape) shape = ['ai', 'sh', 'aa', 'ai', 'o', 'mbp'][i % 6];

      /* never the same shape twice running — a mouth that holds a pose for
         200ms looks stuck, and one extra step of variation fixes it */
      if (shape === last && MOUTHS[shape]) shape = shape === 'neutral' ? 'sh' : shape === 'aa' ? 'ai' : 'neutral';
      last = shape;
      i++;
      this.a.setViseme(shape);
    };
    step();
    this._speaking = setInterval(step, 88);
  }

  stopSpeaking() {
    if (this._speaking) clearInterval(this._speaking);
    this._speaking = null;
  }
}
