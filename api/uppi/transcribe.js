/*
 * POST /api/uppi/transcribe   (audio/*; returns { text })
 *
 * The server half of the speech-recognition abstraction (§12). The browser's
 * own SpeechRecognition is the primary implementation and covers Chrome, Edge
 * and Safari; this route is what the client falls back to where that API does
 * not exist — Firefox today, and anything else tomorrow.
 *
 * It is deliberately a thin proxy to a configured provider rather than a
 * hard-wired one, so the transcription vendor can be swapped without touching
 * the client (§12: "keep the transcription provider replaceable"). Point it at
 * anything that accepts audio bytes and returns JSON:
 *
 *   UPPI_STT_URL    the provider endpoint
 *   UPPI_STT_KEY    sent as `Authorization: Bearer …` (optional)
 *   UPPI_STT_FIELD  JSON path to the transcript in the reply, default "text"
 *
 * With no provider configured the route says so in a machine-readable way and
 * the client falls back to typing — it never renders a microphone that cannot
 * do anything (§27, and the brief's rule against buttons that do not work).
 *
 * Privacy (§26): audio is streamed through and never written to disk, never
 * logged and never retained here.
 */

const MAX_BYTES = 8 * 1024 * 1024; /* ~2 minutes of opus; a lobby question is seconds */

async function readAudio(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) throw Object.assign(new Error('too_large'), { code: 'too_large' });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function dig(obj, path) {
  return String(path || 'text').split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  /* The client asks before it renders a microphone: no configured provider and
     no browser recogniser means the button is not drawn at all. */
  if (req.method === 'GET') {
    res.status(200).json({ configured: !!process.env.UPPI_STT_URL });
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const url = process.env.UPPI_STT_URL;
  if (!url) {
    /* Honest, and actionable by the client: it knows to offer the keyboard. */
    res.status(503).json({
      error: 'stt_not_configured',
      message: 'Server transcription is not configured. Set UPPI_STT_URL to enable it; the browser speech API is used where available.'
    });
    return;
  }

  let audio;
  try {
    audio = await readAudio(req);
  } catch (err) {
    res.status(err.code === 'too_large' ? 413 : 400).json({ error: err.code || 'bad_audio' });
    return;
  }
  if (!audio.length) { res.status(400).json({ error: 'empty_audio' }); return; }

  try {
    const headers = { 'content-type': req.headers['content-type'] || 'audio/webm' };
    if (process.env.UPPI_STT_KEY) headers.authorization = 'Bearer ' + process.env.UPPI_STT_KEY;

    const upstream = await fetch(url, { method: 'POST', headers, body: audio });
    if (!upstream.ok) {
      console.error('[uppi] stt provider returned', upstream.status);
      res.status(502).json({ error: 'stt_provider_error' });
      return;
    }
    const data = await upstream.json();
    const text = dig(data, process.env.UPPI_STT_FIELD);
    if (typeof text !== 'string' || !text.trim()) { res.status(422).json({ error: 'stt_no_speech' }); return; }
    res.status(200).json({ text: text.trim() });
  } catch (err) {
    console.error('[uppi] stt failed:', err && err.name);
    res.status(502).json({ error: 'stt_unreachable' });
  }
}

export const config = { api: { bodyParser: false } };
