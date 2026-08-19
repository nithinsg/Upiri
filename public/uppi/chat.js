/*
 * The Uppi interface.
 *
 * Builds the dock, the greeting bubble and the conversation panel, and wires
 * the character, the state machine, the voice layer and the conversation
 * together. Uppi is present on one side and the conversation runs alongside
 * him (§3) — a third of the interaction area on a desktop, a compact upper-body
 * strip above it on a phone.
 *
 * Nothing here decides anything medical. It renders what the pipeline returned
 * and asks the state machine for the right face.
 */

import { UppiAvatar } from './avatar.js';
import { UppiRiveAvatar, available as riveAvailable } from './avatar-rive.js';
import { Motion, prefersReducedMotion } from './motion.js';
import { UppiStateMachine } from './states.js';
import { Presence } from './presence.js';
import { TextToSpeech, SpeechInput, SPEECH_ERRORS } from './speech.js';
import { Conversation } from './conversation.js';
import { GREETING } from './core/compose.js';
import { CALL_CENTRE_DISPLAY, CALL_CENTRE_TEL, EMERGENCY_TEL, EMERGENCY_DISPLAY, BOOK_PATH, BOOK_LABEL, CALLBACK_LABEL, CALLBACK_PATH } from './core/contact.js';
import { track } from './analytics.js';

/* §4: conversation starters, not diagnosis buttons. */
const OPENERS = [
  "I'm having trouble breathing",
  "I've been coughing",
  'I hear a wheeze',
  'My asthma is getting worse',
  'I have chest discomfort',
  'I want to understand my symptoms',
  'I want to book an appointment'
];

const ICONS = {
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  mic: '<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
  stopMic: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.18 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  volumeOff: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>'
};

function icon(name, size) {
  return '<svg viewBox="0 0 24 24" width="' + (size || 18) + '" height="' + (size || 18) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
}

function elem(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

/* Uppi's replies are plain text with blank-line paragraphs and "• " bullets.
   Rendered as real elements rather than injected as markup, so nothing that
   comes back from the pipeline can ever be interpreted as HTML. */
function renderText(host, text) {
  const blocks = String(text || '').split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n');
    const bullets = lines.filter((l) => /^\s*•/.test(l));
    if (bullets.length && bullets.length === lines.filter((l) => l.trim()).length) {
      const ul = document.createElement('ul');
      ul.style.margin = '0 0 10px';
      ul.style.paddingLeft = '20px';
      for (const b of bullets) {
        const li = document.createElement('li');
        li.textContent = b.replace(/^\s*•\s*/, '');
        ul.appendChild(li);
      }
      host.appendChild(ul);
    } else {
      const p = document.createElement('p');
      p.textContent = block.trim();
      host.appendChild(p);
    }
  }
}

export class UppiChat {
  constructor() {
    this.conversation = new Conversation();
    this.tts = new TextToSpeech();
    this.open = false;
    this.busy = false;
    this.micOn = false;
    this.reduced = prefersReducedMotion();
    this.lastFocus = null;
    this.build();
  }

  /* ---------------- construction ---------------- */

  build() {
    const root = elem('div', 'uppi-root');
    root.dataset.uppi = 'root';
    this.root = root;

    /* --- the dock: Uppi, and the greeting bubble beside him --- */
    this.dock = elem('div', 'uppi-dock');
    this.bubble = elem('div', 'uppi-bubble');
    this.bubble.style.position = 'relative';
    this.bubble.hidden = true;

    this.launcher = elem('button', 'uppi-launcher');
    this.launcher.type = 'button';
    this.launcher.setAttribute('aria-label', 'Talk to Uppi, your lung partner');
    this.launcher.setAttribute('aria-haspopup', 'dialog');
    this.launcher.setAttribute('aria-expanded', 'false');

    this.stage = elem('div', 'uppi-stage');
    this.launcher.appendChild(this.stage);
    this.dock.appendChild(this.bubble);
    this.dock.appendChild(this.launcher);
    root.appendChild(this.dock);

    /* --- the panel --- */
    this.panel = elem('div', 'uppi-panel');
    this.panel.hidden = true;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Uppi, your lung partner');
    this.panel.setAttribute('aria-modal', 'false');
    this.panel.tabIndex = -1;

    const head = elem('div', 'uppi-head');
    head.appendChild(elem('span', 'uppi-head-name', 'Uppi'));
    head.appendChild(elem('span', 'uppi-head-role', 'your lung partner'));
    head.appendChild(elem('span', 'uppi-head-spacer'));
    this.clearBtn = elem('button', 'uppi-iconbtn', icon('trash'));
    this.clearBtn.type = 'button';
    this.clearBtn.title = 'Start a new conversation';
    this.clearBtn.setAttribute('aria-label', 'Start a new conversation');
    this.closeBtn = elem('button', 'uppi-iconbtn', icon('close'));
    this.closeBtn.type = 'button';
    this.closeBtn.title = 'Close';
    this.closeBtn.setAttribute('aria-label', 'Close Uppi');
    head.appendChild(this.clearBtn);
    head.appendChild(this.closeBtn);
    this.panel.appendChild(head);

    const body = elem('div', 'uppi-body');
    this.col = elem('div', 'uppi-col');
    this.col.style.position = 'relative';
    this.slot = elem('div', 'uppi-slot');
    this.status = elem('div', 'uppi-status');
    this.status.setAttribute('aria-live', 'polite');
    this.stopBtn = elem('button', 'uppi-stop', icon('volumeOff', 15) + ' Stop');
    this.stopBtn.type = 'button';
    this.stopBtn.hidden = true;
    this.stopBtn.setAttribute('aria-label', 'Stop Uppi speaking');
    this.col.appendChild(this.slot);
    this.col.appendChild(this.status);
    this.col.appendChild(this.stopBtn);
    body.appendChild(this.col);

    const convo = elem('div', 'uppi-convo');
    this.log = elem('div', 'uppi-log');
    this.log.setAttribute('role', 'log');
    this.log.setAttribute('aria-live', 'polite');
    this.log.setAttribute('aria-relevant', 'additions text');
    this.log.setAttribute('aria-label', 'Conversation with Uppi');
    this.suggest = elem('div', 'uppi-suggest');

    this.form = elem('form', 'uppi-form');
    this.field = elem('textarea', 'uppi-field');
    this.field.rows = 1;
    this.field.placeholder = 'Tell Uppi what’s bothering you…';
    this.field.setAttribute('aria-label', 'Your message to Uppi');
    this.micBtn = elem('button', 'uppi-round uppi-mic', icon('mic', 20));
    this.micBtn.type = 'button';
    this.micBtn.hidden = true;
    this.micBtn.setAttribute('aria-pressed', 'false');
    this.micBtn.setAttribute('aria-label', 'Speak to Uppi');
    this.sendBtn = elem('button', 'uppi-round uppi-send', icon('send', 19));
    this.sendBtn.type = 'submit';
    this.sendBtn.setAttribute('aria-label', 'Send');
    this.form.appendChild(this.field);
    this.form.appendChild(this.micBtn);
    this.form.appendChild(this.sendBtn);

    this.fine = elem('p', 'uppi-fine');
    this.fine.appendChild(document.createTextNode(
      'Uppi is a guide, not a doctor, and cannot diagnose. This conversation stays on your device and is cleared when you close the tab. In an emergency call ' + EMERGENCY_DISPLAY + '. '
    ));
    this.micNote = elem('span', null, 'Your microphone is only on while you are speaking to Uppi. ');
    this.micNote.hidden = true;
    this.fine.appendChild(this.micNote);
    const wipe = elem('button', null, 'Clear it now');
    wipe.type = 'button';
    this.fine.appendChild(wipe);
    this.wipeBtn = wipe;

    convo.appendChild(this.log);
    convo.appendChild(this.suggest);
    convo.appendChild(this.form);
    convo.appendChild(this.fine);
    body.appendChild(convo);
    this.panel.appendChild(body);
    root.appendChild(this.panel);

    /* --- the character --- */
    /*
     * One line, and the character asset is swappable (§32). `avatar-rive.js`
     * implements the same interface against a rigged Rive board and reports
     * itself unavailable until one is committed, so this reads as the vector
     * rig today and as the board the moment there is a board.
     */
    this.avatar = riveAvailable() ? new UppiRiveAvatar(this.stage) : new UppiAvatar(this.stage);
    this.motion = new Motion(this.avatar, this.stage);
    this.states = new UppiStateMachine(this.avatar, this.motion);
    this.presence = null;
    this.callbackForm = null;
    this.callbackReady = false;

    this.speech = new SpeechInput({
      onStart: () => { this.micOn = true; this.micBtn.setAttribute('aria-pressed', 'true'); this.micBtn.innerHTML = icon('stopMic', 18); this.setStatus('Listening', true); this.states.set('isListening', true); track('uppi_voice_started'); },
      onPartial: (t) => this.showInterim(t),
      onFinal: (t) => { this.clearInterim(); this.submit(t, 'voice'); },
      onEnd: () => { this.micOn = false; this.micBtn.setAttribute('aria-pressed', 'false'); this.micBtn.innerHTML = icon('mic', 20); },
      onError: (code) => {
        this.clearInterim();
        this.setStatus('');
        this.states.set('isListening', false);
        this.say(SPEECH_ERRORS[code] || SPEECH_ERRORS.failed, null, { speak: false });
        track('uppi_error', { reason: 'mic_' + code });
      }
    });

    this.wire();
  }

  wire() {
    this.launcher.addEventListener('click', () => this.openPanel());
    this.closeBtn.addEventListener('click', () => this.closePanel());
    this.clearBtn.addEventListener('click', () => this.reset());
    this.wipeBtn.addEventListener('click', () => this.reset());
    this.stopBtn.addEventListener('click', () => this.stopSpeaking());

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.field.value.trim();
      if (text) { this.field.value = ''; this.autosize(); this.submit(text, 'text'); }
    });

    /* Enter sends, Shift+Enter makes a new line — the convention people expect,
       but not on a touch keyboard where Enter is how you get a new line. */
    this.field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 761px)').matches) {
        e.preventDefault();
        this.form.requestSubmit();
      }
    });
    this.field.addEventListener('input', () => this.autosize());

    this.micBtn.addEventListener('click', () => {
      if (this.micOn) { this.speech.stop(); this.setStatus(''); this.states.set('isListening', false); }
      else { this.tts.stop(); this.speech.start(); track('uppi_chat_started', { mode: 'voice' }); }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (this.micOn) { this.speech.cancel(); this.setStatus(''); this.states.set('isListening', false); return; }
      if (this.tts.speaking) { this.stopSpeaking(); return; }
      if (this.open) this.closePanel();
    });

    /* iOS will not speak until the page has had a gesture; take the first one. */
    const unlock = () => { this.tts.unlock(); document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock); };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });

    /* §23: the on-screen keyboard must not cover the input. It changes both the
       height and the offset of the visual viewport, and pinching changes the
       offset alone, so both events matter. */
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => this.fitToViewport());
      window.visualViewport.addEventListener('scroll', () => this.fitToViewport());
    }
    window.addEventListener('resize', () => this.fitToViewport());

    /*
     * The call-back offer is only drawn if there is somewhere for a phone
     * number to go. Same rule as the microphone, and it matters more here: a
     * form that takes a worried patient's number and drops it is worse than no
     * form at all. Probed once, in the background, and remembered.
     */
    this.callbackReady = false;
    fetch(CALLBACK_PATH, { method: 'GET' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { this.callbackReady = !!(d && d.configured); })
      .catch(() => { this.callbackReady = false; });

    /* The microphone is only drawn if it can actually do something — and the
       line about what it does with your voice only appears alongside it (§26). */
    this.speech.available().then((ok) => {
      this.micBtn.hidden = !ok;
      if (ok) this.micNote.hidden = false;
    });
  }

  mount(host) {
    (host || document.body).appendChild(this.root);
    this.restoreLog();
  }

  /* ---------------- entrance and greeting ---------------- */

  async enter() {
    try { await this.states.enter(); }
    catch { /* the entrance is decoration; the companion still has to work */ }
    track('uppi_greeting', { source: 'entrance' });
    this.startPresence();
    /* Someone returning mid-conversation does not need introducing again. */
    if (!this.conversation.isEmpty) { this.showHint(); return; }
    this.greet();
  }

  greet() {
    this.showBubble(GREETING, 'Tell Uppi', 16000);
    /* spoken and shown at the same time (§5) */
    this.speakAs(GREETING);
    track('uppi_greeting');
  }

  /**
   * The speech bubble beside the dock. Used for the greeting and, rarely, for
   * one of the presence layer's offers of help (§7) — same component, so a
   * nudge can never look like a different kind of thing from Uppi talking.
   */
  showBubble(text, ctaLabel, dismissAfter) {
    if (this.open) return;
    if (this._bubbleTimer) { clearTimeout(this._bubbleTimer); this._bubbleTimer = null; }
    if (this.hint) { this.hint.remove(); this.hint = null; }
    this.bubble.hidden = false;
    this.bubble.innerHTML = '';
    const p = elem('p');
    p.textContent = text;
    this.bubble.appendChild(p);
    const cta = elem('button', 'uppi-bubble-cta', (ctaLabel || 'Tell Uppi') + icon('arrow', 15));
    cta.type = 'button';
    cta.addEventListener('click', () => this.openPanel());
    this.bubble.appendChild(cta);
    const x = elem('button', 'uppi-bubble-dismiss', '&times;');
    x.type = 'button';
    x.setAttribute('aria-label', 'Dismiss');
    x.addEventListener('click', (e) => { e.stopPropagation(); this.dismissBubble(); });
    this.bubble.appendChild(x);
    requestAnimationFrame(() => this.bubble.classList.add('is-in'));
    this._bubbleTimer = setTimeout(() => this.dismissBubble(), dismissAfter || 13000);
  }

  /** Anything the visitor does that means "I'm here" (§8). */
  wake() {
    if (this.presence) this.presence.wake();
    else this.states.setAll({ energy: 1, userInactive: false, attention: 1 });
  }

  dismissBubble() {
    if (this._bubbleTimer) { clearTimeout(this._bubbleTimer); this._bubbleTimer = null; }
    if (this.bubble.hidden) return;
    this.bubble.classList.remove('is-in');
    setTimeout(() => { this.bubble.hidden = true; this.showHint(); }, 260);
  }

  /**
   * Starts Uppi noticing the visitor (§7, §8). Deliberately after the entrance:
   * the inactivity clock should start when he arrives, not while he is still
   * running in.
   */
  startPresence() {
    if (this.presence) return;
    this.presence = new Presence(this.states, {
      /*
       * Overridable so the ladder can be tuned without a deploy, and so the
       * tests can drive minute-long timers in seconds. Anything absent falls
       * back to DEFAULT_TIMING in presence.js.
       */
      timing: (typeof window !== 'undefined' && window.__UPPI_PRESENCE_TIMING) || null,
      isOpen: () => this.open,
      isEngaged: () => this.conversation.messages.length > 0,
      anchor: () => this.stage,
      onNudge: (text, kind) => {
        this.showBubble(text, 'Ask Uppi', 12000);
        track('uppi_nudge', { kind });
      }
    });
  }

  /* the persistent, elegant access point of §24 — Uppi, with his name on it */
  showHint() {
    if (this.hint || this.open) return;
    this.hint = elem('span', 'uppi-hint', 'Ask Uppi');
    this.launcher.style.position = 'relative';
    this.launcher.appendChild(this.hint);
  }

  /* ---------------- panel ---------------- */

  openPanel() {
    if (this.open) return;
    this.open = true;
    this.wake();
    this.lastFocus = document.activeElement;
    this.dismissBubble();
    if (this.hint) { this.hint.remove(); this.hint = null; }

    /* one Uppi, moved between the dock and the panel, so his state and his
       animations carry across rather than restarting */
    this.slot.appendChild(this.stage);
    this.dock.hidden = true;
    this.panel.hidden = false;
    this.launcher.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => this.panel.classList.add('is-open'));
    this.fitToViewport();

    if (this.conversation.isEmpty && !this.log.children.length) this.say(GREETING, null, { speak: false });
    this.renderOpeners();
    this.wake();
    this.states.settle();
    /* Focus has to land inside the dialog for a keyboard or screen-reader user.
       On a desktop that is the input. On a touch device it is the dialog
       itself: focusing the textarea there throws up the keyboard before the
       visitor has asked for it and hides half of what just opened. */
    if (window.matchMedia('(min-width: 761px)').matches) this.field.focus({ preventScroll: true });
    else this.panel.focus({ preventScroll: true });
    track('uppi_opened', { source: 'launcher' });
  }

  closePanel() {
    if (!this.open) return;
    this.open = false;
    this.stopSpeaking();
    if (this.micOn) this.speech.cancel();
    this.panel.classList.remove('is-open');
    this.launcher.setAttribute('aria-expanded', 'false');
    setTimeout(() => {
      this.panel.hidden = true;
      this.stage.remove();
      this.launcher.appendChild(this.stage);
      this.dock.hidden = false;
      this.showHint();
      this.states.settle();
      /* Focus is restored only now. Calling focus() on the launcher while the
         dock is still hidden silently does nothing, and the visitor is left on
         <body> with nowhere to tab back to. */
      const back = (this.lastFocus && this.lastFocus.isConnected && this.lastFocus.focus) ? this.lastFocus : this.launcher;
      back.focus({ preventScroll: true });
    }, 220);
    if (this.conversation.messages.length) track('uppi_conversation_completed', { turns: this.conversation.messages.length });
  }

  /*
   * Sizes the panel against the space actually visible.
   *
   * The stylesheet's `min(90dvh, …)` is right on a normal phone, but `dvh` is
   * measured against the layout viewport and the keyboard does not change it —
   * so a sheet sized purely in CSS ends up with its input underneath the
   * keyboard (§23). `visualViewport` is the only thing that knows, and this is
   * the one place that reads it.
   */
  fitToViewport() {
    if (!this.open) return;
    const vv = window.visualViewport;
    const mobile = window.innerWidth <= 760;
    /* clearance kept above the panel: room for the site's header on a desktop,
       just a margin on a phone sheet */
    const gap = mobile ? 20 : 96;
    const cap = mobile ? 760 : 620;
    const inset = mobile ? 0 : 18;
    const visible = vv ? vv.height : document.documentElement.clientHeight;
    const h = Math.max(300, Math.min(cap, visible - gap));
    this.panel.style.height = h + 'px';

    if (!vv) { this.panel.style.top = ''; this.panel.style.bottom = ''; return; }
    /* The bottom edge is pinned by `top`, not by `bottom`. A fixed element's
       `bottom` resolves against the layout viewport, which on a phone is the
       tall one — the one that assumes the browser's own chrome has scrolled
       away — so `bottom: 0` can sit below what the visitor can actually see,
       and the keyboard moves the two apart again. visualViewport is the only
       thing that knows where the visible area really ends. */
    this.panel.style.top = Math.max(0, Math.round(vv.offsetTop + vv.height - h - inset)) + 'px';
    this.panel.style.bottom = 'auto';
  }

  /* ---------------- messages ---------------- */

  autosize() {
    this.field.style.height = 'auto';
    this.field.style.height = Math.min(120, this.field.scrollHeight) + 'px';
  }

  /* Deferred a frame: the openers strip reappears after a turn and takes height
     off the log, so a scroll computed before that lands short and leaves the
     last button — often the one to call the hospital — just below the fold. */
  scroll() {
    requestAnimationFrame(() => {
      this.log.scrollTo({ top: this.log.scrollHeight, behavior: this.reduced ? 'auto' : 'smooth' });
    });
  }

  addYou(text) {
    const m = elem('div', 'uppi-msg uppi-msg--you');
    m.textContent = text;
    this.log.appendChild(m);
    this.scroll();
    return m;
  }

  showInterim(text) {
    if (!text) return;
    if (!this._interim) {
      this._interim = elem('div', 'uppi-msg uppi-msg--you is-interim');
      this.log.appendChild(this._interim);
    }
    this._interim.textContent = text;
    this.scroll();
  }

  clearInterim() {
    if (this._interim) { this._interim.remove(); this._interim = null; }
  }

  /**
   * Renders one Uppi turn: the words, then the band, then the buttons.
   * @param {string} text
   * @param {object} result the structured pipeline response, when there is one
   */
  say(text, result, opts) {
    const o = opts || {};
    const wrap = elem('div', 'uppi-msg uppi-msg--uppi');
    const who = elem('span', 'uppi-who', 'Uppi');
    wrap.appendChild(who);

    if (result && result.emergency_recommended) {
      const alert = elem('div', 'uppi-alert');
      const head = elem('div', 'uppi-alert-head', icon('alert', 17) + '<span>' + (result.crisis ? 'Please talk to someone now' : 'This needs urgent attention') + '</span>');
      alert.appendChild(head);
      renderText(alert, text);
      wrap.appendChild(alert);
    } else {
      renderText(wrap, text);
    }

    if (result && result.band && result.band.label && result.urgency !== 'routine' && result.urgency !== 'insufficient' && !result.emergency_recommended) {
      const band = elem('span', 'uppi-band', result.band.label + (result.band.when ? ' · ' + result.band.when : ''));
      band.style.background = result.band.soft;
      band.style.color = result.band.color;
      wrap.appendChild(band);
    }

    const actions = this.renderActions(result);
    if (actions) wrap.appendChild(actions);

    this.log.appendChild(wrap);
    /* An urgent turn is scrolled so its FIRST line is at the top of the view.
       Scrolling to the bottom, as every other turn does, can leave the opening
       sentence — the one that says to go now — above the fold. */
    if (result && result.emergency_recommended) {
      this.log.scrollTo({ top: wrap.offsetTop - this.log.offsetTop - 8, behavior: this.reduced ? 'auto' : 'smooth' });
    } else {
      this.scroll();
    }
    if (o.speak !== false) this.speakAs(text);
    return wrap;
  }

  /*
   * Buttons are built from the action's `kind`, and every label is set as text
   * rather than markup. The response comes back over the network on a health
   * site — even though today's labels are our own constants, a label is never
   * a place to interpolate a string into innerHTML.
   *
   * A `route` whose href is not a path on this site is dropped rather than
   * rendered, so nothing upstream can turn a suggestion into an off-site link.
   */
  renderActions(result) {
    if (!result || !result.suggested_actions || !result.suggested_actions.length) return null;
    const row = elem('div', 'uppi-actions');

    const button = (cls, iconName, label, trailing) => {
      const a = elem('a', 'uppi-act' + (cls ? ' ' + cls : ''));
      if (!trailing) a.insertAdjacentHTML('afterbegin', icon(iconName, cls ? 17 : 16));
      const span = document.createElement('span');
      span.textContent = label;
      a.appendChild(span);
      if (trailing) a.insertAdjacentHTML('beforeend', icon(iconName, 15));
      return a;
    };

    for (const act of result.suggested_actions) {
      let node;
      if (act.kind === 'emergency') {
        node = button('uppi-act--emergency', 'phone', 'Call ' + EMERGENCY_DISPLAY + ' — emergency');
        node.href = 'tel:' + EMERGENCY_TEL;
        node.addEventListener('click', () => track('call_clicked', { category: 'emergency' }));
      } else if (act.kind === 'call') {
        /* §9: on a phone this must be a big, obviously tappable call button */
        node = button('uppi-act--call', 'phone', 'Call ' + CALL_CENTRE_DISPLAY);
        node.href = 'tel:' + CALL_CENTRE_TEL;
        node.addEventListener('click', () => track('call_clicked', { category: 'call-centre' }));
      } else if (act.kind === 'book') {
        node = button('uppi-act--book', 'calendar', BOOK_LABEL);
        node.href = BOOK_PATH;
        node.addEventListener('click', (e) => { track('appointment_clicked'); this.navigate(e, BOOK_PATH); });
      } else if (act.kind === 'callback') {
        /* dropped silently where no destination is configured */
        if (!this.callbackReady) continue;
        node = button('uppi-act--callback', 'phone', act.id === 'callback' && result.urgency === 'emergency' ? 'Also ask Yashoda to call me' : CALLBACK_LABEL);
        node.href = '#';
        node.addEventListener('click', (e) => { e.preventDefault(); this.openCallback(result); });
      } else if (act.kind === 'route' && typeof act.href === 'string' && /^\/[a-z0-9/-]*$/i.test(act.href)) {
        node = button('', 'arrow', String(act.label || 'Open'), true);
        node.href = act.href;
        node.addEventListener('click', (e) => this.navigate(e, act.href));
      } else {
        continue;
      }
      row.appendChild(node);
    }
    return row.children.length ? row : null;
  }

  /* ---------------- the call-back request (§15) ---------------- */

  /**
   * The form Uppi opens when someone takes him up on the offer.
   *
   * Two fields and a button. Anything longer is a barrier in front of someone
   * who is already unwell, and every extra field is another piece of a person
   * we would be storing for no reason.
   */
  openCallback(result) {
    if (this.callbackForm) { this.callbackForm.remove(); this.callbackForm = null; }
    track('callback_opened', { urgency: result && result.urgency });

    const form = elem('form', 'uppi-callback');
    this.callbackForm = form;

    const title = elem('p', 'uppi-callback-title', 'Leave your name and number');
    form.appendChild(title);

    const field = (labelText, type, name, placeholder, autocomplete) => {
      const wrap = elem('label', 'uppi-callback-field');
      const span = elem('span', null, labelText);
      const input = elem('input');
      input.type = type;
      input.name = name;
      input.required = name !== 'preferredTime';
      input.placeholder = placeholder;
      input.autocomplete = autocomplete;
      if (name === 'phone') { input.inputMode = 'tel'; input.maxLength = 20; }
      if (name === 'name') input.maxLength = 80;
      wrap.appendChild(span);
      wrap.appendChild(input);
      form.appendChild(wrap);
      return input;
    };

    const nameInput = field('Your name', 'text', 'name', 'Name', 'name');
    const phoneInput = field('Phone number', 'tel', 'phone', '10-digit mobile', 'tel');
    const timeInput = field('Best time to call (optional)', 'text', 'preferredTime', 'e.g. after 6pm', 'off');

    const status = elem('p', 'uppi-callback-status');
    status.setAttribute('role', 'status');
    status.hidden = true;

    const row = elem('div', 'uppi-callback-row');
    const submit = elem('button', 'uppi-act uppi-act--book');
    submit.type = 'submit';
    const submitLabel = document.createElement('span');
    submitLabel.textContent = 'Send to Yashoda';
    submit.appendChild(submitLabel);
    const cancel = elem('button', 'uppi-callback-cancel', 'Not now');
    cancel.type = 'button';
    cancel.addEventListener('click', () => { form.remove(); this.callbackForm = null; });
    row.appendChild(submit);
    row.appendChild(cancel);
    form.appendChild(row);

    /* What is passed on, in plain words. Asking for a phone number without
       saying where it goes is not a fair ask. */
    const fine = elem('p', 'uppi-callback-fine',
      'Your name and number go to the Yashoda call centre so they can ring you back, along with how soon Uppi thinks you should be seen. Nothing else from this conversation is sent.');
    form.appendChild(fine);
    form.appendChild(status);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submit.disabled) return;
      const name = nameInput.value.trim();
      const phone = phoneInput.value.trim();
      const say = (text, kind) => {
        status.hidden = false;
        status.textContent = text;
        status.className = 'uppi-callback-status' + (kind ? ' is-' + kind : '');
      };
      if (name.length < 2) { say('I just need a name to give them.', 'error'); nameInput.focus(); return; }
      if (phone.replace(/\D/g, '').length < 10) { say('That number looks short — could you check it?', 'error'); phoneInput.focus(); return; }

      submit.disabled = true;
      submitLabel.textContent = 'Sending…';
      try {
        const res = await fetch(CALLBACK_PATH, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name,
            phone,
            preferredTime: timeInput.value.trim(),
            urgency: result && result.urgency,
            urgencyLabel: result && result.band ? result.band.label : null
          })
        });
        if (!res.ok) throw new Error('http_' + res.status);
        form.remove();
        this.callbackForm = null;
        /* Uppi says it back, rather than a toast — he made the offer, so he is
           the one who confirms it. */
        this.say('Done — I\'ve passed your details to the Yashoda team' + (timeInput.value.trim() ? ' with your preferred time' : '') +
          '. Someone will call you on that number. If you\'d rather not wait, you can ring them yourself on ' + CALL_CENTRE_DISPLAY + '.', null, { speak: false });
        track('callback_submitted', { urgency: result && result.urgency });
        this.scroll();
      } catch {
        submit.disabled = false;
        submitLabel.textContent = 'Send to Yashoda';
        say('I couldn\'t get that through just now. Please call ' + CALL_CENTRE_DISPLAY + ' and they\'ll help straight away.', 'error');
        track('uppi_error', { reason: 'callback_failed' });
      }
    });

    this.log.appendChild(form);
    this.scroll();
    nameInput.focus({ preventScroll: true });
  }

  /* Routes inside the ŪPIRI app rather than reloading it, and falls back to a
     normal navigation if anything about that fails. */
  navigate(e, href) {
    try {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0 });
      this.closePanel();
    } catch {
      window.location.href = href;
    }
  }

  renderOpeners() {
    this.suggest.innerHTML = '';
    const list = this.conversation.isEmpty ? OPENERS : OPENERS.slice(0, 3).concat(['I want to book an appointment']);
    for (const text of list) {
      const chip = elem('button', 'uppi-chip', '');
      chip.type = 'button';
      chip.textContent = text;
      chip.addEventListener('click', () => {
        track('uppi_symptom_category_selected', { category: text.slice(0, 40) });
        this.submit(text, 'chip');
      });
      this.suggest.appendChild(chip);
    }
    this.suggest.hidden = false;
  }

  /* ---------------- the turn ---------------- */

  async submit(text, source) {
    if (this.busy) return;
    if (!this.open) this.openPanel();
    this.busy = true;
    this.sendBtn.disabled = true;
    this.stopSpeaking();
    this.suggest.hidden = true;
    this.addYou(text);
    if (source !== 'voice') track('uppi_chat_started', { mode: 'text', source: source || 'text' });

    /*
     * §20: Uppi thinks visibly rather than showing a spinner — and the thinking
     * beat has to be long enough to read as thought. Without a floor, a cached
     * or rules-only answer returns in ~10ms and the character snaps between two
     * poses, which looks like a glitch rather than like someone considering
     * what you said. A fifth of a second is enough to register and short enough
     * that nobody waits for it.
     */
    const startedAt = Date.now();
    let urgentSeen = false;
    const result = await this.conversation.send(text, (stage) => {
      if (stage === 'urgent') { urgentSeen = true; this.setStatus('Urgent'); this.states.set('isUrgent', true); }
      else { this.setStatus('Thinking'); this.states.set('isThinking', true); }
    });
    const elapsed = Date.now() - startedAt;
    if (!urgentSeen && elapsed < 420) await new Promise((r) => setTimeout(r, 420 - elapsed));

    this.busy = false;
    this.sendBtn.disabled = false;
    this.setStatus('');
    this.states.set('isThinking', false);
    if (!result) { this.states.resolve(); return; }

    /* The face is chosen from the triage band and the engine's emotion, never
       from the words — one call, so the expression cannot contradict the
       advice (§23). */
    this.states.applyResult(result);

    this.say(result.response, result);

    if (result.emergency_recommended) track('urgent_state_triggered', { urgency: result.urgency });
    if (result.appointment_recommended) track('appointment_recommended', { urgency: result.urgency, engine: result.engine });
    if (result.offline) track('uppi_error', { reason: 'backend_unreachable' });
    /* §7: an urgent answer gets the screen to itself. Offering "I've been
       coughing" underneath "go to A&E now" is exactly the burial the brief
       warns about, so the openers stay away until the visitor says something
       else. */
    if (!result.emergency_recommended) { this.renderOpeners(); this.scroll(); }
  }

  /* ---------------- speech ---------------- */

  /**
   * Speaks a reply and drives the mouth from it. The state machine is told
   * SPEAKING so the rig animates; when the voice finishes it settles back into
   * whatever the triage result called for.
   */
  speakAs(text) {
    if (!this.tts.supported) {
      /* §27: no voice available — the text is already on screen, so nothing is
         lost; Uppi just does not read it out. */
      this.states.resolve();
      return;
    }
    this.stopBtn.hidden = false;
    const source = this.tts.source();
    if (source) source.text = text;
    this.states.setSpeechSource(source);
    this.states.set('isTalking', true);
    track('uppi_voice_started', { mode: 'tts' });
    this.tts.speak(text, {
      onEnd: () => {
        this.stopBtn.hidden = true;
        this.states.setSpeechSource(null);
        this.states.set('isTalking', false);
        track('uppi_voice_completed');
      }
    });
  }

  stopSpeaking() {
    if (!this.tts.speaking) { this.stopBtn.hidden = true; return; }
    this.tts.stop();
    this.stopBtn.hidden = true;
    this.states.setSpeechSource(null);
    this.states.set('isTalking', false);
    track('uppi_speech_stopped');
  }

  setStatus(label, listening) {
    this.status.innerHTML = '';
    this.status.classList.toggle('is-listening', !!listening);
    if (!label) return;
    const dot = elem('span', 'uppi-status-dot');
    this.status.appendChild(dot);
    this.status.appendChild(document.createTextNode(label));
    if (listening) {
      const meter = elem('span', 'uppi-meter', '<span></span><span></span><span></span><span></span>');
      this.status.appendChild(meter);
    }
  }

  /* ---------------- session ---------------- */

  restoreLog() {
    for (const m of this.conversation.messages) {
      if (m.role === 'user') this.addYou(m.content);
      else this.say(m.content, null, { speak: false });
    }
  }

  reset() {
    this.stopSpeaking();
    this.conversation.clear();
    this.log.innerHTML = '';
    this.say(GREETING, null, { speak: false });
    this.renderOpeners();
    this.wake();
    this.states.settle();
    this.field.focus({ preventScroll: true });
    track('uppi_conversation_cleared');
  }

  destroy() {
    if (this.presence) { this.presence.destroy(); this.presence = null; }
    this.states.destroy();
    this.tts.stop();
    this.speech.cancel();
    this.root.remove();
  }
}
