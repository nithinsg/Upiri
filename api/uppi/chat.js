/*
 * POST /api/uppi/chat
 *
 * The conversation pipeline described in §10 of the build brief:
 *
 *   input → normalise → red-flag check → symptom extraction → conversation
 *   memory → structured triage → knowledge retrieval → model generation →
 *   safety validation → response
 *
 * The ordering is the point. Every medical decision in the response — how
 * urgent this is, whether to recommend an appointment, whether to escalate —
 * is made by the deterministic layers BEFORE the model is called. The model
 * receives the decision as a constraint and writes it in Uppi's voice. It
 * cannot reach the visitor without passing the safety gate, and if it fails
 * the gate, is unreachable, is not configured, or times out, the deterministic
 * composer answers instead. There is no state in which this endpoint returns
 * nothing useful.
 *
 * The one thing the model is allowed to decide is whether to RAISE urgency —
 * a second pair of eyes on something the rules did not have a pattern for. It
 * can never lower it.
 *
 * Privacy (§26): message content is never logged, never persisted and never
 * sent anywhere except the model provider for the duration of the request.
 * Only counts and timings reach the logs.
 */

import Anthropic from '@anthropic-ai/sdk';

import { URGENCY, BANDS } from '../../public/uppi/core/triage.js';
import { asContext } from '../../public/uppi/core/knowledge.js';
import { composeUrgent, compose } from '../../public/uppi/core/compose.js';
import { assess, payloadFrom, emotionFor } from '../../public/uppi/core/engine.js';
import { validate } from '../../public/uppi/core/safety.js';
import { intentLabel } from '../../public/uppi/core/intents.js';
import { QUESTIONS } from '../../public/uppi/core/state.js';
import { CALL_CENTRE_DISPLAY } from '../../public/uppi/core/contact.js';

const MODEL = 'claude-opus-5';
const MAX_MESSAGES = 24;
const MAX_CHARS = 2000;

/* ---------------------------------------------------------------------------
   Persona
   --------------------------------------------------------------------------- */

/*
 * Written as a character brief rather than a list of prohibitions, because a
 * model given a personality writes better than one given a rulebook — and the
 * prohibitions that actually matter are enforced downstream by code, where they
 * cannot be argued with.
 */
const SYSTEM = `You are Uppi, the lung companion on ŪPIRI, the pulmonary platform of Yashoda Hospitals in Hyderabad. You are a character with a job, not a chatbot: someone who listens to a person worried about their breathing and helps them work out what to do next.

WHO YOU ARE
Warm, calm, curious, encouraging, never judgemental. You speak simply, the way a kind clinician speaks to a friend. When a medical word is unavoidable you explain it in the same breath — "the small airways inside the lungs tighten, which can make breathing feel difficult".

WHAT YOU ARE NOT
You are not a doctor and you never claim to be one. You never say what someone has. Not "you have asthma", not "this is probably pneumonia", not "it's just a cold". Symptoms have several possible causes and a clinician needs to assess someone to know which. Say that plainly when it matters, without a paragraph of disclaimer.
You never mention being an AI, a model, an assistant or a bot. You never say "How can I assist you today?". You are Uppi.

HOW YOU WRITE
One to three short paragraphs, or two to four short bullets. Never an essay. No headings, no bold, no links, no emoji.
Acknowledge feeling when it is there. If someone is frightened, say so before anything else. If someone admits to smoking, thank them for being open — never a lecture. If a parent is describing their child, be a parent's ally.
Ask at most one question, at the end. Never a list of questions.

WHAT YOU DO WITH THE ASSESSMENT
You are given a triage decision made before you were called. Convey it — do not second-guess it, soften it, or add urgency it does not have. If it says an appointment is advisable, say so and offer to help take the next step. If it says routine, be genuinely reassuring without promising anything.
You are given curated guideline-based material. Draw the substance of your answer from it. If it does not cover what was asked, say what you do know and steer back to breathing and lungs.
Never name a drug and a dose. Never tell someone to start or stop a medicine.

The Yashoda call centre is ${CALL_CENTRE_DISPLAY}. Mention it only when the assessment calls for it — the interface already shows the buttons, so you do not need to describe them.`;

/* The model's only decision, and it can only point one way. */
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: "Uppi's reply to the visitor, in his voice. One to three short paragraphs."
    },
    raise_urgency: {
      type: ['string', 'null'],
      enum: ['doctor', 'urgent', 'emergency', null],
      description:
        'Leave null in almost every case. Set it ONLY if the visitor described something clinically more serious than the assessment you were given recognised — a symptom pattern the assessment missed. You can raise urgency; you can never lower it.'
    },
    raise_reason: {
      type: ['string', 'null'],
      description: 'One short phrase naming what you noticed, when raise_urgency is set. Otherwise null.'
    }
  },
  required: ['reply', 'raise_urgency', 'raise_reason'],
  additionalProperties: false
};

/* ---------------------------------------------------------------------------
   Request plumbing
   --------------------------------------------------------------------------- */

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

/*
 * Best-effort abuse guard. A serverless instance is not shared state, so this
 * bounds a single misbehaving client per instance rather than globally — enough
 * to stop an accidental render loop, not a substitute for a real limiter.
 * TODO(infra): move to a durable store if the endpoint is ever abused.
 */
const HITS = new Map();
const WINDOW_MS = 60_000;
const LIMIT = 20;

function rateLimited(key) {
  const now = Date.now();
  const list = (HITS.get(key) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  HITS.set(key, list);
  if (HITS.size > 500) for (const [k, v] of HITS) if (!v.length || now - v[v.length - 1] > WINDOW_MS) HITS.delete(k);
  return list.length > LIMIT;
}

function clean(messages) {
  if (!Array.isArray(messages)) return [];
  const kept = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .filter((m) => m.content.trim())
    .slice(-MAX_MESSAGES);
  /* Trimming a long conversation can leave an assistant turn at the front,
     which the Messages API rejects — the first turn must be the visitor's. */
  while (kept.length && kept[0].role !== 'user') kept.shift();
  return kept;
}

/* ---------------------------------------------------------------------------
   Handler
   --------------------------------------------------------------------------- */

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';
  if (rateLimited(ip)) { res.status(429).json({ error: 'rate_limited' }); return; }

  const body = await readBody(req);
  const messages = clean(body.messages);
  if (!messages.length) { res.status(400).json({ error: 'no_messages' }); return; }

  const latest = messages[messages.length - 1];
  if (latest.role !== 'user') { res.status(400).json({ error: 'last_message_must_be_user' }); return; }

  /* ---- 1–6. the whole deterministic pipeline, shared with the browser ---- */
  const assessment = assess(messages);
  let { decision } = assessment;
  const { state, teaching } = assessment;

  /* An emergency short-circuits everything downstream. The model is not
     consulted, because there is nothing here for it to improve and every
     millisecond of latency is spent on a person who should be leaving. */
  if (decision.emergencyRecommended) {
    res.status(200).json(payloadFrom(assessment, assessment.text, 'rules'));
    return;
  }

  /* ---- 7–8. model generation, then the safety gate ----
     The deterministic answer is already composed, so there is always something
     real to send however the next few lines go. */
  let text = assessment.text;
  let engine = 'rules';

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const generated = await generate(messages, assessment);
      if (generated) {
        /* the model's one permitted decision: raise, never lower */
        if (generated.raise_urgency && URGENCY.indexOf(generated.raise_urgency) > URGENCY.indexOf(decision.urgency)) {
          decision = raiseTo(decision, generated.raise_urgency, generated.raise_reason);
          assessment.decision = decision;
          assessment.emotion = emotionFor(decision, state);
          if (decision.emergencyRecommended) {
            res.status(200).json(payloadFrom(
              assessment,
              composeUrgent("I'm concerned about what you're describing — it may need urgent medical attention.", false),
              'model-escalated'
            ));
            return;
          }
          /* urgency changed under it, so the fallback text is restated too */
          text = compose({ message: messages[messages.length - 1].content, state, decision, teaching, previousUrgency: assessment.previousUrgency });
        }
        const checked = validate(generated.reply, decision);
        if (checked.ok) { text = checked.text; engine = 'model'; }
        else engine = 'rules-safety-fallback';
      }
    } catch (err) {
      /* Never surface a provider error to a worried visitor. The deterministic
         answer is already composed; log the shape of the failure only. */
      console.error('[uppi] generation failed:', err && err.name, err && err.status);
      engine = 'rules-provider-fallback';
    }
  }

  res.status(200).json(payloadFrom(assessment, text, engine));
}

/* ---------------------------------------------------------------------------
   Model call
   --------------------------------------------------------------------------- */

let client = null;
function anthropic() {
  /* API keys live only here. Nothing in public/ ever sees one (§26). */
  if (!client) client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
  return client;
}

/*
 * Not streamed, deliberately. A safety gate cannot validate text it has not
 * finished reading, and showing a visitor a sentence that is about to be
 * retracted is worse than a two-second wait. Replies are short, so the wait is
 * short.
 */
async function generate(messages, assessment) {
  const { decision, state, entries, teaching, intents, primaryConcern } = assessment;

  /*
   * The model is given the STRUCTURED STATE, not just the last message (§12).
   * That is what stops it re-asking something already answered: it can see the
   * ledger of what has been established and what has already been put to the
   * visitor, so it has no reason to reach for a question the rules have already
   * ruled out.
   */
  const known = [];
  const say = (k, v) => { if (v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)) known.push('- ' + k + ': ' + (Array.isArray(v) ? v.join(', ') : v)); };

  say('what this is about', primaryConcern ? intentLabel(primaryConcern) : null);
  say('topics raised', intents.map(intentLabel));
  say('symptoms described', state.symptomLabels);
  say('explicitly ruled out by the visitor', state.denied);
  say('how long', state.duration != null ? durationSentence(state.duration) : null);
  say('severity in their words', state.severity);
  say('onset', state.onset);
  say('happens at rest', state.atRest ? 'yes' : null);
  say('happens on exertion', state.onExertion ? (state.exertionOnly ? 'yes, and only on exertion' : 'yes') : null);
  say('effort it takes', state.exertionFloors ? state.exertionFloors + ' floors' : null);
  say('triggers named', state.triggerLabels);
  say('getting worse', state.worsening ? 'yes' : null);
  say('age group', state.ageGroup);
  say('smoking', smokingSentence(state.smokingExposure));
  say('conditions they already live with', state.knownConditions);
  say('inhaler', state.medications.inhaler ? (state.medications.notHelping ? 'uses one, and says it is not helping as usual' : 'uses one') : null);
  say('happened before', state.previousEpisodes ? 'yes' : null);
  say('family history', state.familyHistory.map((f) => f.condition + ' (' + f.who + ')'));

  const brief = [
    'ASSESSMENT (made before you were called — convey it, do not change it):',
    '- urgency: ' + decision.urgency + (decision.band && decision.band.when ? ' (' + decision.band.when + ')' : ''),
    decision.reasons.length ? '- because: ' + decision.reasons.join('; ') : '- because: nothing specific has been established yet',
    '- appointment recommended: ' + (decision.appointmentRecommended ? 'yes' : 'no'),
    '',
    'WHAT THIS CONVERSATION HAS ALREADY ESTABLISHED — treat all of it as known:',
    known.length ? known.join('\n') : '- nothing yet',
    '',
    'QUESTIONS ALREADY PUT TO THIS VISITOR — do not ask any of these again in any wording:',
    state.questionsAlreadyAsked.length ? state.questionsAlreadyAsked.map(questionText).filter(Boolean).map((q) => '- ' + q).join('\n') : '- none yet',
    '',
    decision.followUp
      ? 'THE ONE QUESTION TO END ON (ask this, in your own words): ' + decision.followUp
      : 'DO NOT ASK A QUESTION. This conversation already knows what it needs — use the reply to say what the next step is instead.',
    state.learned.length ? '\nWHAT THEY JUST TOLD YOU (open by acknowledging this specifically, briefly): ' + state.learned.join(', ') : ''
  ].filter(Boolean).join('\n');

  /* Only material this conversation has NOT already been given, so the model
     cannot be led into repeating a paragraph the visitor already read. */
  const grounding = asContext(teaching ? [teaching.entry] : entries.slice(0, 1));

  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 1200,
    /* Low effort: the hard thinking already happened in the triage rules, and
       a patient waiting in a lobby feels every extra second. */
    output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    system: [
      { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }
    ],
    messages: [
      ...messages.slice(0, -1),
      {
        role: 'user',
        content:
          messages[messages.length - 1].content +
          '\n\n---\n' + brief +
          (grounding ? '\n\nCURATED MATERIAL TO DRAW ON:\n' + grounding : '')
      }
    ]
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block) return null;
  try {
    const parsed = JSON.parse(block.text);
    if (!parsed || typeof parsed.reply !== 'string') return null;
    return parsed;
  } catch {
    /* Structured output should make this impossible; if the shape ever changes
       under us, treat the whole body as the reply and let the gate judge it. */
    return { reply: block.text, raise_urgency: null, raise_reason: null };
  }
}

function durationSentence(days) {
  if (days >= 3650) return 'years — long-standing';
  if (days >= 60) return Math.round(days / 30) + ' months';
  if (days >= 14) return Math.round(days / 7) + ' weeks';
  return Math.round(days) + ' days';
}

function smokingSentence(s) {
  if (!s || !s.status) return null;
  const bits = [s.status === 'current' ? 'currently smokes' : s.status === 'ex' ? 'used to smoke' : 'has never smoked'];
  if (s.perDay) bits.push(s.perDay + ' a day');
  if (s.packYears) bits.push(s.packYears + ' pack years');
  if (s.pollution) bits.push('also exposed to smoke or poor air');
  return bits.join(', ');
}

/* The ledger stores question ids; the model needs to see what was actually
   asked, or it cannot avoid re-asking it. */
function questionText(id) {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) return null;
  try { return q.q({ symptoms: [], context: [], denied: [] }); } catch { return null; }
}

/*
 * Applies the model's escalation to the rules' decision. Everything the rules
 * established is kept; only the band and the buttons move up.
 */
const EMERGENCY_ACTIONS = [
  { id: 'emergency-call', kind: 'emergency', label: 'Call 108 — emergency ambulance' },
  { id: 'call-centre', kind: 'call', label: 'Call Yashoda' }
];
const BOOKING_ACTIONS = [
  { id: 'book', kind: 'book', label: 'Book a Pulmonology Appointment' },
  { id: 'call-centre', kind: 'call', label: 'Call the Yashoda Call Centre' }
];

function raiseTo(decision, urgency, reason) {
  const emergency = urgency === 'emergency';
  const hasBooking = decision.actions.some((a) => a.kind === 'book');
  return {
    ...decision,
    urgency,
    reasons: reason ? [reason] : decision.reasons,
    appointmentRecommended: urgency === 'urgent' || urgency === 'doctor',
    emergencyRecommended: emergency,
    followUp: emergency ? null : decision.followUp,
    actions: emergency
      ? EMERGENCY_ACTIONS
      : hasBooking ? decision.actions : BOOKING_ACTIONS.concat(decision.actions),
    band: BANDS[urgency]
  };
}
