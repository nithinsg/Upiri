/*
 * POST /api/uppi/speak   ({ text } → audio bytes)
 *
 * The server half of the text-to-speech abstraction (§16). The browser's own
 * speechSynthesis is the default implementation — it works offline, costs
 * nothing, needs no key, and exposes word-boundary events that drive Uppi's
 * mouth. This route exists so the voice can be upgraded to a specific
 * Indian-neutral English voice from a hosted provider without any change to the
 * client, which asks for audio and animates to whatever it gets back.
 *
 *   UPPI_TTS_URL     provider endpoint, POSTed { text, voice }
 *   UPPI_TTS_KEY     sent as `Authorization: Bearer …` (optional)
 *   UPPI_TTS_VOICE   provider voice id (optional)
 *
 * Unconfigured, it says so and the client stays on the browser voice, which is
 * a working path rather than a degraded one — so nothing here is a dead button.
 *
 * Privacy (§26): the text spoken is Uppi's own reply, not the visitor's
 * message, and it is not logged.
 */

const MAX_CHARS = 1200;

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  /* The client asks before it tries to speak. Without this it would POST once
     per session and take a 503 — harmless, but it puts a red line in the
     console of every visitor, which is not what a finished product does. */
  if (req.method === 'GET') {
    res.status(200).json({ configured: !!process.env.UPPI_TTS_URL });
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const url = process.env.UPPI_TTS_URL;
  if (!url) {
    res.status(503).json({
      error: 'tts_not_configured',
      message: 'Hosted speech is not configured. Set UPPI_TTS_URL to enable it; the browser voice is used otherwise.'
    });
    return;
  }

  const body = await readBody(req);
  const text = typeof body.text === 'string' ? body.text.slice(0, MAX_CHARS).trim() : '';
  if (!text) { res.status(400).json({ error: 'no_text' }); return; }

  try {
    const headers = { 'content-type': 'application/json' };
    if (process.env.UPPI_TTS_KEY) headers.authorization = 'Bearer ' + process.env.UPPI_TTS_KEY;

    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, voice: process.env.UPPI_TTS_VOICE || undefined })
    });
    if (!upstream.ok) {
      console.error('[uppi] tts provider returned', upstream.status);
      res.status(502).json({ error: 'tts_provider_error' });
      return;
    }
    const audio = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    res.status(200).send(audio);
  } catch (err) {
    console.error('[uppi] tts failed:', err && err.name);
    res.status(502).json({ error: 'tts_unreachable' });
  }
}
