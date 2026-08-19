/*
 * Deterministic response composition.
 *
 * Uppi's answer is assembled here from the conversation state, the triage
 * decision and the curated knowledge entries. When a model is configured it
 * rewrites this in Uppi's voice; when one is not — no key, an outage, a rate
 * limit, or a response that failed safety validation — this text ships as-is.
 *
 * So this is not a placeholder. It is the floor: the worst answer Uppi can give
 * is still a real, sourced, correctly-triaged one. That is the only arrangement
 * in which a health assistant should be allowed to depend on a remote model at
 * all — and it means the floor has to hold a CONVERSATION, not recite.
 *
 * Three rules make it a conversation rather than a leaflet:
 *
 *   1. LEAD WITH WHAT WAS JUST LEARNED. A reply that opens by acknowledging the
 *      specific thing the visitor just said is the whole difference between
 *      being listened to and filling in a form. `state.learned` says what that
 *      thing was.
 *   2. NEVER SAY THE SAME PARAGRAPH TWICE. Teaching is drawn from a ledger of
 *      what has already been said; when an entry is spent the next paragraph is
 *      used, and when the knowledge is spent Uppi stops lecturing and acts.
 *   3. NEVER RE-STATE A VERDICT THAT HAS NOT CHANGED. Said once in full, then
 *      referred back to briefly, then not at all.
 *
 * Order of a composed reply:
 *   urgent/emergency — instruction FIRST, then the minimum context, no question
 *   everything else  — acknowledgement → what is known → verdict → one question
 */

import { normalise } from './redflags.js';
import { scored } from './knowledge.js';
import { present } from './safety.js';
import { durationPhrase } from './symptoms.js';
import { CALL_CENTRE_DISPLAY } from './contact.js';

/* ---------------------------------------------------------------------------
   Empathy
   --------------------------------------------------------------------------- */

const FEELINGS = [
  {
    id: 'frightened',
    re: /\b(?:scared|frightened|afraid|terrified|panic\w*|anxious|anxiety|worried sick|freaking out)\b/,
    line: 'I understand why that would worry you. Let\'s take this one step at a time.'
  },
  {
    id: 'worried',
    re: /\b(?:worried|worry|concerned|nervous|stressed)\b/,
    line: 'That\'s a reasonable thing to be worried about, and it\'s worth working through properly.'
  },
  {
    id: 'exhausted',
    re: /\b(?:exhausted|tired of|fed up|sick of|frustrat\w*|can not cope|cannot cope|had enough)\b/,
    line: 'That sounds wearing — dealing with it day after day takes something out of you.'
  },
  {
    id: 'guilt',
    /* Someone volunteering a smoking history is trusting you with it. §18: never
       judge, and say so without making a speech about it. */
    re: /\b(?:i smoke|i have been smoking|been smoking|i used to smoke|my fault|i know i should|guilty|ashamed)\b/,
    line: 'Thanks for being straight with me about that — it helps, and it\'s not something to be judged for.'
  },
  {
    id: 'parent',
    re: /\bmy (?:son|daughter|child|kid|baby|boy|girl)\b/,
    line: 'Watching your child struggle to breathe is frightening — let\'s work out what it needs.'
  },
  {
    id: 'sleepless',
    re: /\b(?:not slept|can not sleep|cannot sleep|up all night|awake all night|no sleep)\b/,
    line: 'Losing sleep to it makes everything harder. Let\'s see what\'s going on.'
  }
];

function acknowledgement(text) {
  const hit = FEELINGS.find((f) => f.re.test(text));
  return hit ? hit.line : '';
}

/* ---------------------------------------------------------------------------
   Acknowledging the thing that was just said (§10)
   --------------------------------------------------------------------------- */

/*
 * One line, about the single most significant thing this turn established.
 * Ordered by significance, because a turn can teach several things at once and a
 * reply that acknowledges all of them is a wall of text.
 *
 * Every line here has to survive being read by someone anxious, so none of them
 * carries a verdict — that comes later in the reply, once, from the rules.
 */
const LEARNED_LINES = [
  {
    slot: 'severity',
    when: (s) => s.severity === 'severe',
    line: () => 'That sounds like a lot to be dealing with, and I don\'t want to slow you down.'
  },
  {
    slot: 'pattern',
    when: (s) => s.atRest,
    line: () => 'Breathlessness that happens even when you are sitting still matters more than the kind that only comes on with effort — I\'m glad you said.'
  },
  {
    slot: 'relieverUse',
    when: (s) => s.medications && s.medications.notHelping,
    line: () => 'An inhaler that isn\'t working the way it normally does is an important thing to have told me.'
  },
  {
    slot: 'worsening',
    when: (s) => s.worsening,
    line: () => 'The fact that it is getting worse rather than settling is the part that matters most here.'
  },
  {
    slot: 'duration',
    when: (s) => s.duration != null,
    line: (s) => {
      const p = durationPhrase(s.duration);
      if (s.duration >= 3650) return 'Something you\'ve lived with for years is a different question from something new — that\'s useful to know.';
      if (s.duration >= 21) return p.charAt(0).toUpperCase() + p.slice(1) + ' is long enough that I wouldn\'t just wait it out, especially if it isn\'t improving.';
      if (s.duration >= 7) return p.charAt(0).toUpperCase() + p.slice(1) + ' — thanks, that helps me place it.';
      return 'Only ' + p + ', then. That\'s worth knowing.';
    }
  },
  {
    slot: 'pattern',
    when: (s) => s.onExertion,
    line: (s) => s.exertionFloors
      ? 'So it takes about ' + s.exertionFloors + (s.exertionFloors === 1 ? ' floor' : ' floors') + ' to bring it on — that\'s a useful marker, and a doctor will want that exact detail.'
      : 'So it\'s effort that brings it on rather than rest. That\'s a useful distinction.'
  },
  {
    slot: '_exertionOnly', refine: 'exertionOnly',
    when: (s) => s.exertionOnly,
    line: (s) => s.exertionFloors
      ? 'So it takes about ' + s.exertionFloors + (s.exertionFloors === 1 ? ' floor' : ' floors') + ', and only when you push — that\'s a useful marker to track.'
      : 'So it\'s only when you push a bit, not the whole time. That boundary is worth knowing.'
  },
  {
    slot: 'sputum',
    when: (s) => s.symptoms.includes('sputum'),
    line: () => 'Bringing something up with it is worth knowing.'
  },
  {
    slot: 'sputum',
    when: (s) => s.denied.includes('sputum'),
    line: () => 'A dry cough — that narrows things down a little.'
  },
  {
    slot: 'timing',
    when: (s) => s.symptoms.includes('nightsym'),
    line: () => 'Night-time is a real clue. Symptoms that peak at night or early morning tend to behave in a particular way.'
  },
  {
    slot: 'triggers',
    when: (s) => s.triggerLabels.length > 0,
    line: (s) => 'So ' + list(s.triggerLabels.slice(0, 2)) + ' sets it off — that\'s exactly the kind of detail worth taking to a pulmonologist.'
  },
  {
    slot: 'smoking',
    when: (s) => s.smokingExposure.perDay != null,
    line: (s) => 'Thanks for telling me — ' + s.smokingExposure.perDay + ' a day is still worth counting, and knowing it genuinely helps.'
  },
  {
    slot: 'smoking',
    when: (s) => s.smokingExposure.status === 'never',
    line: () => 'Good to know you\'ve never smoked — that does change which explanations are more likely.'
  },
  {
    slot: 'fever',
    when: (s) => s.denied.includes('fever'),
    line: () => 'No fever with it — helpful.'
  },
  {
    slot: 'fever',
    when: (s) => s.symptoms.includes('fever'),
    line: () => 'A fever alongside it shifts the picture a little.'
  },
  {
    slot: 'previousEpisodes',
    when: (s) => s.previousEpisodes,
    line: () => 'So this isn\'t the first time — a pattern that repeats is itself a clue.'
  },
  {
    slot: 'onset',
    when: (s) => s.onset === 'gradual',
    line: () => 'Built up gradually rather than arriving overnight — noted.'
  },
  {
    slot: 'age',
    when: (s) => s.ageYears != null && s.ageGroup === 'child',
    line: (s) => 'At ' + s.ageYears + ', that\'s worth looking at a little differently from an adult.'
  }
];

function list(items) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

/**
 * The one line that says "I heard that". Returns '' on the first turn, where
 * there is nothing yet to acknowledge and an emotional opener does the work.
 */
export function learnedLine(state) {
  if (!state || state.isFirstTurn || (!state.learned.length && !(state.refined || []).length)) {
    /* A new symptom on a later turn is also new information. */
    if (state && !state.isFirstTurn && state.newSymptoms.length) {
      const label = state.symptomLabels[state.symptoms.indexOf(state.newSymptoms[0])] || 'that';
      return 'Adding ' + label + ' to the picture is useful.';
    }
    return '';
  }
  for (const item of LEARNED_LINES) {
    const hit = state.learned.includes(item.slot) || (item.refine && (state.refined || []).includes(item.refine));
    if (!hit) continue;
    let ok = false;
    try { ok = item.when(state); } catch { ok = false; }
    if (ok) return item.line(state);
  }
  if (state.newSymptoms.length) {
    const label = state.symptomLabels[state.symptoms.indexOf(state.newSymptoms[0])] || 'that';
    return 'Adding ' + label + ' to the picture is useful.';
  }
  return 'Thanks — that\'s useful to know.';
}

/* ---------------------------------------------------------------------------
   Teaching, without repeating (§10)
   --------------------------------------------------------------------------- */

/**
 * Picks the next piece of curated material to draw on, given what has already
 * been said. Unseen entries first; then the next unused paragraph of an entry
 * already drawn from; then nothing at all — which is the right answer, because
 * a companion who has run out of new things to say should act, not loop.
 *
 * @param {string} text normalised latest message
 * @param {object} extraction merged extraction
 * @param {Object<string,number>} told entry id → paragraphs already used
 * @returns {{entry:object, from:number, take:number}|null}
 */
export function selectTeaching(text, extraction, told, opts) {
  const seen = told || {};
  const first = !(opts && opts.continuing);
  const candidates = scored(text, extraction.symptoms, 5);
  if (!candidates.length) return null;

  /* Relevance dominates; novelty only breaks ties. An entry has to be within
     reach of the best match to be worth switching to — otherwise "only when I
     walk quickly" gets answered with whatever paragraph happens to be unread. */
  const top = candidates[0].score;

  /* On a follow-up turn, only teach when the newest message actually earns it —
     a strong term match, or a symptom that was not in the picture before. A
     one-line answer like "only when I walk quickly" carries every earlier
     symptom forward, so every entry still scores; teaching off that is how the
     reply ends up being a paragraph about COPD. Saying nothing new here is
     correct: the acknowledgement, the verdict and the question carry the turn. */
  if (!first && top < 4 && !(opts && opts.newSymptoms)) return null;

  const relevant = candidates.filter((c) => c.score >= Math.max(top - 2, top * 0.6));

  /* The opening turn can carry two paragraphs; a reply to a one-line answer
     should be one, or the conversation turns into a lecture. */
  const depth = first && (extraction.symptoms.length > 1 || extraction.durationDays != null) ? 2 : 1;

  for (const c of relevant) {
    if (seen[c.entry.id]) continue;
    /* The lung-cancer entry is written from a cough. Someone who opens with a
       scan result has not described a cough, and answering them with "most
       persistent coughs are not cancer" answers a question they did not ask. */
    const skipFirst = c.entry.id === 'lung-cancer' && !extraction.symptoms.includes('cough') && extraction.context.includes('scanResult');
    const from = skipFirst ? 1 : 0;
    return { entry: c.entry, from, take: Math.min(depth, c.entry.plain.length - from) };
  }
  for (const c of relevant) {
    const used = seen[c.entry.id] || 0;
    if (used < c.entry.plain.length) return { entry: c.entry, from: used, take: 1 };
  }
  /* Everything relevant has been said. Saying it again is worse than saying
     nothing — the reply still carries the acknowledgement, the verdict and the
     next step. */
  return null;
}

/* ---------------------------------------------------------------------------
   What the decision means, said plainly
   --------------------------------------------------------------------------- */

function verdict(decision, brief) {
  const because = list(decision.reasons || []);
  switch (decision.urgency) {
    case 'urgent':
      return because
        ? 'Because of ' + because + ', I wouldn\'t leave this for next week — please arrange to be seen today, or tomorrow morning at the latest.'
        : 'I wouldn\'t leave this for next week — please arrange to be seen today, or tomorrow morning at the latest.';
    case 'doctor':
      if (brief) return 'That still points the same way: worth having a pulmonologist look at it.';
      return because
        ? 'Because of ' + because + ', I think it would be worth speaking with a pulmonologist about this. I can help you take the next step.'
        : 'I think it would be worth speaking with a pulmonologist about this. I can help you take the next step.';
    case 'routine':
      if (brief) return '';
      return 'Nothing you\'ve described so far points to something that needs urgent attention. Keep an eye on how it changes over the next week — if it isn\'t settling, or anything new starts, that changes the answer.';
    default:
      return '';
  }
}

/**
 * The offer to be rung back.
 *
 * Phrased as Uppi doing the work rather than as a form to fill in, because the
 * point of it is that someone who is unwell does not have to hold on a phone
 * line. Says exactly what is passed on, because asking for a phone number
 * without saying where it goes is not a fair ask.
 */
export function callbackOffer(decision) {
  const soon = decision.urgency === 'urgent' || decision.urgency === 'emergency';
  return 'If it\'s easier, I can ask the Yashoda team to call you' + (soon ? ' — they can usually reach you quickly' : '') +
    '. Tap "Ask Yashoda to call me" below and give me your name and number, and I\'ll pass it straight to them. Nothing else from our conversation goes with it.';
}

/* ---------------------------------------------------------------------------
   Composition
   --------------------------------------------------------------------------- */

/**
 * @param {object} args
 * @param {string} args.message the visitor's latest message
 * @param {object} args.state conversation state from state.js
 * @param {object} args.decision triage result
 * @param {object|null} args.teaching result of selectTeaching for this turn
 * @param {string|null} args.previousUrgency the band the last reply conveyed
 * @param {number} [args.bandRepeat] consecutive earlier turns on this same band
 * @returns {string}
 */
export function compose({ message, state, decision, teaching, previousUrgency, bandRepeat }) {
  const text = normalise(message);
  const parts = [];

  /* ---- urgent: the instruction goes first and nothing is stacked on it ---- */
  if (decision.urgency === 'urgent') {
    parts.push(verdict(decision, false));
    if (!state.callbackOffered) parts.push(callbackOffer(decision));
    if (teaching) parts.push(teaching.entry.plain[teaching.from]);
    parts.push('If it gets worse before you are seen — if speaking becomes hard, or your lips or fingertips change colour — treat that as an emergency and call 108.');
    return present(parts.join('\n\n'));
  }

  /* ---- someone asking to be seen gets the pathway, not an interview ---- */
  if (state.extraction.context.includes('wantsAppointment') && state.symptoms.length === 0) {
    parts.push('Of course — let\'s get you in front of a pulmonologist.');
    parts.push('You can book a Yashoda pulmonology appointment with the button below, or call the team on ' + CALL_CENTRE_DISPLAY + ' if you\'d rather arrange it by phone.');
    parts.push('While you\'re here — what has been going on with your breathing? Anything you tell me now is worth mentioning in the room.');
    return present(parts.join('\n\n'));
  }

  const ack = acknowledgement(text);
  const learned = learnedLine(state);

  /* Emotion first when it is strong, otherwise the specific thing they just
     told us. Both together only on the turn where someone volunteers something
     hard — otherwise it reads as a script warming up. */
  if (ack && (state.isFirstTurn || !learned)) parts.push(ack);
  else if (ack && learned) parts.push(ack + ' ' + learned);
  else if (learned) parts.push(learned);

  /* The substance — never a paragraph this conversation has already had. */
  if (teaching) {
    parts.push(teaching.entry.plain.slice(teaching.from, teaching.from + teaching.take).join(' '));
  }

  /* Nothing matched at all — a greeting, an off-topic message, or something the
     extraction could not read. Say what Uppi is for and ask, rather than
     answering a question nobody asked. */
  const hasTopic = state.symptoms.length > 0 || state.familyHistory.length > 0
    || ['scanResult', 'noduleOrScan', 'recurrentInfections', 'knownAsthma', 'knownCopd', 'knownIld', 'knownTb', 'wantsAppointment']
      .some((c) => state.extraction.context.includes(c));
  if (!teaching && !hasTopic) {
    parts.push("I'm here for anything to do with breathing and lungs — a cough, a wheeze, breathlessness, allergies, sleep, smoking, or a test you've been asked to have.");
    parts.push('What have you been noticing?');
    return present(parts.join('\n\n'));
  }

  /* The verdict, in full the first time this band is reached and briefly after
     that. A companion who repeats the same conclusion every turn sounds like a
     recording. */
  const repeat = typeof bandRepeat === 'number' ? bandRepeat : (previousUrgency === decision.urgency ? 1 : 0);
  const v = (decision.urgency === 'routine' && !state.symptoms.length) || repeat >= 2
    ? ''
    : verdict(decision, repeat >= 1);
  if (v) parts.push(v);

  /* The offer to have someone ring them, once the band says they should be
     seen. Said once — repeating an offer of help every turn is pestering. */
  if (decision.appointmentRecommended && !state.callbackOffered) parts.push(callbackOffer(decision));

  /* One question — already checked against the ledger, so it cannot be one
     that has been asked or one whose answer is on record. */
  if (decision.followUp) parts.push(decision.followUp);
  else if (decision.appointmentRecommended) {
    parts.push('You\'ve told me enough to be useful. The next step is someone listening to your chest.');
  } else if (!state.isFirstTurn) {
    parts.push('If anything changes, or you think of something you forgot to mention, tell me and I\'ll take another look.');
  }

  return present(parts.join('\n\n'));
}

/**
 * The urgent state. Composed separately because it must not be structured like
 * a normal answer: the instruction comes first, and nothing is stacked on top
 * of it (§7).
 */
export function composeUrgent(opening, crisis) {
  if (crisis) return present(opening);
  return present(
    opening + '\n\n' +
    'Go to the nearest emergency department now, or call 108 for an ambulance. If you are struggling to breathe, do not drive yourself — ask someone to take you.\n\n' +
    'The Yashoda call centre is ' + CALL_CENTRE_DISPLAY + ' if you need help getting there. I\'ll stay here, but please make the call first.'
  );
}

/**
 * Uppi's opening line. Fixed wording from §5 of the brief — not generated, not
 * varied, because it is the character's introduction.
 */
export const GREETING = "Hi, I'm Uppi, your lung partner. Tell me what's bothering you, and we'll figure out what to do next.";
