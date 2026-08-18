/*
 * The pipeline, in one place.
 *
 *   message → normalise → RED FLAGS → symptom extraction → conversation state
 *           → STRUCTURED TRIAGE → knowledge retrieval → [model] → SAFETY GATE
 *
 * Everything except the model call and the gate happens here, and it happens
 * identically in the browser and in the serverless function because both import
 * this file. That is deliberate: the browser needs the same assessment the
 * server would have made in order to answer an emergency without waiting for a
 * network round-trip, and two implementations of a triage pipeline is one too
 * many.
 *
 * `assess()` makes no decision of its own. It runs the deterministic layers in
 * their fixed order and hands back everything a caller needs — the state, the
 * decision, the grounding material, the composed floor answer, and the emotion
 * the character should wear while saying it.
 */

import { detectRedFlags, urgentOpening, normalise } from './redflags.js';
import { extractSymptoms, mergeExtractions } from './symptoms.js';
import { buildState } from './state.js';
import { triage } from './triage.js';
import { retrieve, sourcesOf } from './knowledge.js';
import { classifyIntents, primaryConcern } from './intents.js';
import { compose, composeUrgent, selectTeaching } from './compose.js';

/* ---------------------------------------------------------------------------
   Emotion (§23)
   --------------------------------------------------------------------------- */

/*
 * What Uppi's face does while he says this. Derived from the decision rather
 * than from the words, so the expression can never contradict the advice — a
 * cheerful face on an urgent instruction is its own kind of safety failure.
 */
export function emotionFor(decision, state) {
  if (!decision) return 'caring';
  if (decision.crisis) return 'concerned';
  switch (decision.urgency) {
    case 'emergency': return 'urgent';
    case 'urgent': return 'concerned';
    case 'doctor': return 'caring';
    case 'insufficient': return 'curious';
    default:
      if (state && state.extraction && state.extraction.context.includes('wantsAppointment')) return 'caring';
      return state && state.symptoms.length ? 'caring' : 'happy';
  }
}

/* ---------------------------------------------------------------------------
   The knowledge ledger
   --------------------------------------------------------------------------- */

/*
 * Which curated paragraphs this conversation has already heard. Rebuilt by
 * replaying the same selection over the conversation prefix, so it survives a
 * reload, a failed request, and the browser and the server disagreeing about
 * whose turn produced what.
 *
 * Without it, answering "mostly at night" re-serves the same opening paragraph
 * about coughs that the visitor read two turns ago — which is exactly how a
 * companion starts sounding like a leaflet.
 */
function knowledgeLedger(userTurns, perTurn) {
  const told = {};
  for (let i = 0; i < userTurns.length - 1; i++) {
    const prefix = mergeExtractions(perTurn.slice(0, i + 1));
    const earlier = mergeExtractions(perTurn.slice(0, i));
    const pick = selectTeaching(normalise(userTurns[i].content), prefix, told, {
      continuing: i > 0,
      newSymptoms: prefix.symptoms.some((sym) => !earlier.symptoms.includes(sym) && sym !== 'nightsym' && sym !== 'exercise')
    });
    if (pick) told[pick.entry.id] = (told[pick.entry.id] || 0) + pick.take;
  }
  return told;
}

/* ---------------------------------------------------------------------------
   Assessment
   --------------------------------------------------------------------------- */

/**
 * @param {Array<{role:string,content:string}>} messages whole conversation, oldest first
 * @returns {object} the full deterministic assessment of the latest turn
 */
export function assess(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const userTurns = list.filter((m) => m.role === 'user');
  const latest = userTurns[userTurns.length - 1] || { content: '' };

  /* 1–2. red flags, on the newest message, before anything else */
  const flags = detectRedFlags(latest.content);

  /* 3–4. extraction and conversation state across every turn */
  const state = buildState(list);
  const perTurn = userTurns.map((m) => extractSymptoms(m.content));

  /* 5. structured triage, with the ledger so it never re-asks */
  const decision = triage(state.extraction, flags, state);

  /* the taxonomy view, for the model brief and for the interface */
  const intents = classifyIntents(state.extraction, flags, state.text);
  const concern = primaryConcern(intents);

  /* 6. knowledge retrieval, minus everything already said */
  const told = knowledgeLedger(userTurns, perTurn);
  const teaching = decision.urgency === 'emergency' ? null : selectTeaching(normalise(latest.content), state.extraction, told, {
    continuing: !state.isFirstTurn,
    newSymptoms: state.newComplaints.length > 0
  });
  const entries = retrieve(normalise(latest.content), state.extraction.symptoms, 3);

  /* How long this band has been standing. Said in full once, referred back to
     once, then left alone — a companion who restates the same conclusion every
     turn stops sounding like he is listening. */
  const bands = [];
  for (let i = 1; i <= perTurn.length; i++) {
    bands.push(triage(mergeExtractions(perTurn.slice(0, i)), { hit: false, flags: [] }, null).urgency);
  }
  const previousUrgency = bands.length > 1 ? bands[bands.length - 2] : null;
  let bandRepeat = 0;
  for (let i = bands.length - 2; i >= 0 && bands[i] === decision.urgency; i--) bandRepeat++;

  /* 7. the floor answer — composed before any model is consulted */
  const text = decision.emergencyRecommended
    ? composeUrgent(urgentOpening(flags.flags), flags.crisis)
    : compose({ message: latest.content, state, decision, teaching, previousUrgency, bandRepeat });

  return {
    flags,
    state,
    decision,
    intents,
    primaryConcern: concern,
    entries,
    teaching,
    told,
    previousUrgency,
    bandRepeat,
    text,
    emotion: emotionFor(decision, state),
    sources: sourcesOf(entries)
  };
}

/**
 * The wire shape both the API and the client red-flag short-circuit return.
 * Kept here so the two can never drift apart.
 */
export function payloadFrom(assessment, text, engine) {
  const { decision, state, sources, intents } = assessment;
  return {
    response: text,
    urgency: decision.urgency,
    symptoms_detected: state.symptomLabels,
    intents,
    follow_up_question: decision.followUp,
    appointment_recommended: !!decision.appointmentRecommended,
    emergency_recommended: !!decision.emergencyRecommended,
    crisis: !!decision.crisis,
    suggested_actions: decision.actions,
    band: decision.band,
    sources,
    emotion: assessment.emotion,
    engine
  };
}
