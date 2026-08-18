/*
 * The Rive adapter (§3, §32).
 *
 * WHAT THIS IS
 * A drop-in replacement for `UppiAvatar` that drives a rigged Rive board
 * instead of the runtime-generated SVG. It implements exactly the same
 * interface, so swapping the character is one line in `chat.js`:
 *
 *     import { UppiAvatar } from './avatar.js';        // vector rig
 *     import { UppiRiveAvatar as UppiAvatar } from './avatar-rive.js';
 *
 * WHY IT IS HERE WITH NO .riv FILE
 * There is no Rive board in this repository, and one cannot be authored from
 * code: a .riv is the output of the Rive editor, from artwork that has been
 * drawn, boned and given a state machine by a designer. Rather than pretend
 * otherwise, this file is the CONTRACT that board has to satisfy — written,
 * committed and testable — so the day the board arrives, the work is dropping
 * in a file and flipping an import, not re-planning the integration.
 *
 * The three layers the brief asks to be kept apart are already apart:
 *
 *   CHARACTER ASSET     avatar.js (vector rig) — or a .riv, through this file
 *   ANIMATION SYSTEM    states.js + motion.js — inputs in, behaviour out
 *   WEBSITE RUNTIME     chat.js, presence.js — sets inputs, never poses
 *
 * `states.js` already speaks in Rive's own vocabulary: it sets named inputs
 * (`isTalking`, `energy`, `emotion`…) rather than calling animations. That was
 * the point of building it that way.
 *
 * WHAT THE BOARD MUST EXPOSE
 * One artboard, one state machine, and these inputs — the same names
 * `DEFAULT_INPUTS` in states.js uses:
 *
 *   boolean   isTalking, isListening, isThinking, isUrgent, isAppointment,
 *             userInactive, scrolling
 *   number    attention (0…1), energy (0…1), emotion (see EMOTION_INDEX below),
 *             viseme (see VISEME_INDEX), lids (0…1), lookX (−1…1), lookY (−1…1),
 *             browAngle (degrees), poseLeft, poseRight (see POSE_INDEX)
 *   trigger   triggerWave, triggerGreeting, triggerSleep, triggerGoodbye,
 *             triggerBlink
 *
 * Numbers rather than strings because Rive inputs are booleans, numbers and
 * triggers only; the index tables below are the agreed mapping and must match
 * the board.
 *
 * PERFORMANCE (§25)
 * The runtime is imported dynamically and only when a board is actually
 * configured, so a visitor whose site has no .riv pays nothing for this file
 * beyond its own few kilobytes. Keep the board small; prefer one artboard with
 * a single state machine over several.
 */

/* The agreed numeric mappings. Change them here AND in the Rive board, never
   in only one of the two. */
export const VISEME_INDEX = {
  neutral: 0, ai: 1, aa: 2, o: 3, u: 4, mbp: 5, fv: 6, l: 7, sh: 8, th: 9,
  /* expression mouths */
  smile: 10, soft: 11, small: 12, concerned: 13, yawn: 14
};

export const EMOTION_INDEX = {
  neutral: 0, happy: 1, caring: 2, curious: 3, concerned: 4, tired: 5, asleep: 6,
  listening: 7, thinking: 8, speaking: 9, default: 0
};

export const POSE_INDEX = {
  rest: 0, hip: 1, wave: 2, point: 3, chin: 4
};

/* Where the board is served from. Null until a real one is committed — and
   `available()` returning false is what keeps `boot.js` on the vector rig. */
export const RIVE_SRC = null;

/** Whether a board is configured at all. Nothing here runs when it is not. */
export function available() {
  return typeof RIVE_SRC === 'string' && RIVE_SRC.length > 0;
}

export class UppiRiveAvatar {
  /**
   * @param {HTMLElement} host
   * @param {object} [opts] { src, artboard, stateMachine }
   */
  constructor(host, opts) {
    const o = opts || {};
    this.host = host;
    this.src = o.src || RIVE_SRC;
    this.artboard = o.artboard || 'Uppi';
    this.stateMachine = o.stateMachine || 'Uppi';
    this.ready = false;
    this._queue = [];
    this._pose = { left: 'hip', right: 'rest' };
    this._mouth = 'smile';
    this._lid = 0;

    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Uppi, a friendly pair of lungs in a navy Yashoda hoodie');
    this.canvas.style.cssText = 'width:100%;height:100%;display:block';
    host.appendChild(this.canvas);
    /* the SVG rig exposes `svg`; callers that measure the character read it */
    this.svg = this.canvas;
    this.parts = { svg: this.canvas };

    this._load();
  }

  async _load() {
    if (!this.src) return;
    try {
      /* Dynamic, so the runtime is fetched only where a board exists. */
      const rive = await import(/* @vite-ignore */ '@rive-app/canvas');
      this.rive = new rive.Rive({
        src: this.src,
        canvas: this.canvas,
        artboard: this.artboard,
        stateMachines: this.stateMachine,
        autoplay: true,
        onLoad: () => {
          this.inputs = {};
          for (const input of this.rive.stateMachineInputs(this.stateMachine) || []) this.inputs[input.name] = input;
          this.ready = true;
          for (const fn of this._queue) { try { fn(); } catch { /* a queued call must not break load */ } }
          this._queue = [];
        }
      });
    } catch {
      /* A missing runtime or a broken board must never leave the visitor with
         no character: `boot.js` checks `available()` first, and anything that
         still goes wrong here leaves an empty canvas rather than an exception. */
      this.ready = false;
    }
  }

  _set(name, value) {
    if (!this.ready) { this._queue.push(() => this._set(name, value)); return; }
    const input = this.inputs && this.inputs[name];
    if (!input) return;
    if (typeof value === 'boolean') input.value = value;
    else if (typeof value === 'number') input.value = value;
  }

  _fire(name) {
    if (!this.ready) { this._queue.push(() => this._fire(name)); return; }
    const input = this.inputs && this.inputs[name];
    if (input && typeof input.fire === 'function') input.fire();
  }

  /* ---------------- the same interface as the vector rig ---------------- */

  setMouth(name) {
    this._mouth = name;
    this._set('viseme', VISEME_INDEX[name] == null ? VISEME_INDEX.neutral : VISEME_INDEX[name]);
  }

  setViseme(name) { this.setMouth(name); }

  get mouth() { return this._mouth; }

  setEyes(mode) { this._set('eyes', mode === 'wide' ? 1 : mode === 'narrow' ? -1 : 0); }

  setLids(amount) {
    this._lid = Math.max(0, Math.min(1, amount));
    this._set('lids', this._lid);
  }

  get lids() { return this._lid; }

  blink() {
    this._fire('triggerBlink');
    /* the board owns the timing; the promise keeps the caller's contract */
    return new Promise((resolve) => setTimeout(resolve, 180));
  }

  look(x, y) {
    this._set('lookX', Math.max(-1, Math.min(1, x)));
    this._set('lookY', Math.max(-1, Math.min(1, y)));
  }

  setBrows(deg) { this._set('browAngle', deg); }

  setPose(side, name) {
    if (POSE_INDEX[name] == null) return;
    this._pose[side] = name;
    this._set(side === 'left' ? 'poseLeft' : 'poseRight', POSE_INDEX[name]);
  }

  get pose() { return { left: this._pose.left, right: this._pose.right }; }

  setExpression(name) {
    this._set('emotion', EMOTION_INDEX[name] == null ? EMOTION_INDEX.neutral : EMOTION_INDEX[name]);
  }

  destroy() {
    try { if (this.rive) this.rive.cleanup(); } catch { /* already gone */ }
    if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  }
}
