/*
 * Uppi's behaviour state machine (§4).
 *
 * ONE place decides what Uppi is doing. Nothing else — not the chat panel, not
 * the speech layer, not the presence tracker — reaches into the rig or the
 * motion layer. They set INPUTS; the machine resolves those inputs into a
 * state; the state drives the motion.
 *
 * That indirection is the whole design. It is how a Rive state machine works,
 * and it is deliberate here for two reasons:
 *
 *   1. Coherence. If the microphone opens, Uppi listens, whatever else was
 *      happening. If an urgent triage result lands, he is concerned before the
 *      text reaches the screen. No caller can leave him in a contradictory pose
 *      because no caller sets the pose.
 *   2. Replaceability. When the rigged .riv board arrives, these same input
 *      names become Rive state-machine inputs and this file becomes a thin
 *      adapter. Nothing above it changes. That is why behaviour is expressed as
 *      `isListening = true` rather than as `playAnimation('listen')`.
 *
 * Inputs are either LEVELS that persist (isTalking, energy, emotion) or
 * TRIGGERS that fire once and clear themselves (triggerWave, triggerSleep).
 */

export const STATES = [
  'ENTRY', 'WALKING', 'LANDING', 'WAVE', 'GREETING', 'IDLE', 'WAITING',
  'LISTENING', 'THINKING', 'SPEAKING', 'CURIOUS', 'HAPPY', 'CONCERNED',
  'TIRED', 'SLEEPING', 'URGENT', 'APPOINTMENT', 'GOODBYE'
];

/*
 * The runtime inputs (§4). Defaults describe Uppi at rest, awake and attentive.
 *
 *   isTalking/isListening/isThinking  what he is doing in the conversation
 *   emotion                           neutral | happy | caring | curious |
 *                                     concerned | urgent
 *   attention                         0…1, how much of the visitor he has
 *   energy                            1 awake … 0 asleep; decays with inactivity
 *   isUrgent/isAppointment            the triage outcome, from the engine
 *   userInactive                      nothing has happened for a while
 *   scrolling                         the page is moving under him
 *   trigger*                          one-shot events
 */
export const DEFAULT_INPUTS = {
  isTalking: false,
  isListening: false,
  isThinking: false,
  emotion: 'neutral',
  attention: 1,
  energy: 1,
  isUrgent: false,
  isAppointment: false,
  userInactive: false,
  scrolling: false,
  triggerWave: false,
  triggerGreeting: false,
  triggerSleep: false,
  triggerGoodbye: false
};

const TRIGGERS = ['triggerWave', 'triggerGreeting', 'triggerSleep', 'triggerGoodbye'];

/*
 * Legal transitions, declared rather than implied, so an impossible one is a
 * caught bug and not a stuck animation. IDLE and URGENT are reachable from
 * anywhere: an emergency does not wait its turn, and returning to rest must
 * never be blocked.
 */
const ALLOWED = {
  ENTRY: ['WALKING', 'IDLE'],
  WALKING: ['LANDING', 'IDLE'],
  LANDING: ['WAVE', 'GREETING', 'IDLE'],
  WAVE: ['GREETING', 'IDLE', 'LISTENING'],
  GREETING: ['SPEAKING', 'IDLE', 'LISTENING', 'WAITING'],
  IDLE: ['LISTENING', 'THINKING', 'SPEAKING', 'HAPPY', 'CURIOUS', 'WAITING', 'TIRED', 'APPOINTMENT', 'CONCERNED', 'WAVE', 'GOODBYE', 'GREETING'],
  WAITING: ['CURIOUS', 'TIRED', 'IDLE', 'LISTENING', 'SPEAKING', 'THINKING'],
  CURIOUS: ['IDLE', 'WAITING', 'TIRED', 'LISTENING', 'THINKING', 'SPEAKING'],
  TIRED: ['SLEEPING', 'IDLE', 'CURIOUS', 'LISTENING', 'SPEAKING', 'THINKING'],
  SLEEPING: ['IDLE', 'CURIOUS', 'LISTENING', 'SPEAKING', 'THINKING'],
  LISTENING: ['THINKING', 'IDLE', 'SPEAKING'],
  THINKING: ['SPEAKING', 'APPOINTMENT', 'URGENT', 'CONCERNED', 'IDLE'],
  SPEAKING: ['IDLE', 'LISTENING', 'HAPPY', 'CONCERNED', 'APPOINTMENT', 'THINKING', 'WAITING'],
  HAPPY: ['IDLE', 'LISTENING', 'SPEAKING', 'WAITING'],
  CONCERNED: ['IDLE', 'LISTENING', 'SPEAKING', 'APPOINTMENT', 'URGENT', 'THINKING'],
  APPOINTMENT: ['IDLE', 'LISTENING', 'SPEAKING', 'HAPPY', 'THINKING'],
  URGENT: ['IDLE', 'LISTENING', 'SPEAKING', 'THINKING'],
  GOODBYE: ['IDLE', 'GREETING']
};

/* Which emotion each state wears, unless the inputs say otherwise. */
const STATE_EMOTION = {
  GREETING: 'happy', WAVE: 'happy', HAPPY: 'happy',
  CURIOUS: 'curious', CONCERNED: 'concerned', URGENT: 'concerned',
  TIRED: 'tired', SLEEPING: 'asleep', APPOINTMENT: 'caring'
};

export class UppiStateMachine {
  /**
   * @param {UppiAvatar} avatar
   * @param {Motion} motion
   */
  constructor(avatar, motion) {
    this.avatar = avatar;
    this.motion = motion;
    this.state = 'IDLE';
    this.inputs = Object.assign({}, DEFAULT_INPUTS);
    this.listeners = [];
    this._busy = false;
    this._speechSource = null;
  }

  onChange(fn) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((f) => f !== fn); };
  }

  _emit(next, from) {
    for (const fn of this.listeners) {
      try { fn(next, from); } catch { /* a listener must never break the machine */ }
    }
  }

  /* ---------------- inputs ---------------- */

  /**
   * Sets one input and lets the machine work out what that means. This is the
   * only way the rest of the application talks to the character.
   */
  set(name, value) {
    if (!(name in this.inputs)) return false;
    if (this.inputs[name] === value) return false;
    this.inputs[name] = value;
    this.resolve();
    return true;
  }

  /** Sets several inputs and resolves once, so a compound change is atomic. */
  setAll(values) {
    let changed = false;
    for (const k in values) {
      if (!(k in this.inputs)) continue;
      if (this.inputs[k] === values[k]) continue;
      this.inputs[k] = values[k];
      changed = true;
    }
    if (changed) this.resolve();
    return changed;
  }

  /** Fires a one-shot input. */
  fire(name) {
    if (TRIGGERS.indexOf(name) === -1) return false;
    this.inputs[name] = true;
    this.resolve();
    return true;
  }

  /* ---------------- resolution ---------------- */

  /*
   * Inputs → state, in priority order. Reading this list top to bottom is the
   * complete description of what Uppi will do in any situation, which is the
   * point of keeping it in one function.
   */
  target() {
    const i = this.inputs;
    if (i.isUrgent) return 'URGENT';
    if (i.triggerGoodbye) return 'GOODBYE';
    if (i.triggerGreeting) return 'GREETING';
    if (i.triggerWave) return 'WAVE';
    if (i.isTalking) return 'SPEAKING';
    if (i.isListening) return 'LISTENING';
    if (i.isThinking) return 'THINKING';
    if (i.triggerSleep || i.energy <= 0) return 'SLEEPING';
    if (i.isAppointment) return 'APPOINTMENT';
    if (i.energy <= 0.25) return 'TIRED';
    if (i.userInactive) return i.attention > 0.5 ? 'CURIOUS' : 'WAITING';
    if (i.emotion === 'concerned') return 'CONCERNED';
    if (i.emotion === 'happy') return 'HAPPY';
    return 'IDLE';
  }

  /** Moves to whatever the inputs currently imply. */
  resolve() {
    const next = this.target();
    for (const t of TRIGGERS) this.inputs[t] = false;
    if (next === this.state) return false;
    return this.to(next);
  }

  /**
   * Enters a state directly. Prefer `set`/`fire` — this exists for the entrance
   * sequence, which is a scripted run of states rather than a resolved one.
   *
   * @returns {boolean} whether the transition happened
   */
  to(next, payload) {
    if (STATES.indexOf(next) === -1) return false;
    if (next === this.state && next !== 'SPEAKING') return false;

    const allowed = ALLOWED[this.state] || [];
    if (next !== 'IDLE' && next !== 'URGENT' && next !== 'ENTRY' && allowed.indexOf(next) === -1) {
      /* Not something a visitor ever sees, but worth knowing in development: it
         means two parts of the app disagree about the flow. */
      if (typeof console !== 'undefined' && console.debug) console.debug('[uppi] ' + this.state + ' → ' + next + ' is not a declared transition; going through IDLE');
      this.state = 'IDLE';
    }

    const from = this.state;
    this.state = next;
    this._emit(next, from);
    this._apply(next, payload);
    return true;
  }

  _apply(next, payload) {
    const m = this.motion;
    try {
      this._motionFor(next, payload);
    } catch (err) {
      /* A character frozen in a half-finished pose is worse than one that
         missed a flourish, so a broken motion call falls back to resting
         rather than propagating out and stalling the sequence that called it. */
      if (typeof console !== 'undefined' && console.debug) console.debug('[uppi] motion failed for ' + next, err);
      try { m.startIdle(); } catch { /* nothing further to try */ }
    }
    /* The emotion the state implies, unless the conversation set a stronger
       one — a caring face on an appointment recommendation, for instance. */
    const e = STATE_EMOTION[next];
    if (e && next !== 'SPEAKING') this.avatar.setExpression(e);
  }

  _motionFor(next, payload) {
    const m = this.motion;
    switch (next) {
      /* WALKING and LANDING are driven by `enter()`, which awaits the movement
         it starts — there is nothing for the resolver to kick off here. */
      case 'WALKING':
      case 'LANDING': break;
      case 'WAVE': m.wave().then(() => { if (this.state === 'WAVE') this.resolve(); }); break;
      case 'GREETING': m.startGreeting(); break;
      case 'LISTENING': m.startListening(); break;
      case 'THINKING': m.startThinking(); break;
      case 'SPEAKING': m.startSpeaking(payload || this._speechSource || null); break;
      case 'CURIOUS': m.startCurious(); break;
      case 'HAPPY': m.startHappy(); break;
      case 'WAITING': m.startWaiting(); break;
      case 'TIRED': m.startTired(); break;
      case 'SLEEPING': m.startSleeping(); break;
      case 'CONCERNED':
      case 'URGENT': m.startConcerned(); break;
      case 'APPOINTMENT': m.startAppointment(); break;
      case 'GOODBYE': m.startGoodbye(); break;
      default: m.startIdle();
    }
  }

  /* ---------------- the scripted entrance (§5) ---------------- */

  /**
   * Off-screen right → run in → decelerate → land → settle → look at the
   * visitor → wave → speak. The one sequence that is scripted rather than
   * resolved, because it happens once and its order is the point.
   */
  async enter() {
    if (this._busy) return;
    this._busy = true;
    this.state = 'ENTRY';
    this._emit('ENTRY', 'IDLE');
    try {
      this.to('WALKING');
      await this.motion.runIn();
      this.to('LANDING');
      await this.motion.land();
      this.to('WAVE');
      await this.motion.wave();
      this.to('GREETING');
      this.motion.startGreeting();
    } finally {
      this._busy = false;
    }
  }

  /** Called when the greeting bubble is done: settle into the default idle. */
  settle() {
    if (this.state === 'GREETING' || this.state === 'WAVE') this.to('IDLE');
    else this.resolve();
  }

  /* ---------------- conversation bindings ---------------- */

  /** The speech source the SPEAKING state drives its mouth from. */
  setSpeechSource(source) { this._speechSource = source; }

  /**
   * Maps an assessment onto the inputs. One call, so urgency, emotion and the
   * appointment flag can never disagree with each other.
   */
  applyResult(result) {
    if (!result) return;
    const urgency = result.urgency;
    const emotion = result.emotion || (urgency === 'urgent' ? 'concerned' : 'caring');
    this.setAll({
      isUrgent: urgency === 'emergency',
      isAppointment: !!result.appointment_recommended && urgency !== 'emergency',
      emotion: urgency === 'urgent' ? 'concerned' : emotion,
      energy: 1,
      userInactive: false
    });
  }

  /** Nothing is wrong any more — clear the conversation-driven inputs. */
  clearResult() {
    this.setAll({ isUrgent: false, isAppointment: false, emotion: 'neutral' });
  }

  destroy() {
    this.listeners = [];
    this.motion.destroy();
  }
}

/* The previous name, kept so nothing that imported it breaks. */
export { UppiStateMachine as UppiStateController };
