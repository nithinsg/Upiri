/*
 * Presence — Uppi noticing the visitor (§7, §8).
 *
 * This is the layer that turns a character on a page into a character in the
 * room. It watches the ordinary signals a person would notice — the page
 * moving, the pointer coming closer, a keyboard being used, the tab being left
 * open and forgotten — and it sets the state machine's inputs accordingly. It
 * never touches the rig, and it never decides what state Uppi is in; it reports
 * what the visitor is doing and lets the machine resolve the rest.
 *
 * THE RULE THAT MATTERS MOST: do not interrupt.
 *
 * A companion that pipes up every time you scroll is worse than one that sits
 * still. So every spoken nudge passes three tests — a long cooldown, a hard cap
 * per session, and silence once a real conversation has started. Uppi is
 * allowed to look interested as often as he likes; he is allowed to SAY
 * something about twice a visit.
 *
 * Everything here is passive listeners and timers. On a hidden tab the timers
 * stop, so a page left open in a background tab does not have a character
 * quietly dozing and waking for an hour.
 */

/*
 * Timings. Exposed as defaults rather than buried as constants so they can be
 * tuned without reading the logic, and so the tests can drive the whole ladder
 * in seconds instead of minutes.
 */
export const DEFAULT_TIMING = {
  /* the inactivity ladder (§8) */
  glanceAfter: 24_000,     /* he looks up and around */
  curiousAfter: 46_000,    /* he wonders whether you need a hand, and says so */
  tiredAfter: 110_000,     /* heavy-lidded, the odd yawn */
  sleepAfter: 180_000,     /* dozing off */

  /* nudges: rare, capped, and never during a conversation */
  nudgeCooldown: 95_000,
  maxNudges: 2,

  /*
   * Reading, not scrolling.
   *
   * The first version asked for 5.2s of UNBROKEN scrolling, with the counter
   * reset after 420ms of quiet. Nobody reads that way — a real visitor flicks,
   * pauses to read, flicks again — so the counter reset on every pause and the
   * offer of help never once appeared for a genuine reader. Measured: fourteen
   * normal scroll bursts over thirteen seconds produced nothing.
   *
   * A reading SESSION instead: it survives pauses up to `readingGap`, and the
   * offer comes when someone has been at it for `readingTime` AND has covered
   * `readingDistance` screens. Both conditions, so a couple of idle flicks do
   * not trigger it.
   */
  readingGap: 2_500,
  readingTime: 7_000,
  readingDistance: 1.6      /* in viewport heights */
};

/* How close the pointer has to come before Uppi reckons it is about him. */
const NEAR = 260;

/* What he says, if he says anything at all. Deliberately short, and phrased as
   an offer rather than a demand for attention. */
export const NUDGES = {
  scrolling: [
    'Need a hand finding something?',
    'Looking for something? I can help.'
  ],
  idle: [
    'Need some help?',
    "I'm here if something's bothering you."
  ]
};

export class Presence {
  /**
   * @param {UppiStateMachine} states
   * @param {object} opts
   * @param {() => boolean} opts.isOpen whether the chat panel is open
   * @param {() => boolean} opts.isEngaged whether a conversation has started
   * @param {(text:string, kind:string) => void} opts.onNudge show a bubble
   * @param {() => HTMLElement|null} opts.anchor the element Uppi occupies
   */
  constructor(states, opts) {
    this.states = states;
    this.o = opts || {};
    this.t = Object.assign({}, DEFAULT_TIMING, (opts && opts.timing) || {});
    this.timers = [];
    this.nudges = 0;
    this.lastNudge = 0;
    /* the current reading session */
    this.reading = null;
    this._scrollEnd = null;
    this._lastY = 0;
    this.destroyed = false;
    this._bound = [];

    this._listen(window, 'scroll', this.onScroll.bind(this), { passive: true });
    this._listen(window, 'pointermove', this.onPointerMove.bind(this), { passive: true });
    this._listen(window, 'pointerdown', this.onInteract.bind(this), { passive: true });
    this._listen(window, 'keydown', this.onInteract.bind(this));
    this._listen(document, 'visibilitychange', this.onVisibility.bind(this));

    this.schedule();
  }

  _listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._bound.push([target, type, fn]);
  }

  /* ---------------- inactivity ladder (§8) ---------------- */

  clearTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  /*
   * Four stages, each one further from attentive. Set as absolute timeouts from
   * the last interaction rather than as a chain, so a single interaction resets
   * the whole ladder in one line instead of unwinding it stage by stage.
   */
  schedule() {
    this.clearTimers();
    if (this.destroyed || document.hidden) return;
    const at = (ms, fn) => this.timers.push(setTimeout(fn, ms));

    at(this.t.glanceAfter, () => {
      /* looking up is not an interruption, so it needs no cooldown */
      this.states.setAll({ userInactive: true, attention: 0.3 });
    });
    at(this.t.curiousAfter, () => {
      this.states.setAll({ userInactive: true, attention: 1 });
      this.nudge('idle');
    });
    at(this.t.tiredAfter, () => {
      this.states.setAll({ energy: 0.2, attention: 0.2 });
    });
    at(this.t.sleepAfter, () => {
      this.states.setAll({ energy: 0, attention: 0 });
    });
  }

  /* ---------------- signals ---------------- */

  /**
   * Any deliberate interaction: he wakes, fully and immediately (§8). Waking
   * has to be instant — a character who takes a beat to notice you reads as
   * broken rather than as sleepy.
   */
  onInteract() {
    this.wake();
  }

  wake() {
    /* a deliberate interaction ends the reading session — they are here now */
    this.reading = null;
    const wasAsleep = this.states.inputs.energy <= 0.25;
    /* The state resolves first so the idle loops are running again, and the
       startle plays over the top of them rather than instead of them. */
    this.states.setAll({ energy: 1, userInactive: false, attention: 1 });
    if (wasAsleep && this.states.motion && this.states.motion.wake) this.states.motion.wake();
    this.schedule();
  }

  /*
   * Scrolling is NOT an interaction. Someone reading the page is busy, and the
   * right behaviour is to stay calm and out of the way (§7) — so scrolling
   * keeps him awake and lets him follow the movement with his eyes, but it does
   * not reset the ladder to fully attentive, and only prolonged scrolling with
   * no other interaction earns a single offer of help.
   */
  onScroll() {
    const now = Date.now();
    const y = window.scrollY || window.pageYOffset || 0;
    const screen = window.innerHeight || 800;

    /* One reading session, which survives the pauses a person takes to actually
       read. It only ends after `readingGap` of real quiet. */
    if (!this.reading || now - this.reading.last > this.t.readingGap) {
      this.reading = { started: now, last: now, distance: 0, nudged: false };
    } else {
      this.reading.distance += Math.abs(y - this._lastY);
      this.reading.last = now;
    }
    this._lastY = y;

    this.states.set('scrolling', true);
    if (this.states.inputs.energy <= 0) this.wake();

    /* `scrolling` describes the page moving right now, so it clears quickly —
       the reading session above is the thing that persists. */
    if (this._scrollEnd) clearTimeout(this._scrollEnd);
    this._scrollEnd = setTimeout(() => this.states.set('scrolling', false), 420);

    const r = this.reading;
    if (!r.nudged && now - r.started > this.t.readingTime && r.distance > screen * this.t.readingDistance) {
      r.nudged = true;
      this.nudge('scrolling');
    }
  }

  /**
   * The pointer coming towards him is the clearest "I am about to talk to you"
   * signal a page gives, and answering it is most of what makes a character
   * feel aware. He looks at the pointer, and wakes if the pointer is close.
   */
  onPointerMove(e) {
    const anchor = this.o.anchor && this.o.anchor();
    if (!anchor) return;
    const box = anchor.getBoundingClientRect();
    if (!box.width) return;
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    /* his eyes follow the pointer whenever it is anywhere near */
    if (distance < NEAR * 3 && this.states.motion && this.states.motion.lookToward) {
      this.states.motion.lookToward(e.clientX, e.clientY);
    }
    if (distance < NEAR) {
      this.states.set('attention', 1);
      if (this.states.inputs.energy < 1) this.wake();
    }
  }

  onVisibility() {
    if (document.hidden) {
      this.clearTimers();
      /* a tab nobody is looking at should not be animating a character */
      this.states.setAll({ userInactive: false, energy: 1 });
    } else {
      this.wake();
    }
  }

  /* ---------------- nudges ---------------- */

  /** Says something, if all three restraints allow it. */
  nudge(kind) {
    if (this.destroyed) return false;
    if (this.nudges >= this.t.maxNudges) return false;
    if (Date.now() - this.lastNudge < this.t.nudgeCooldown) return false;
    /* never over the top of the panel, and never once there is a real
       conversation happening — at that point he has been asked already */
    if (this.o.isOpen && this.o.isOpen()) return false;
    if (this.o.isEngaged && this.o.isEngaged()) return false;

    const lines = NUDGES[kind] || NUDGES.idle;
    const text = lines[this.nudges % lines.length];
    this.nudges++;
    this.lastNudge = Date.now();
    this.states.setAll({ userInactive: true, attention: 1 });
    if (this.o.onNudge) this.o.onNudge(text, kind);
    return true;
  }

  destroy() {
    this.destroyed = true;
    this.clearTimers();
    if (this._scrollEnd) clearTimeout(this._scrollEnd);
    for (const [target, type, fn] of this._bound) target.removeEventListener(type, fn);
    this._bound = [];
  }
}
