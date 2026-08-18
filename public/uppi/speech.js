/*
 * Voice in and voice out.
 *
 * Both directions are written as an abstraction with a browser-native
 * implementation and a replaceable server implementation behind it, because
 * that is what the brief asks for (§12, §16) and because neither browser API
 * is universally available:
 *
 *   SpeechRecognition is Chrome, Edge and Safari — not Firefox.
 *   speechSynthesis is everywhere, but on iOS it will not start without a
 *   user gesture.
 *
 * So: the browser path is tried first because it is instant and free, the
 * server path takes over where it cannot work, and if neither can, the control
 * is not rendered at all. A microphone button that does nothing is worse than
 * no microphone button.
 *
 * Typing is always available. Voice is never the only way in (§25).
 */

/* ---------------------------------------------------------------------------
   Text to speech
   --------------------------------------------------------------------------- */

const VOICE_PREFS = [
  /* An Indian-neutral English voice first, which is what §16 asks for, then the
     nearest neighbours. Named voices that tend to be the calmer, less
     sing-song option on each platform are preferred within a locale. */
  (v) => /en[-_]IN/i.test(v.lang) && /neural|natural|google|premium|enhanced/i.test(v.name),
  (v) => /en[-_]IN/i.test(v.lang),
  (v) => /en[-_]GB/i.test(v.lang) && /neural|natural|google|premium|enhanced/i.test(v.name),
  (v) => /en[-_]GB/i.test(v.lang),
  (v) => /en[-_]AU/i.test(v.lang),
  (v) => /^en/i.test(v.lang) && /neural|natural|google/i.test(v.name),
  (v) => /^en/i.test(v.lang)
];

export class TextToSpeech {
  constructor() {
    this.mode = 'browser';
    this.voice = null;
    this.utterance = null;
    this.audio = null;
    this.ctx = null;
    this.analyser = null;
    this.buffer = null;
    this._char = null;
    this._unlocked = false;
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    if (this.supported) this._loadVoices();
    /* Asked once, in the background, so the first thing Uppi says is not
       delayed by finding out whether there is a hosted voice to say it with. */
    this._serverReady = fetch('/api/uppi/speak', { method: 'GET' })
      .then((r) => r.json())
      .then((d) => !!(d && d.configured))
      .catch(() => false);
  }

  _loadVoices() {
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || !voices.length) return;
      for (const test of VOICE_PREFS) {
        const hit = voices.find(test);
        if (hit) { this.voice = hit; return; }
      }
      this.voice = voices[0];
    };
    pick();
    /* Chrome populates the list asynchronously, once. */
    try { window.speechSynthesis.addEventListener('voiceschanged', pick, { once: false }); } catch { /* older API */ }
  }

  /**
   * iOS will not speak until the page has had a real gesture. Call this from
   * the first tap or key press so the greeting can be heard on a phone.
   */
  unlock() {
    if (this._unlocked || !this.supported) return;
    try {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis.speak(u);
      this._unlocked = true;
    } catch { /* nothing to unlock */ }
  }

  /**
   * Speaks, and resolves when the speech finishes or is stopped.
   * @param {string} text
   * @param {object} opts { onStart, onEnd, server }
   */
  async speak(text, opts) {
    const o = opts || {};
    this.stop();
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) { if (o.onEnd) o.onEnd(); return; }

    /* A hosted voice, when one is configured, gives real amplitude to animate
       the mouth against. */
    if (o.server !== false && this.mode !== 'browser-only' && await this._serverReady) {
      const ok = await this._speakServer(clean, o);
      if (ok) return;
    }
    await this._speakBrowser(clean, o);
  }

  async _speakServer(text, o) {
    try {
      const res = await fetch('/api/uppi/speak', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!res.ok) { this.mode = 'browser-only'; return false; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.audio = audio;
      this._attachAnalyser(audio);
      if (o.onStart) o.onStart();
      await audio.play();
      await new Promise((resolve) => {
        audio.addEventListener('ended', resolve, { once: true });
        audio.addEventListener('error', resolve, { once: true });
      });
      URL.revokeObjectURL(url);
      this.audio = null;
      if (o.onEnd) o.onEnd();
      return true;
    } catch {
      this.mode = 'browser-only';
      return false;
    }
  }

  /* Real level metering, so the mouth follows the actual waveform rather than
     a timer, whenever we have audio to measure. */
  _attachAnalyser(audio) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!this.ctx) this.ctx = new Ctx();
      const src = this.ctx.createMediaElementSource(audio);
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      analyser.connect(this.ctx.destination);
      this.analyser = analyser;
      this.buffer = new Uint8Array(analyser.frequencyBinCount);
    } catch { this.analyser = null; }
  }

  _speakBrowser(text, o) {
    if (!this.supported) { if (o.onEnd) o.onEnd(); return Promise.resolve(); }
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; }
      else u.lang = 'en-IN';
      /* §16: warm, calm, clear. Slightly under natural pace and barely above
         default pitch reads as unhurried rather than as a children's cartoon. */
      u.rate = 0.97;
      u.pitch = 1.04;
      u.volume = 1;
      this.utterance = u;
      this._char = null;

      u.onstart = () => { if (o.onStart) o.onStart(); };
      /* the character currently being spoken drives the viseme */
      u.onboundary = (e) => { this._char = text.charAt(e.charIndex) || null; };
      const done = () => {
        if (this.utterance === u) { this.utterance = null; this._char = null; }
        if (o.onEnd) o.onEnd();
        resolve();
      };
      u.onend = done;
      u.onerror = done;

      try { window.speechSynthesis.speak(u); }
      catch { done(); }
    });
  }

  stop() {
    try { if (this.supported) window.speechSynthesis.cancel(); } catch { /* ignore */ }
    if (this.audio) { try { this.audio.pause(); } catch { /* ignore */ } this.audio = null; }
    this.utterance = null;
    this._char = null;
    this.analyser = null;
  }

  get speaking() {
    if (this.audio && !this.audio.paused) return true;
    try { return this.supported && window.speechSynthesis.speaking; } catch { return false; }
  }

  /** The source the motion layer reads to animate the mouth. */
  source() {
    return {
      getLevel: () => {
        if (!this.analyser || !this.buffer) return null;
        this.analyser.getByteTimeDomainData(this.buffer);
        let sum = 0;
        for (let i = 0; i < this.buffer.length; i++) {
          const v = (this.buffer[i] - 128) / 128;
          sum += v * v;
        }
        return Math.min(1, Math.sqrt(sum / this.buffer.length) * 3.4);
      },
      getChar: () => this._char
    };
  }
}

/* ---------------------------------------------------------------------------
   Speech to text
   --------------------------------------------------------------------------- */

const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export class SpeechInput {
  constructor(handlers) {
    this.h = handlers || {};
    this.recognition = null;
    this.recorder = null;
    this.stream = null;
    this.listening = false;
    this.mode = SR ? 'browser' : 'server';
    this._serverReady = null;
  }

  /**
   * Whether a microphone can actually do anything here. Resolves false when
   * there is no browser recogniser AND no configured server transcriber, which
   * is the signal to not render the button at all.
   */
  async available() {
    if (SR) return true;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices) return false;
    if (this._serverReady === null) {
      try {
        const res = await fetch('/api/uppi/transcribe', { method: 'GET' });
        const data = await res.json().catch(() => ({}));
        this._serverReady = !!data.configured;
      } catch { this._serverReady = false; }
    }
    return this._serverReady;
  }

  async start() {
    if (this.listening) return;
    this.listening = true;
    this._cancelled = false;
    if (SR) return this._startBrowser();
    return this._startRecorder();
  }

  _startBrowser() {
    const r = new SR();
    this.recognition = r;
    /* Indian English first — it is what most visitors here will speak, and the
       recogniser handles local place and medicine names far better for it. */
    r.lang = 'en-IN';
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;

    let finalText = '';
    r.onstart = () => this._emit('onStart');
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      this._emit('onPartial', (finalText + interim).trim());
    };
    r.onerror = (e) => {
      this.listening = false;
      const code = e && e.error;
      this._emit('onError', code === 'not-allowed' || code === 'service-not-allowed' ? 'permission' : code === 'no-speech' ? 'no-speech' : 'failed');
    };
    r.onend = () => {
      this.listening = false;
      this._emit('onEnd');
      const text = finalText.trim();
      if (text) this._emit('onFinal', text);
      else if (!this._cancelled) this._emit('onError', 'no-speech');
    };
    try { r.start(); }
    catch { this.listening = false; this._emit('onError', 'failed'); }
  }

  async _startRecorder() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.listening = false;
      this._emit('onError', 'permission');
      return;
    }
    const chunks = [];
    const rec = new MediaRecorder(this.stream);
    this.recorder = rec;
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = async () => {
      this._release();
      this._emit('onEnd');
      if (this._cancelled) return;
      if (!chunks.length) { this._emit('onError', 'no-speech'); return; }
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      try {
        const res = await fetch('/api/uppi/transcribe', {
          method: 'POST',
          headers: { 'content-type': blob.type },
          body: blob
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.text) this._emit('onFinal', data.text);
        else this._emit('onError', data.error === 'stt_no_speech' ? 'no-speech' : 'failed');
      } catch {
        this._emit('onError', 'failed');
      }
    };
    rec.start();
    this._emit('onStart');
    /* A lobby question is a sentence, not a monologue. The cap also bounds what
       is ever uploaded (§26). */
    this._cap = setTimeout(() => this.stop(), 20000);
  }

  stop() {
    if (this._cap) { clearTimeout(this._cap); this._cap = null; }
    if (this.recognition) { try { this.recognition.stop(); } catch { /* already stopped */ } }
    if (this.recorder && this.recorder.state !== 'inactive') { try { this.recorder.stop(); } catch { /* ignore */ } }
    this.listening = false;
  }

  /** Abandons the current attempt without submitting anything. */
  cancel() {
    /* A flag, not a rewrite of the handler table: replacing `this.h` here would
       silently disable onFinal for every later attempt too, and the microphone
       would go quiet for the rest of the session after one cancel. */
    this._cancelled = true;
    if (this.recognition) { try { this.recognition.abort(); } catch { /* ignore */ } }
    this.stop();
    this._release();
  }

  /** Fires a handler unless this attempt was abandoned. */
  _emit(name, arg) {
    if (this._cancelled && (name === 'onFinal' || name === 'onPartial')) return;
    if (this.h[name]) this.h[name](arg);
  }

  _release() {
    if (this.stream) {
      for (const track of this.stream.getTracks()) { try { track.stop(); } catch { /* ignore */ } }
      this.stream = null;
    }
    this.recorder = null;
    this.listening = false;
  }
}

/** Messages for the failure states §27 names, in Uppi's voice. */
export const SPEECH_ERRORS = {
  permission: "That's okay — you can type your question instead.",
  'no-speech': "I didn't quite catch that. Could you say that again?",
  failed: "My hearing isn't working just now — typing will get us there just as well."
};
