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

/*
 * Uppi is a young man, and he should sound like one.
 *
 * The Web Speech API does not expose a voice's gender, so the only signal is
 * the name — stable enough per platform to be worth matching. These are the
 * male voices actually shipped for the locales this site serves:
 *
 *   Android / Chrome    the Google network and local voices
 *   Windows             Ravi, Prabhat, Mark, Guy, George, Ryan, Brian
 *   macOS / iOS         Rishi, Daniel, Alex, Aaron, Tom, Oliver, Arthur
 *   Samsung and others  often literally "male" in the name
 *
 * It is a preference, never a requirement. A device that only ships a female
 * voice for a language still gets a voice: the wrong timbre is far better than
 * a silent Uppi.
 */
const MALE_NAME = /\b(male|man)\b|ravi|prabhat|rishi|daniel|alex|aaron|tom|oliver|arthur|mark|guy|george|ryan|brian|liam|nathan|kumar|hemant|madhur|niranjan|sandeep/i;
const FEMALE_NAME = /\b(female|woman)\b|heera|kalpana|swara|veena|samantha|karen|moira|tessa|fiona|victoria|zira|hazel|susan|catherine|linda|aria|jenny|neerja|shruti|sapna|priya/i;
const GOOD_ENGINE = /neural|natural|google|premium|enhanced|network|siri/i;

/*
 * Which locales to try for each site language, best first.
 *
 * Telugu falls back to Hindi before English on purpose: a device with no Telugu
 * voice has to read Telugu script with something, and Hindi shares far more of
 * the phoneme inventory than English does. Whether Telugu text is spoken at all
 * is decided separately — the voice follows the TEXT, never the site setting on
 * its own, because an English voice reading Telugu script is noise.
 */
const LOCALES = {
  te: ['te-IN', 'hi-IN', 'en-IN'],
  kn: ['kn-IN', 'hi-IN', 'en-IN'],
  bn: ['bn-IN', 'bn-BD', 'hi-IN', 'en-IN'],
  hi: ['hi-IN', 'en-IN'],
  en: ['en-IN', 'en-GB', 'en-AU', 'en']
};

/** Ranks a voice for a wanted locale. Higher is better; -1 means unusable. */
function scoreVoice(v, locale, wantMale) {
  const lang = String(v.lang || '').replace('_', '-').toLowerCase();
  const want = locale.toLowerCase();
  if (!lang.startsWith(want.slice(0, 2))) return -1;
  let s = 0;
  if (lang === want) s += 40;              /* exact locale beats the same language elsewhere */
  const name = String(v.name || '');
  if (wantMale && MALE_NAME.test(name)) s += 30;
  if (wantMale && FEMALE_NAME.test(name)) s -= 20;
  if (GOOD_ENGINE.test(name)) s += 12;
  /*
   * A local voice outranks a nicer-sounding remote one.
   *
   * Chrome's best desktop voices — the "Google …" and "… network" ones — fetch
   * their audio from a server before a word is heard. That is the gap between
   * the reply appearing instantly and Uppi starting to talk a second or two
   * later, and it was being actively PREFERRED here: `GOOD_ENGINE` scored 12
   * while `localService` scored 3, so the remote voice won every time. For a
   * companion that answers you, starting promptly matters more than timbre, so
   * local now outweighs engine quality. Gender still outranks both, since that
   * is a character decision rather than a latency one.
   */
  if (v.localService) s += 25;
  return s;
}

import { visemeFor } from './avatar.js';

export class TextToSpeech {
  constructor() {
    this.mode = 'browser';
    this.voice = null;
    /* the language asked for, and the language the chosen voice actually
       speaks — they differ on a device with no voice for the asked language */
    this.lang = 'en';
    this.spokenLang = 'en';
    this.utterance = null;
    this.audio = null;
    this.ctx = null;
    this.analyser = null;
    this.buffer = null;
    this._char = null;
    /* a provider's character timings, mapped to visemes and played against the
       audio clock (§18) */
    this.schedule = null;
    this._scheduleAt = 0;
    this._unlocked = false;
    this._keepAlive = null;
    /* set when the engine tells us outright that it will not speak yet */
    this._denied = false;
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    if (this.supported) this._loadVoices();
    /*
     * Asked once, in the background, and read SYNCHRONOUSLY afterwards.
     *
     * `_hosted` stays null until the probe answers, and `speak()` only prefers
     * the hosted voice once it is positively true. Awaiting the promise — even
     * racing it against a timeout — put a delay in front of every utterance for
     * a feature that is switched off in this deployment. The cost of reading a
     * flag instead is that the very first line always uses the browser voice;
     * the hosted one takes over from the second.
     */
    this._hosted = null;
    this._serverReady = fetch('/api/uppi/speak', { method: 'GET' })
      .then((r) => r.json())
      .then((d) => { this._hosted = !!(d && d.configured); return this._hosted; })
      .catch(() => { this._hosted = false; return false; });
  }

  /**
   * Will the browser refuse to speak right now?
   *
   * Chrome gates speech synthesis behind user activation, and it does not tell
   * the page so. `speak()` returns normally, no error fires, and the engine
   * simply HOLDS the utterance until the visitor clicks something — at which
   * point it plays, however stale it has become. That is the whole bug: Uppi
   * arrived silent, and then read out a greeting from several minutes earlier
   * over the top of whatever he was actually saying by then.
   *
   * Only claim to be blocked when the page can positively see there has been no
   * activation. Firefox has no such gate, and a browser that does not expose
   * the flag gets the benefit of the doubt rather than being muted.
   */
  get blocked() {
    if (!this.supported) return false;
    if (this._denied) return true;
    try {
      const ua = navigator.userActivation;
      if (ua && typeof ua.hasBeenActive === 'boolean') return !ua.hasBeenActive;
    } catch { /* no such API */ }
    return false;
  }

  _loadVoices() {
    const pick = () => this._pickVoice();
    pick();
    /* Chrome populates the list asynchronously, once. */
    try { window.speechSynthesis.addEventListener('voiceschanged', pick, { once: false }); } catch { /* older API */ }
  }

  /**
   * Chooses the best available voice for the current language.
   *
   * Sets `this.voice`, and `this.spokenLang` — the language the chosen voice
   * actually speaks, which is NOT always the language that was asked for. A
   * phone with no Telugu voice cannot read Telugu aloud, and the layer above
   * needs to know that rather than sending Telugu text into an English voice.
   */
  _pickVoice() {
    if (!this.supported) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return;
    const chain = LOCALES[this.lang] || LOCALES.en;
    for (const locale of chain) {
      let best = null;
      let bestScore = -1;
      for (const v of voices) {
        const s = scoreVoice(v, locale, true);
        if (s > bestScore) { bestScore = s; best = v; }
      }
      if (best && bestScore >= 0) {
        this.voice = best;
        this.spokenLang = locale.slice(0, 2);
        return;
      }
    }
    this.voice = voices[0];
    this.spokenLang = String(voices[0].lang || 'en').slice(0, 2);
  }

  /**
   * Switch Uppi's voice to the site's language (§16).
   *
   * Called whenever the reader changes language, so the change is immediate
   * rather than waiting for a reload.
   */
  /**
   * The live voice object matching the one we picked, or null.
   *
   * Never hand the engine a voice object it did not just give us: see the note
   * in `_speakBrowser` for what a stale one costs.
   */
  _liveVoice() {
    if (!this.voice || !this.supported) return null;
    try {
      const voices = window.speechSynthesis.getVoices() || [];
      if (voices.indexOf(this.voice) !== -1) return this.voice;
      const same = voices.find((v) => v.name === this.voice.name && v.lang === this.voice.lang);
      if (same) { this.voice = same; return same; }
      return null;
    } catch { return null; }
  }

  setLanguage(code) {
    const next = String(code || 'en').slice(0, 2).toLowerCase();
    if (next === this.lang) return this.spokenLang;
    this.lang = next;
    this._pickVoice();
    return this.spokenLang;
  }

  /**
   * Can this device actually say something in `code`?
   *
   * The honest question behind "make him speak Telugu": if the answer is no,
   * the layer above should keep the English text rather than hand Telugu script
   * to a voice that will mispronounce every word of it.
   */
  canSpeak(code) {
    if (!this.supported) return false;
    const want = String(code || 'en').slice(0, 2).toLowerCase();
    try {
      const voices = window.speechSynthesis.getVoices() || [];
      return voices.some((v) => String(v.lang || '').slice(0, 2).toLowerCase() === want);
    } catch { return false; }
  }

  /**
   * The first gesture: flush whatever the engine was holding, then prime it.
   *
   * iOS will not speak until the page has had a real gesture, hence the silent
   * priming utterance. The `cancel()` in front of it matters just as much on
   * the desktop: anything handed to Chrome while it was blocked is still in its
   * queue, and this gesture is precisely the moment it would start playing.
   * Uppi says what is current or he says nothing.
   */
  unlock() {
    if (!this.supported) return;
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    this._denied = false;
    if (this._unlocked) return;
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
    /* Was anything actually in flight? `cancel()` on an idle engine is free;
       on a busy one it needs the settling tick below. */
    let busy = false;
    try { busy = this.supported && (window.speechSynthesis.speaking || window.speechSynthesis.pending); }
    catch { busy = false; }
    this.stop();
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) { if (o.onEnd) o.onEnd(); return; }

    /*
     * Let `cancel()` land before speaking again.
     *
     * Chrome's `cancel()` is asynchronous inside the engine even though it
     * returns immediately. Calling `speak()` in the same task after it queues
     * the new utterance behind a teardown that has not finished, and the voice
     * arrives seconds after the text — or never. One macrotask is enough for
     * the engine to settle, and it is only paid when something was actually
     * speaking.
     */
    if (busy) await new Promise((r) => setTimeout(r, 0));

    /*
     * Never hand the engine a line it is not allowed to say yet.
     *
     * See `blocked`. A queued utterance is not a delayed utterance — it is a
     * time bomb that goes off on the visitor's first click. The caller has
     * already put the text on screen, which is where it belongs; holding the
     * VOICE until there is a gesture is `chat.js`'s job, and it speaks whatever
     * is still current at that point rather than whatever was current then.
     */
    if (this.blocked) { if (o.onEnd) o.onEnd(); return; }

    /* the hosted voice only pre-empts the browser one once we already know it
       is there — see `_hosted` in the constructor */
    if (o.server !== false && this.mode !== 'browser-only' && this._hosted === true) {
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

      /*
       * Two provider shapes (§18). Plain audio bytes animate from amplitude;
       * JSON with per-character timings animates from the timings, which is the
       * only way the right mouth shape lands on the right sound.
       */
      let blob;
      const type = res.headers.get('content-type') || '';
      if (type.indexOf('json') !== -1) {
        const data = await res.json();
        if (!data || !data.audio) { this.mode = 'browser-only'; return false; }
        blob = base64ToBlob(data.audio, data.mime || 'audio/mpeg');
        this.schedule = buildSchedule(data.timings);
      } else {
        blob = await res.blob();
        this.schedule = null;
      }
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
      this.schedule = null;
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
      /*
       * A voice we cannot set is not a reason to say nothing.
       *
       * Chrome hands out `SpeechSynthesisVoice` objects that go stale — the
       * list loads asynchronously and is repopulated on `voiceschanged` — and
       * assigning one from an earlier list throws "Failed to convert value to
       * 'SpeechSynthesisVoice'". That throw happened BEFORE
       * `speechSynthesis.speak()` was ever reached, so nothing was spoken and
       * nothing reported an error: the reply sat on screen in silence until the
       * watchdog gave up, four to twenty seconds later. That is the "text now,
       * voice much later" the desktop was showing.
       *
       * So: look the voice up again by identity, and if it still will not take,
       * fall back to the language alone and let the engine pick. A default
       * voice reading the reply beats silence.
       */
      const live = this._liveVoice();
      try {
        if (live) { u.voice = live; u.lang = live.lang; }
        else u.lang = this.lang === 'en' ? 'en-IN' : this.lang + '-IN';
      } catch {
        u.lang = this.lang === 'en' ? 'en-IN' : this.lang + '-IN';
      }
      /*
       * §16: a warm young man, around twenty, not a cartoon and not a newsreader.
       *
       * Pitch was 1.04, which lifted every voice towards the bright, boyish end
       * and undid the point of choosing a male voice in the first place. A
       * shade UNDER default is what reads as a young adult with some chest in
       * the voice; the unhurried rate is what reads as warmth, because hurry is
       * the thing that makes a synthetic voice sound indifferent.
       */
      u.rate = 0.98;
      u.pitch = 0.96;
      u.volume = 1;
      this.utterance = u;
      this._char = null;

      u.onstart = () => { if (o.onStart) o.onStart(); };
      /* the character currently being spoken drives the viseme */
      u.onboundary = (e) => { this._char = text.charAt(e.charIndex) || null; };
      const done = () => {
        this._stopKeepAlive();
        if (this.utterance === u) { this.utterance = null; this._char = null; }
        if (o.onEnd) o.onEnd();
        resolve();
      };
      u.onend = done;
      /* Some builds report the activation gate rather than silently holding the
         utterance. Same situation, so record it and take the same path. */
      u.onerror = (e) => {
        if (e && e.error === 'not-allowed') this._denied = true;
        done();
      };

      try {
        /*
         * An engine left paused by a previous cancel never starts the next
         * utterance — it queues it and waits, which is the "text now, voice
         * much later" the desktop was showing.
         */
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        window.speechSynthesis.speak(u);
        this._startKeepAlive();
      } catch { done(); }
    });
  }

  /*
   * Chrome stops speaking after about fifteen seconds and waits.
   *
   * It is a long-standing engine bug, not a spec behaviour: a single utterance
   * longer than roughly fifteen seconds is silently suspended part-way. Uppi's
   * replies are several sentences, so this bites on ordinary answers — the
   * voice starts, then trails off while the text sits there complete. Pumping
   * `resume()` on a timer keeps the queue moving. It is a no-op on engines
   * that do not need it.
   */
  _startKeepAlive() {
    this._stopKeepAlive();
    this._keepAlive = setInterval(() => {
      try {
        const ss = window.speechSynthesis;
        if (!ss.speaking) { this._stopKeepAlive(); return; }
        if (ss.paused) ss.resume();
        else { ss.pause(); ss.resume(); }
      } catch { this._stopKeepAlive(); }
    }, 5000);
  }

  _stopKeepAlive() {
    if (this._keepAlive) clearInterval(this._keepAlive);
    this._keepAlive = null;
  }

  stop() {
    this._stopKeepAlive();
    try { if (this.supported) window.speechSynthesis.cancel(); } catch { /* ignore */ }
    if (this.audio) { try { this.audio.pause(); } catch { /* ignore */ } this.audio = null; }
    this.utterance = null;
    this._char = null;
    this.analyser = null;
    this.schedule = null;
    this._scheduleAt = 0;
  }

  get speaking() {
    if (this.audio && !this.audio.paused) return true;
    try { return this.supported && window.speechSynthesis.speaking; } catch { return false; }
  }

  /**
   * The source the motion layer reads to animate the mouth, in the order of
   * fidelity §18 asks for: a real character-timed schedule first, then the
   * browser voice's boundary characters, and only then amplitude.
   */
  source() {
    return {
      /* the audio clock, not a timer we started — they drift apart */
      getVisemeAt: () => {
        if (!this.schedule || !this.schedule.length || !this.audio) return null;
        const t = this.audio.currentTime;
        /* the schedule is short and ordered, so a linear scan from the last
           index is cheaper and steadier than a binary search per frame */
        let i = this._scheduleAt || 0;
        if (i >= this.schedule.length || this.schedule[i].at > t) i = 0;
        while (i + 1 < this.schedule.length && this.schedule[i + 1].at <= t) i++;
        this._scheduleAt = i;
        return this.schedule[i].viseme;
      },
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
      getChar: () => this._char,
      /* the mouth's own check that there is still something to move for */
      isSpeaking: () => this.speaking
    };
  }
}

/* ---------------------------------------------------------------------------
   Timed visemes
   --------------------------------------------------------------------------- */

function base64ToBlob(b64, mime) {
  const bytes = atob(b64);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

/**
 * Character timings → a viseme schedule.
 *
 * Consecutive characters that map to the same shape collapse into one entry,
 * and a gap between words becomes an explicit closed mouth — without that the
 * mouth hangs open between words, which is the single most artificial thing a
 * talking character can do.
 *
 * @param {Array<{ch:string,start:number,end:number}>} timings seconds
 * @returns {Array<{at:number, viseme:string}>} seconds
 */
export function buildSchedule(timings) {
  if (!Array.isArray(timings) || !timings.length) return null;
  const out = [];
  let last = null;
  for (let i = 0; i < timings.length; i++) {
    const t = timings[i];
    const ch = t.ch || '';
    const next = timings[i + 1] ? timings[i + 1].ch : '';
    const viseme = /[a-z]/i.test(ch) ? visemeFor(ch, next) : 'neutral';
    if (viseme === last) continue;
    out.push({ at: t.start, viseme });
    last = viseme;
  }
  /* close the mouth when the clip ends */
  const end = timings[timings.length - 1];
  if (end && last !== 'neutral') out.push({ at: end.end, viseme: 'neutral' });
  return out;
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
    /* the locale the recogniser listens in — follows the site language, so a
       Telugu reader can talk to Uppi in Telugu rather than being made to
       switch language just to use the microphone */
    this.locale = 'en-IN';
  }

  /** Point the recogniser at the reader's language. */
  setLanguage(code) {
    const map = { te: 'te-IN', kn: 'kn-IN', bn: 'bn-IN', hi: 'hi-IN', en: 'en-IN' };
    this.locale = map[String(code || 'en').slice(0, 2).toLowerCase()] || 'en-IN';
    /* a recogniser already running keeps the locale it started with; the next
       one picks this up, which is the same behaviour the API itself has */
    return this.locale;
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
    /* Indian English by default — it is what most visitors here will speak, and
       the recogniser handles local place and medicine names far better for it.
       `setLanguage` moves it when the reader changes the site language. */
    r.lang = this.locale || 'en-IN';
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
