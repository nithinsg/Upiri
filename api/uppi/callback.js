/*
 * POST /api/uppi/callback   ({ name, phone, … } → a call-back request)
 *
 * The one place in ŪPIRI where a visitor hands over personal details, and it is
 * built to deserve that.
 *
 * WHAT IS SENT ON, AND WHAT IS NOT
 * A name, a phone number, an optional preferred time, and the triage BAND —
 * "See a doctor within 24 hours" — because a call-centre executive ringing back
 * needs to know how soon. That is all. The conversation, the symptoms, the free
 * text: none of it leaves. A visitor asking for a call back has not asked for
 * their health history to be filed anywhere, and the band is the least that
 * makes the call useful.
 *
 * NOTHING IS LOGGED. Not the name, not the number, not on success and not on
 * failure. The logs get a status code and a band.
 *
 * IF NO DESTINATION IS CONFIGURED, THE FEATURE DOES NOT EXIST
 * `GET` reports `{ configured: false }` and the client never renders the offer.
 * That is deliberate and it matters more here than anywhere else in the app: a
 * form that collects a worried patient's phone number and quietly drops it is
 * worse than no form. Same rule as the microphone — a control that cannot work
 * is not rendered.
 *
 *   UPPI_CALLBACK_URL     where requests are POSTed (a CRM webhook, a Zapier /
 *                         Make hook, an internal endpoint — anything that
 *                         accepts JSON and is actually watched by a human)
 *   UPPI_CALLBACK_KEY     the credential, optional
 *   UPPI_CALLBACK_KEY_HEADER  which header carries it — default `authorization`
 *                         with a Bearer prefix
 *
 * TODO(yashoda): the destination has to be a queue a person actually works.
 * "Someone will call you back" is a promise the hospital makes, not the
 * website — do not enable this until that is true.
 */

const MAX_NAME = 80;
const MAX_PHONE = 20;
const MAX_NOTE = 120;

/*
 * Indian mobile and landline numbers, with or without +91, and tolerant of the
 * spaces, dashes and brackets people actually type. Deliberately permissive
 * about format and strict only about length: rejecting a real patient's number
 * because they wrote it with dots is a worse failure than passing an odd one
 * through to a human who will see it.
 */
function cleanPhone(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  const bare = digits.replace(/^\+?91/, '').replace(/^0+/, '');
  if (!/^\d{10}$/.test(bare) && !/^\d{8,12}$/.test(bare)) return null;
  return bare.length === 10 ? '+91' + bare : digits.slice(0, MAX_PHONE);
}

function cleanName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  /* two characters is a real name in a lot of languages; anything shorter is a
     mistyped field, not a person */
  return name.length >= 2 ? name : null;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

/* Best-effort abuse guard, per instance. A callback form is the one endpoint
   here worth spamming, so this is tighter than the chat limiter. */
const HITS = new Map();
const WINDOW_MS = 600_000;
const LIMIT = 5;

function rateLimited(key) {
  const now = Date.now();
  const list = (HITS.get(key) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  HITS.set(key, list);
  if (HITS.size > 500) for (const [k, v] of HITS) if (!v.length || now - v[v.length - 1] > WINDOW_MS) HITS.delete(k);
  return list.length > LIMIT;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const url = process.env.UPPI_CALLBACK_URL;

  /* The client asks before it offers, so an unconfigured deployment never shows
     a form that would throw a patient's number away. */
  if (req.method === 'GET') { res.status(200).json({ configured: !!url }); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  if (!url) {
    res.status(503).json({
      error: 'callback_not_configured',
      message: 'Call-back requests are not configured. Set UPPI_CALLBACK_URL to a destination a person actually monitors.'
    });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';
  if (rateLimited(ip)) { res.status(429).json({ error: 'rate_limited' }); return; }

  const body = await readBody(req);
  const name = cleanName(body.name);
  const phone = cleanPhone(body.phone);
  if (!name) { res.status(400).json({ error: 'name_required' }); return; }
  if (!phone) { res.status(400).json({ error: 'phone_invalid' }); return; }

  const payload = {
    source: 'upiri-uppi',
    requestedAt: new Date().toISOString(),
    name,
    phone,
    preferredTime: String(body.preferredTime || '').slice(0, MAX_NOTE) || null,
    /* how soon, and nothing else about them */
    urgency: ['emergency', 'urgent', 'doctor', 'insufficient', 'routine'].indexOf(body.urgency) !== -1 ? body.urgency : 'routine',
    urgencyLabel: String(body.urgencyLabel || '').slice(0, MAX_NOTE) || null
  };

  try {
    const headers = { 'content-type': 'application/json' };
    if (process.env.UPPI_CALLBACK_KEY) {
      const header = (process.env.UPPI_CALLBACK_KEY_HEADER || 'authorization').toLowerCase();
      headers[header] = header === 'authorization' ? 'Bearer ' + process.env.UPPI_CALLBACK_KEY : process.env.UPPI_CALLBACK_KEY;
    }
    const upstream = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!upstream.ok) {
      /* the status and the band only — never who, never their number */
      console.error('[uppi] callback destination returned', upstream.status, payload.urgency);
      res.status(502).json({ error: 'callback_delivery_failed' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[uppi] callback delivery failed:', err && err.name);
    res.status(502).json({ error: 'callback_unreachable' });
  }
}
