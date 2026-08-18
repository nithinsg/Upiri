/*
 * Product analytics (§28).
 *
 * Events only — never content. No message text, no transcript, no symptom the
 * visitor typed, no free-form anything. The most specific thing that leaves
 * this module is a triage band, which is a five-value enum and tells you the
 * product worked without telling you who was ill.
 *
 * Nothing is sent anywhere by default. Events are dispatched as a DOM event on
 * `window` so whatever the site adopts later — GA, Plausible, an internal
 * endpoint — can subscribe without this file changing, and so that a site with
 * no analytics at all costs nothing.
 */

const ALLOWED = new Set([
  'uppi_opened',
  'uppi_greeting_completed',
  'uppi_text_conversation_started',
  'uppi_voice_conversation_started',
  'uppi_symptom_category_selected',
  'uppi_appointment_recommended',
  'uppi_appointment_cta_clicked',
  'uppi_call_cta_clicked',
  'uppi_emergency_shown',
  'uppi_conversation_completed',
  'uppi_conversation_cleared',
  'uppi_speech_stopped',
  'uppi_error'
]);

/* The only fields that may ride along with an event. Anything else is dropped
   rather than trusted, so a future caller cannot accidentally leak a message
   into telemetry by passing the wrong object. */
const FIELDS = ['urgency', 'turns', 'source', 'reason', 'category', 'engine'];

export function track(name, props) {
  if (!ALLOWED.has(name)) return;
  const detail = { event: name };
  if (props) {
    for (const key of FIELDS) {
      const v = props[key];
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') detail[key] = v;
    }
  }
  try {
    window.dispatchEvent(new CustomEvent('upiri:analytics', { detail }));
    /* Common site-level collectors, used only if the page already has them.
       Neither is added by ŪPIRI. */
    if (typeof window.gtag === 'function') window.gtag('event', name, detail);
    else if (typeof window.plausible === 'function') window.plausible(name, { props: detail });
  } catch { /* analytics must never break a conversation */ }
}
