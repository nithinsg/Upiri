/*
 * The conversation, on the client side.
 *
 * Holds the turns, talks to /api/uppi/chat, and owns two things the server
 * cannot:
 *
 *   1. The red-flag check runs here FIRST, on the same rules the server uses.
 *      Someone typing "I'm coughing blood" gets the urgent screen in under a
 *      millisecond, with no network round-trip — and still gets it if the
 *      network is down, the API key is missing, or the function is cold. An
 *      emergency response that depends on a fetch succeeding is not an
 *      emergency response.
 *
 *   2. Storage. §26: symptom conversations are not persisted. They live in
 *      sessionStorage, which the browser discards when the tab closes, and the
 *      visitor can wipe them at any point from the panel. Nothing is written to
 *      localStorage, no cookie is set, and no transcript ever reaches
 *      analytics.
 */

import { assess, payloadFrom } from './core/engine.js';
import { CALL_CENTRE_DISPLAY } from './core/contact.js';

const KEY = 'upiri:uppi:session';
const MAX_TURNS = 24;

/* §27, verbatim: what Uppi says when he cannot reach the assessment. */
const OFFLINE = "I'm having a little trouble connecting right now. You can still call the Yashoda team at " + CALL_CENTRE_DISPLAY + ", and I'll keep trying here.";

export class Conversation {
  constructor() {
    this.messages = [];
    this.lastResult = null;
    this._restore();
  }

  /* ---------------- storage (§26) ---------------- */

  _restore() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.messages)) this.messages = data.messages.slice(-MAX_TURNS);
    } catch { /* private mode, or nothing to restore */ }
  }

  _persist() {
    try { sessionStorage.setItem(KEY, JSON.stringify({ messages: this.messages.slice(-MAX_TURNS) })); }
    catch { /* storage full or blocked — the conversation still works in memory */ }
  }

  clear() {
    this.messages = [];
    this.lastResult = null;
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  }

  get isEmpty() { return this.messages.length === 0; }

  /* ---------------- turns ---------------- */

  /**
   * Sends a message and returns the structured result described in §10.
   * Never rejects: a worried visitor gets an answer whatever failed.
   *
   * @param {string} text
   * @param {(stage:string)=>void} onStage called with 'urgent' | 'thinking'
   */
  async send(text, onStage) {
    const content = String(text || '').trim();
    if (!content) return null;

    this.messages.push({ role: 'user', content });
    this.messages = this.messages.slice(-MAX_TURNS);
    this._persist();

    /* 1. the safety layer, locally and immediately.
       The same pipeline the server runs, on the same rules, so an emergency is
       answered before a request has even been opened. */
    const assessment = assess(this.messages);
    this.assessment = assessment;
    if (assessment.flags.hit) {
      if (onStage) onStage('urgent');
      const result = payloadFrom(assessment, assessment.text, 'client-rules');
      this._record(result);
      return result;
    }

    /* 2. everything else goes to the pipeline */
    if (onStage) onStage('thinking');
    try {
      const res = await fetch('/api/uppi/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: this.messages })
      });
      if (!res.ok) throw new Error('http_' + res.status);
      const result = await res.json();
      if (!result || typeof result.response !== 'string') throw new Error('bad_shape');
      this._record(result);
      return result;
    } catch {
      /* The backend is unreachable — but the whole assessment already ran in
         this tab, so Uppi answers from it rather than apologising. The visitor
         gets the real triage decision; only the model's phrasing is missing. */
      const result = payloadFrom(assessment, assessment.text, 'offline');
      result.offline = true;
      if (assessment.state.symptoms.length === 0) result.response = OFFLINE;
      this._record(result);
      return result;
    }
  }

  _record(result) {
    this.messages.push({ role: 'assistant', content: result.response });
    this.messages = this.messages.slice(-MAX_TURNS);
    this.lastResult = result;
    this._persist();
  }
}
