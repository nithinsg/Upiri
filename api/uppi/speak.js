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
 *   UPPI_TTS_URL         provider endpoint, POSTed { text, voice }
 *   UPPI_TTS_KEY         the credential (optional)
 *   UPPI_TTS_KEY_HEADER  which header carries it — default `authorization`
 *                        with a Bearer prefix; set to `xi-api-key` for
 *                        ElevenLabs, which sends the key raw
 *   UPPI_TTS_VOICE       provider voice id (optional)
 *   UPPI_TTS_MODEL       provider model id (optional)
 *
 * CHARACTER TIMING (§18)
 * A provider that can return per-character timings — ElevenLabs'
 * `/with-timestamps` endpoints do — gives Uppi's mouth the one thing amplitude
 * cannot: the right shape on the right sound. When the provider answers with
 * JSON rather than audio bytes, this route normalises whatever it sent into one
 * shape the client always understands:
 *
 *   { audio: <base64>, mime: 'audio/mpeg', timings: [{ ch, start, end }, …] }
 *
 * Times are in seconds from the start of the clip. The client turns them into a
 * viseme schedule and plays it against the audio clock. A provider that returns
 * plain audio still works — the client falls back to word boundaries, and then
 * to amplitude.
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
    if (process.env.UPPI_TTS_KEY) {
      const header = (process.env.UPPI_TTS_KEY_HEADER || 'authorization').toLowerCase();
      /* Bearer is the convention for `authorization`; every other header takes
         the key as-is, which is what ElevenLabs' `xi-api-key` expects. */
      headers[header] = header === 'authorization' ? 'Bearer ' + process.env.UPPI_TTS_KEY : process.env.UPPI_TTS_KEY;
    }

    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        voice: process.env.UPPI_TTS_VOICE || undefined,
        /* ElevenLabs' own field names, harmless to a provider that ignores them */
        voice_id: process.env.UPPI_TTS_VOICE || undefined,
        model_id: process.env.UPPI_TTS_MODEL || undefined
      })
    });
    if (!upstream.ok) {
      console.error('[uppi] tts provider returned', upstream.status);
      res.status(502).json({ error: 'tts_provider_error' });
      return;
    }

    const type = upstream.headers.get('content-type') || '';
    if (type.indexOf('json') !== -1) {
      const data = await upstream.json();
      res.status(200).json(normalise(data));
      return;
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', type || 'audio/mpeg');
    res.status(200).send(audio);
  } catch (err) {
    console.error('[uppi] tts failed:', err && err.name);
    res.status(502).json({ error: 'tts_unreachable' });
  }
}

/* ---------------------------------------------------------------------------
   Provider normalisation
   --------------------------------------------------------------------------- */

/*
 * Turns a provider's JSON into the one shape the client understands. Written
 * against ElevenLabs' `with-timestamps` response, which is the concrete case
 * the brief names, but keyed on shapes rather than on the provider's name so a
 * different one with the same idea needs no code change here.
 *
 * `normalized_alignment` is preferred where it exists: it is aligned to the
 * text as the model actually pronounced it, which is what the mouth should
 * follow. Falls back to `alignment`.
 */
function normalise(data) {
  const out = {
    audio: data.audio_base64 || data.audio || null,
    mime: data.mime || data.content_type || 'audio/mpeg',
    timings: []
  };
  const a = data.normalized_alignment || data.alignment || data.timings || null;
  if (a && Array.isArray(a.characters)) {
    const starts = a.character_start_times_seconds || a.characterStartTimesSeconds || [];
    const ends = a.character_end_times_seconds || a.characterEndTimesSeconds || [];
    for (let i = 0; i < a.characters.length; i++) {
      out.timings.push({
        ch: a.characters[i],
        start: Number(starts[i]) || 0,
        end: Number(ends[i]) || Number(starts[i]) || 0
      });
    }
  } else if (Array.isArray(a)) {
    for (const t of a) {
      if (!t) continue;
      out.timings.push({ ch: t.ch || t.char || '', start: Number(t.start) || 0, end: Number(t.end) || 0 });
    }
  }
  return out;
}
