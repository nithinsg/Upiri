/*
 * Conversation state, and the question ledger (§9, §10, §12).
 *
 * This file exists because of one specific failure: a symptom checker that asks
 * "how long has the cough been going on?", is told "about three weeks", and
 * then asks it again. Nothing else Uppi does damages trust faster — it says,
 * plainly, that nobody was listening.
 *
 * The fix is a ledger with two halves:
 *
 *   SLOTS      — what is now known. A slot is filled by a yes OR by a no:
 *                "the cough is dry" fills the phlegm slot as firmly as "yes,
 *                green phlegm" does.
 *   ASKED      — which questions have already been put to the visitor, whoever
 *                phrased them. Rebuilt deterministically by replaying the
 *                selection over the conversation prefix, and cross-checked
 *                against what the assistant turns actually said, so a question
 *                the model rephrased in its own words still counts as asked.
 *
 * A question is only ever offered when its slot is empty AND it has never been
 * asked. When every question is spent, `nextQuestion` returns null — and that
 * is the correct answer, not a gap. A conversation that has learned what it
 * needs should act, not keep interrogating.
 */

import { extractSymptoms, mergeExtractions } from './symptoms.js';
import { normalise } from './redflags.js';

/* ---------------------------------------------------------------------------
   Slots
   --------------------------------------------------------------------------- */

/*
 * `filled` answers one question only: does the conversation already know this?
 * It must never look at whether the answer was reassuring.
 */
export const SLOTS = [
  { id: 'duration', filled: (e) => e.durationDays != null },
  { id: 'pattern', filled: (e) => e.atRest || e.onExertion },
  { id: 'sputum', filled: (e) => e.symptoms.includes('sputum') || e.denied.includes('sputum') },
  { id: 'smoking', filled: (e) => e.context.includes('smoker') || e.context.includes('exsmoker') || e.contextDenied.includes('smoker') || e.smokingPerDay != null || e.packYears != null },
  { id: 'triggers', filled: (e) => e.triggers.length > 0 || e.context.includes('pollution') },
  { id: 'timing', filled: (e) => e.symptoms.includes('nightsym') || e.denied.includes('nightsym') || e.triggers.includes('lyingdown') },
  { id: 'severity', filled: (e) => !!e.severity },
  { id: 'onset', filled: (e) => !!e.onset },
  { id: 'relieverUse', filled: (e) => e.context.includes('relieverOveruse') || e.context.includes('relieverFrequent') || e.medicationNotHelping || e.frequencyGiven },
  { id: 'fever', filled: (e) => e.symptoms.includes('fever') || e.denied.includes('fever') },
  { id: 'worsening', filled: (e) => e.context.includes('worsening') || e.contextDenied.includes('worsening') },
  { id: 'previousEpisodes', filled: (e) => e.previousEpisodes },
  { id: 'sleepWitness', filled: (e) => e.symptoms.includes('daysleepy') || e.denied.includes('daysleepy') },
  { id: 'age', filled: (e) => e.ageYears != null || e.context.includes('child') || e.context.includes('elderly') },
  { id: 'ownSymptoms', filled: (e) => e.symptoms.length > 0 || e.denied.length > 0 }
];

/** @returns {string[]} the ids of every slot the conversation has an answer for */
export function filledSlots(extraction) {
  return SLOTS.filter((s) => { try { return s.filled(extraction); } catch { return false; } }).map((s) => s.id);
}

/* ---------------------------------------------------------------------------
   The questions
   --------------------------------------------------------------------------- */

/*
 * Ordered by clinical value, which is the order they should be asked in: the
 * engine takes the first whose slot is empty and which has not been asked.
 *
 * `echoes` are the phrases that mean "this has been asked" when they appear in
 * an assistant turn. They exist because the model is allowed to rephrase the
 * question in Uppi's voice, and a ledger that only recognised its own exact
 * wording would let a rephrased question be asked twice.
 */
export const QUESTIONS = [
  {
    id: 'duration', slot: 'duration',
    when: (e) => e.symptoms.some((s) => ['cough', 'breathless', 'wheeze', 'tightness', 'sputum', 'hoarse'].includes(s)),
    q: (e) => 'How long has ' + (e.symptoms.includes('cough') ? 'the cough' : 'this') + ' been going on — days, weeks, or longer?',
    echoes: [/how long/i, /when did (?:it|this) start/i, /since when/i]
  },
  {
    id: 'pattern', slot: 'pattern',
    when: (e) => e.symptoms.includes('breathless'),
    q: () => 'Does the breathlessness come on when you move around, or does it happen even when you are sitting still?',
    echoes: [/sitting still/i, /at rest/i, /when you (?:move|walk|exert)/i]
  },
  {
    id: 'severity', slot: 'severity',
    when: (e) => e.symptoms.includes('breathless') && (e.atRest || e.context.includes('worsening')),
    q: () => 'When it is at its worst, can you still speak in full sentences and manage around the house?',
    echoes: [/full sentences/i, /how bad/i, /at its worst/i]
  },
  {
    id: 'sputum', slot: 'sputum',
    when: (e) => e.symptoms.includes('cough'),
    q: () => 'Is the cough dry, or are you bringing up phlegm?',
    echoes: [/\bdry\b/i, /bringing up/i, /come up with it/i, /phlegm/i]
  },
  {
    id: 'timing', slot: 'timing',
    when: (e) => e.symptoms.includes('cough') || e.symptoms.includes('wheeze') || e.symptoms.includes('tightness'),
    q: () => 'Is it worse at any particular time — at night, first thing in the morning, or after being around dust or smoke?',
    echoes: [/at night/i, /particular time/i, /first thing in the morning/i]
  },
  {
    id: 'smoking', slot: 'smoking',
    when: (e) => e.symptoms.some((s) => ['cough', 'breathless', 'sputum', 'wheeze'].includes(s)),
    q: (e) => (e.context.includes('child')
      ? 'Does anyone smoke at home, or is there much smoke or dust around — cooking fire, incense, traffic?'
      : 'Do you smoke, or did you at any point?'),
    echoes: [/do you smoke/i, /smoked/i, /smoking history/i]
  },
  {
    id: 'relieverUse', slot: 'relieverUse',
    when: (e) => e.context.includes('knownAsthma') || e.context.includes('inhaler'),
    q: () => 'How often are you reaching for your reliever inhaler in a normal week?',
    echoes: [/reliever/i, /how often.*inhaler/i, /inhaler.*how often/i]
  },
  {
    id: 'worsening', slot: 'worsening',
    when: (e) => e.durationDays != null && e.symptoms.length > 0,
    q: () => 'And is it getting worse, staying about the same, or slowly easing?',
    echoes: [/getting worse/i, /staying (?:about )?the same/i, /easing/i]
  },
  {
    id: 'triggers', slot: 'triggers',
    when: (e) => e.symptoms.length > 0,
    q: () => 'Is there anything that reliably sets it off — dust, smoke, cold air, exercise, a particular room?',
    echoes: [/sets it off/i, /trigger/i, /brings it on/i]
  },
  {
    id: 'sleepWitness', slot: 'sleepWitness',
    when: (e) => e.symptoms.includes('snoring'),
    q: () => 'Has anyone told you that you stop breathing or gasp during sleep — and how do you feel through the day?',
    echoes: [/stop breathing/i, /gasp/i, /through the day/i]
  },
  {
    id: 'fever', slot: 'fever',
    when: (e) => e.symptoms.includes('cough') && e.durationDays != null && e.durationDays <= 21,
    q: () => 'Has there been any fever with it?',
    echoes: [/fever/i, /temperature/i]
  },
  {
    id: 'onset', slot: 'onset',
    when: (e) => e.symptoms.includes('breathless') && e.durationDays != null,
    q: () => 'Did it come on over days, or has it built up gradually over months?',
    echoes: [/come on over/i, /built up/i, /gradually/i]
  },
  {
    id: 'previousEpisodes', slot: 'previousEpisodes',
    when: (e) => e.symptoms.includes('wheeze') || e.symptoms.includes('tightness') || e.context.includes('knownAsthma'),
    q: () => 'Has this happened before — a spell like this in a previous year or season?',
    echoes: [/happened before/i, /previous (?:year|season)/i, /first time/i]
  },
  {
    id: 'childAge', slot: 'age',
    when: (e) => e.context.includes('child'),
    q: () => 'How old are they?',
    echoes: [/how old/i]
  },
  {
    /* Family history with no symptoms of their own yet. The useful question is
       not about the relative — it is whether anything is happening to them. */
    id: 'ownSymptoms', slot: 'ownSymptoms',
    when: (e) => (e.familyHistory || []).length > 0,
    q: () => 'Is there anything you have noticed in yourself — a cough, breathlessness, anything that made you think about it now?',
    echoes: [/noticed in yourself/i, /anything yourself/i, /your own/i]
  },
  {
    id: 'scanReport', slot: 'scanReport',
    when: (e) => e.context.includes('scanResult'),
    q: () => 'Do you have the report with you — does it give a size, and was anything recommended?',
    echoes: [/report/i, /give a size/i]
  },
  {
    id: 'open', slot: null,
    when: (e) => e.symptoms.length === 0,
    q: () => 'Tell me a little more about what you are noticing, and when it happens.',
    echoes: [/tell me a little more/i, /what have you been noticing/i]
  }
];

/**
 * The next question worth asking, or null when there is nothing left that this
 * conversation does not already know.
 *
 * @param {object} extraction merged extraction
 * @param {{asked:string[], filled:string[]}} ledger
 */
export function nextQuestion(extraction, ledger) {
  const asked = (ledger && ledger.asked) || [];
  const filled = (ledger && ledger.filled) || filledSlots(extraction);
  for (const item of QUESTIONS) {
    if (asked.includes(item.id)) continue;
    if (item.slot && filled.includes(item.slot)) continue;
    let ok = false;
    try { ok = item.when(extraction); } catch { ok = false; }
    if (!ok) continue;
    return { id: item.id, slot: item.slot, text: item.q(extraction) };
  }
  return null;
}

/** Questions an assistant turn appears to have asked, however it was phrased. */
function echoedQuestions(text) {
  if (!text || text.indexOf('?') === -1) return [];
  const out = [];
  for (const item of QUESTIONS) {
    if (item.echoes.some((re) => re.test(text))) out.push(item.id);
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Building the state
   --------------------------------------------------------------------------- */

/**
 * Replays the conversation to produce the structured state described in §9.
 *
 * Deterministic and side-effect free: the same messages always produce the same
 * state, on the server or in the browser, which is what makes the ledger
 * trustworthy after a page reload or a failed request.
 *
 * @param {Array<{role:string,content:string}>} messages whole conversation, oldest first
 * @returns {object} conversation state
 */
export function buildState(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const userTurns = list.filter((m) => m.role === 'user');
  const perTurn = userTurns.map((m) => extractSymptoms(m.content));

  const now = mergeExtractions(perTurn);
  const before = mergeExtractions(perTurn.slice(0, -1));

  const filled = filledSlots(now);
  const filledBefore = filledSlots(before);

  /* What THIS turn taught us. Compose leads with it, because acknowledging the
     new thing is what makes a reply feel like an answer rather than a form. */
  const learned = filled.filter((s) => !filledBefore.includes(s));
  const newSymptoms = now.symptoms.filter((s) => !before.symptoms.includes(s));
  /* Timing and exertion are qualifiers wearing a symptom's clothes: they refine
     a complaint rather than adding one, so they must not unlock a fresh
     paragraph of teaching. */
  const newComplaints = newSymptoms.filter((s) => s !== 'nightsym' && s !== 'exercise');

  /* Details that sharpened rather than appeared. "Only when I walk quickly"
     fills no new slot — it refines one — and a reply that ignores it sounds
     like the answer went unheard. */
  const refined = ['exertionOnly', 'exertionFloors', 'severity', 'onset', 'smokingPerDay', 'medicationNotHelping', 'previousEpisodes']
    .filter((k) => now[k] && now[k] !== before[k]);

  /* The ledger, from both directions: replay what the engine would have asked
     at each earlier turn, and read what the assistant turns actually said. */
  const asked = [];
  const push = (id) => { if (id && !asked.includes(id)) asked.push(id); };
  for (let i = 1; i <= perTurn.length - 1; i++) {
    const prefix = mergeExtractions(perTurn.slice(0, i));
    const q = nextQuestion(prefix, { asked: asked.slice(), filled: filledSlots(prefix) });
    if (q) push(q.id);
  }
  for (const m of list) if (m.role === 'assistant') for (const id of echoedQuestions(m.content)) push(id);

  const text = normalise(userTurns.map((m) => m.content).join(' | '));

  /* Has Uppi already offered to have someone ring them? Offering again every
     turn is pestering, and it pushes the actual advice down the screen. */
  const callbackOffered = list.some((m) => m.role === 'assistant' && /ask the yashoda team to call you|ask yashoda to call me/i.test(m.content));

  return {
    /* §9 — the structured picture the model is given instead of raw text */
    symptoms: now.symptoms,
    symptomLabels: now.labels,
    denied: now.denied,
    duration: now.durationDays,
    severity: now.severity,
    onset: now.onset,
    triggers: now.triggers,
    triggerLabels: now.triggerLabels,
    associatedSymptoms: now.symptoms.slice(1),
    ageGroup: now.context.includes('child') ? 'child' : now.context.includes('elderly') ? 'elderly' : now.ageYears != null ? (now.ageYears < 16 ? 'child' : now.ageYears >= 65 ? 'elderly' : 'adult') : null,
    ageYears: now.ageYears,
    smokingExposure: {
      status: now.context.includes('smoker') ? 'current' : now.context.includes('exsmoker') ? 'ex' : now.contextDenied.includes('smoker') ? 'never' : null,
      perDay: now.smokingPerDay,
      packYears: now.packYears,
      pollution: now.context.includes('pollution')
    },
    knownConditions: ['knownAsthma', 'knownCopd', 'knownIld', 'knownTb']
      .filter((c) => now.context.includes(c))
      .map((c) => ({ knownAsthma: 'asthma', knownCopd: 'COPD', knownIld: 'interstitial lung disease', knownTb: 'tuberculosis' })[c]),
    medications: {
      inhaler: now.context.includes('inhaler'),
      notHelping: now.medicationNotHelping,
      relieverOveruse: now.context.includes('relieverOveruse')
    },
    previousEpisodes: now.previousEpisodes,
    familyHistory: now.familyHistory,
    atRest: now.atRest,
    onExertion: now.onExertion,
    exertionOnly: now.exertionOnly,
    exertionFloors: now.exertionFloors,
    worsening: now.context.includes('worsening'),

    /* the ledger */
    filled,
    questionsAlreadyAsked: asked,
    learned,
    refined,
    newSymptoms,
    newComplaints,
    turnCount: userTurns.length,
    isFirstTurn: userTurns.length <= 1,
    callbackOffered,

    /* carried through for the rules and the composer */
    extraction: now,
    previousExtraction: before,
    latestExtraction: perTurn[perTurn.length - 1] || null,
    text
  };
}
