/*
 * Uppi's state machine (§15).
 *
 * One place decides what Uppi is doing, and everything else asks it to change
 * — the chat never reaches into the rig or the motion layer directly. That
 * separation is what makes the character coherent: if the microphone opens,
 * Uppi listens, whatever else is happening; if an urgent triage result comes
 * back, he is concerned before the text is on screen.
 *
 * Transitions are declared rather than implied, so an illegal one (SPEAKING
 * straight from ENTRY, say) is a caught bug and not a stuck animation.
 */

export const STATES = [
  'IDLE', 'ENTRY', 'GREETING', 'LISTENING', 'THINKING',
  'SPEAKING', 'HAPPY', 'CONCERNED', 'APPOINTMENT', 'URGENT', 'GOODBYE'
];

/* Where each state is allowed to go next. Anything can fall back to IDLE, and
   URGENT is reachable from everywhere — an emergency does not wait its turn. */
const ALLOWED = {
  ENTRY: ['GREETING', 'IDLE'],
  GREETING: ['SPEAKING', 'IDLE', 'LISTENING'],
  IDLE: ['LISTENING', 'THINKING', 'SPEAKING', 'HAPPY', 'GREETING', 'GOODBYE'],
  LISTENING: ['THINKING', 'IDLE', 'SPEAKING'],
  THINKING: ['SPEAKING', 'APPOINTMENT', 'URGENT', 'CONCERNED', 'IDLE'],
  SPEAKING: ['IDLE', 'LISTENING', 'HAPPY', 'CONCERNED', 'APPOINTMENT', 'THINKING'],
  HAPPY: ['IDLE', 'LISTENING', 'SPEAKING'],
  CONCERNED: ['IDLE', 'LISTENING', 'SPEAKING', 'APPOINTMENT', 'URGENT'],
  APPOINTMENT: ['IDLE', 'LISTENING', 'SPEAKING', 'HAPPY'],
  URGENT: ['IDLE', 'LISTENING', 'SPEAKING'],
  GOODBYE: ['IDLE', 'GREETING']
};

export class UppiStateController {
  /**
   * @param {UppiAvatar} avatar
   * @param {Motion} motion
   */
  constructor(avatar, motion) {
    this.avatar = avatar;
    this.motion = motion;
    this.state = 'IDLE';
    this.listeners = [];
  }

  onChange(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter((f) => f !== fn); }; }

  /**
   * Moves to a state. `payload` carries whatever that state needs — the speech
   * source for SPEAKING, for instance.
   * @returns {boolean} whether the transition happened
   */
  async to(next, payload) {
    if (!STATES.includes(next)) return false;
    if (next === this.state && next !== 'SPEAKING') return false;
    const allowed = ALLOWED[this.state] || [];
    if (next !== 'IDLE' && next !== 'URGENT' && next !== 'ENTRY' && !allowed.includes(next)) {
      /* Not an error the visitor should ever see, but worth knowing about in
         development — it means two parts of the app disagree about the flow. */
      console.warn('[uppi] ignoring ' + this.state + ' → ' + next);
      return false;
    }

    const from = this.state;
    this.state = next;
    for (const fn of this.listeners) { try { fn(next, from); } catch { /* a listener must not break the machine */ } }

    switch (next) {
      case 'ENTRY':
        await this.motion.enter();
        this.state = 'IDLE';
        for (const fn of this.listeners) { try { fn('IDLE', 'ENTRY'); } catch { /* ignore */ } }
        break;
      case 'GREETING':
      case 'HAPPY':
        this.avatar.setExpression('happy');
        this.motion.startIdle();
        break;
      case 'LISTENING':
        this.motion.startListening();
        break;
      case 'THINKING':
        this.motion.startThinking();
        break;
      case 'SPEAKING':
        this.motion.startSpeaking(payload || null);
        break;
      case 'CONCERNED':
      case 'URGENT':
        this.motion.stopSpeaking();
        this.motion.startConcerned();
        break;
      case 'APPOINTMENT':
        this.motion.stopSpeaking();
        this.avatar.setExpression('idle');
        this.motion.startIdle();
        break;
      case 'GOODBYE':
        this.motion.stopSpeaking();
        this.avatar.setExpression('happy');
        this.motion.startIdle();
        break;
      default:
        this.motion.stopSpeaking();
        this.avatar.setExpression('idle');
        this.motion.startIdle();
    }
    return true;
  }

  /** Maps a triage urgency onto the face Uppi should be wearing. */
  stateForUrgency(urgency) {
    if (urgency === 'emergency') return 'URGENT';
    if (urgency === 'urgent') return 'CONCERNED';
    if (urgency === 'doctor') return 'APPOINTMENT';
    return 'IDLE';
  }

  destroy() { this.listeners = []; this.motion.destroy(); }
}
