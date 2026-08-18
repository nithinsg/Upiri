/*
 * Structured triage.
 *
 * §8 and §10 of the build brief: the decision about how urgently someone needs
 * to be seen is made by rules, not by a language model's free-form prose. The
 * model's job is to say the decision warmly; this file's job is to make it.
 *
 * Four outcomes, matching the brief:
 *   emergency    — go now, do not continue an online conversation
 *   urgent       — be seen within 24 hours
 *   doctor       — a pulmonology appointment is advisable
 *   routine      — education and self-care, keep talking
 *   insufficient — not enough said yet; ask one or two targeted questions
 *
 * `urgent` sits between the brief's A and B bands and is kept separate because
 * "today" and "this month" are different instructions and collapsing them makes
 * the advice useless. It matches the bands the rest of the ŪPIRI symptom
 * checker already uses, so a visitor gets the same answer from both tools.
 *
 * Every rule carries a `reason` written for the visitor, because a triage
 * decision the visitor cannot see the basis of reads as arbitrary.
 */

import { nextQuestion } from './state.js';

export const URGENCY = ['routine', 'insufficient', 'doctor', 'urgent', 'emergency'];

function rank(u) { return URGENCY.indexOf(u); }

/* ---------------------------------------------------------------------------
   Rules
   --------------------------------------------------------------------------- */

/*
 * Each rule reads the merged extraction and returns a reason string when it
 * fires. Ordering does not matter — the engine takes the highest urgency that
 * fired and keeps every reason, so the visitor sees the full picture.
 *
 * Thresholds follow mainstream respiratory guidance: the three-week cough rule
 * (NICE / WHO TB screening / Indian national TB programme), reliever overuse as
 * a marker of poor asthma control (GINA), breathlessness at rest as an urgent
 * presentation, and the smoker-with-symptoms case for COPD and lung-cancer
 * suspicion (GOLD, NICE NG12).
 */
const RULES = [
  /* ---- urgent: seen within 24 hours ---- */
  {
    urgency: 'urgent',
    test: (e) => e.symptoms.includes('breathless') && e.atRest,
    reason: 'breathlessness that happens even at rest'
  },
  {
    urgency: 'urgent',
    test: (e) => e.symptoms.includes('breathless') && e.symptoms.includes('fever'),
    reason: 'breathlessness together with a fever'
  },
  {
    urgency: 'urgent',
    test: (e) => e.context.includes('relieverOveruse'),
    reason: 'your reliever inhaler not holding the way it should'
  },
  {
    urgency: 'urgent',
    test: (e) => (e.context.includes('knownAsthma') || e.context.includes('knownCopd')) && e.context.includes('worsening') && (e.symptoms.includes('breathless') || e.symptoms.includes('wheeze')),
    reason: 'a flare-up of a lung condition you already live with'
  },
  {
    urgency: 'urgent',
    test: (e) => e.context.includes('child') && (e.symptoms.includes('breathless') || e.symptoms.includes('wheeze')) && e.context.includes('worsening'),
    reason: "your child's breathing getting worse"
  },
  {
    urgency: 'urgent',
    test: (e) => e.symptoms.includes('breathless') && e.severity === 'severe',
    reason: 'breathlessness you are describing as severe'
  },
  {
    urgency: 'urgent',
    /* A reliever that has stopped working is the definition of an asthma attack
       that is not being controlled — GINA treats it as an acute presentation
       however calm the rest of the message sounds. */
    test: (e) => e.medicationNotHelping && (e.symptoms.includes('breathless') || e.symptoms.includes('wheeze') || e.symptoms.includes('tightness')),
    reason: 'your inhaler not working the way it usually does'
  },
  {
    urgency: 'urgent',
    test: (e) => e.symptoms.includes('breathless') && e.onset === 'sudden',
    reason: 'breathlessness that came on suddenly'
  },

  /* ---- doctor: a pulmonology appointment is advisable ---- */
  {
    urgency: 'doctor',
    test: (e) => e.symptoms.includes('cough') && e.durationDays != null && e.durationDays >= 21,
    reason: 'a cough that has lasted three weeks or more'
  },
  {
    urgency: 'doctor',
    test: (e) => e.symptoms.includes('weightloss'),
    reason: 'weight loss you have not been trying for'
  },
  {
    urgency: 'doctor',
    test: (e) => e.symptoms.includes('hoarse') && (e.durationDays == null || e.durationDays >= 21),
    reason: 'a voice change that has not settled'
  },
  {
    urgency: 'doctor',
    test: (e) => e.symptoms.includes('breathless') && e.onExertion && e.context.includes('worsening'),
    reason: 'breathlessness on exertion that is getting worse'
  },
  {
    urgency: 'doctor',
    test: (e) => (e.context.includes('smoker') || e.context.includes('exsmoker')) && (e.symptoms.includes('cough') || e.symptoms.includes('breathless') || e.symptoms.includes('sputum')),
    reason: 'chest symptoms in someone who smokes or used to'
  },
  {
    urgency: 'doctor',
    test: (e) => e.symptoms.includes('wheeze') && (e.symptoms.includes('nightsym') || e.context.includes('worsening')),
    reason: 'a wheeze that keeps coming back'
  },
  {
    urgency: 'doctor',
    test: (e) => e.symptoms.includes('snoring') && e.symptoms.includes('daysleepy'),
    reason: 'snoring together with daytime sleepiness'
  },
  {
    urgency: 'doctor',
    test: (e) => (e.context.includes('knownIld') || e.context.includes('knownTb')) && e.symptoms.length > 0,
    reason: 'new symptoms alongside a lung condition already on your record'
  },
  {
    urgency: 'doctor',
    test: (e) => e.context.includes('pregnant') && e.symptoms.length > 0,
    reason: 'chest symptoms during pregnancy, which are always worth a proper look'
  },
  {
    urgency: 'doctor',
    test: (e) => e.symptoms.includes('chestpain') && e.symptoms.includes('cough') && e.durationDays != null && e.durationDays >= 14,
    reason: 'chest discomfort alongside a cough that is not settling'
  },
  {
    urgency: 'doctor',
    /* New exertional breathlessness that has persisted for weeks is the classic
       presentation that needs spirometry rather than reassurance (GOLD, NICE
       NG12) — and before this rule existed the conversation could accumulate
       every detail of it and still land on "tell me more". */
    test: (e) => e.symptoms.includes('breathless') && e.onExertion && e.durationDays != null && e.durationDays >= 14,
    reason: 'breathlessness on exertion that has been going on for weeks'
  },
  {
    urgency: 'doctor',
    test: (e) => e.symptoms.includes('breathless') && e.durationDays != null && e.durationDays >= 60,
    reason: 'breathlessness that has been there for months'
  },
  {
    urgency: 'doctor',
    test: (e) => e.context.includes('recurrentInfections'),
    reason: 'chest infections that keep coming back'
  },
  {
    urgency: 'doctor',
    test: (e) => e.context.includes('scanResult'),
    reason: 'a scan or breathing-test result that deserves a specialist read'
  },
  {
    urgency: 'doctor',
    test: (e) => (e.familyHistory || []).some((f) => f.condition === 'lung cancer') && (e.symptoms.length > 0 || e.context.includes('smoker') || e.context.includes('exsmoker')),
    reason: 'lung cancer in the family alongside what you are noticing yourself'
  },
  {
    urgency: 'doctor',
    test: (e) => e.context.includes('child') && e.symptoms.includes('cough') && e.durationDays != null && e.durationDays >= 28,
    reason: "a cough in a child that has lasted more than a month"
  },
  {
    urgency: 'doctor',
    test: (e) => e.context.includes('relieverFrequent') && !e.context.includes('relieverOveruse'),
    reason: 'needing your reliever inhaler most days, which usually means the treatment needs revisiting'
  },
  {
    urgency: 'doctor',
    test: (e) => e.context.includes('wantsAppointment'),
    reason: 'you asked to see someone'
  },

  /* ---- routine: keep talking, education and self-care ---- */
  {
    urgency: 'routine',
    test: (e) => e.symptoms.includes('cough') && e.durationDays != null && e.durationDays < 21 && !e.symptoms.includes('weightloss'),
    reason: 'a cough that started recently'
  },
  {
    urgency: 'routine',
    test: (e) => e.symptoms.includes('allergy') && !e.symptoms.includes('breathless'),
    reason: 'allergy symptoms in the nose and eyes'
  },
  {
    urgency: 'routine',
    /* Family history on its own is a reason to talk and to know the warning
       signs — not a reason to send someone to a clinic today. */
    test: (e) => (e.familyHistory || []).length > 0 && e.symptoms.length === 0,
    reason: 'a family history worth understanding properly'
  }
];

/* ---------------------------------------------------------------------------
   Follow-up questions
   --------------------------------------------------------------------------- */

/*
 * The questions themselves, and the ledger that stops one being asked twice,
 * live in `state.js` — because the choice depends on the whole conversation,
 * not on this turn's urgency. §17 still holds: one question, never a list.
 */

/* ---------------------------------------------------------------------------
   Suggested actions
   --------------------------------------------------------------------------- */

/*
 * Actions the interface turns into buttons. Every action here is wired to
 * something real in the ŪPIRI site — nothing in this list is decorative.
 */
function actionsFor(urgency, e) {
  const acts = [];
  if (urgency === 'emergency') {
    acts.push({ id: 'emergency-call', kind: 'emergency', label: 'Call 108 — emergency ambulance' });
    acts.push({ id: 'call-centre', kind: 'call', label: 'Call Yashoda' });
    return acts;
  }
  if (urgency === 'urgent' || urgency === 'doctor') {
    acts.push({ id: 'book', kind: 'book', label: 'Book a Pulmonology Appointment' });
    acts.push({ id: 'call-centre', kind: 'call', label: 'Call the Yashoda Call Centre' });
  }
  /* the site's own tools, offered only when they match what was said */
  if (e.context.includes('knownAsthma')) acts.push({ id: 'act', kind: 'route', label: 'Score your asthma control (ACT)', href: '/asthma-control-test' });
  if (e.context.includes('knownCopd')) acts.push({ id: 'cat', kind: 'route', label: 'Score your COPD (CAT)', href: '/copd-assessment-test' });
  if ((e.context.includes('smoker') || e.context.includes('exsmoker')) && urgency !== 'emergency') acts.push({ id: 'quit', kind: 'route', label: 'Rendo ŪPIRI — 90-day quit programme', href: '/rendo-upiri' });
  if (urgency === 'routine' && e.symptoms.length > 0) acts.push({ id: 'symptom-checker', kind: 'route', label: 'Run the full Symptom Checker', href: '/symptom-checker' });
  if (e.symptoms.includes('allergy')) acts.push({ id: 'allergy', kind: 'route', label: 'Hyderabad allergy calendar', href: '/allergy-calendar' });
  if (e.context.includes('noduleOrScan')) acts.push({ id: 'nodule', kind: 'route', label: 'How a lung nodule is followed up', href: '/nodule-journey' });
  if (e.symptoms.includes('snoring') || e.symptoms.includes('daysleepy')) acts.push({ id: 'sleep', kind: 'route', label: 'Sleep studies at Yashoda', href: '/tests-and-procedures' });
  return acts;
}

/* ---------------------------------------------------------------------------
   The engine
   --------------------------------------------------------------------------- */

/**
 * @param {object} extraction merged extraction from symptoms.js
 * @param {object} redFlags   result of detectRedFlags on the latest message
 * @returns {{urgency:string, reasons:string[], followUp:string|null,
 *            appointmentRecommended:boolean, emergencyRecommended:boolean,
 *            actions:Array<object>, band:object}}
 */
export function triage(extraction, redFlags, state) {
  if (redFlags && redFlags.hit) {
    return {
      urgency: 'emergency',
      reasons: redFlags.flags.map((f) => f.why),
      followUp: null,
      followUpId: null,
      appointmentRecommended: false,
      emergencyRecommended: true,
      crisis: !!redFlags.crisis,
      actions: actionsFor('emergency', extraction),
      band: BANDS.emergency
    };
  }

  /* A rule that throws is a bug in that rule, not a reason to fail the whole
     assessment — it drops out and the rest still run. */
  const fired = RULES.filter((r) => { try { return r.test(extraction); } catch { return false; } });
  let urgency = fired.length ? fired.reduce((a, r) => (rank(r.urgency) > rank(a) ? r.urgency : a), 'routine') : null;

  /* Nothing fired and nothing was said that a rule could read — that is
     category D, not a clean bill of health. */
  if (!urgency) urgency = extraction.symptoms.length ? 'insufficient' : 'routine';

  /* A symptom with no qualifiers is also category D: we know something, but
     not enough to route it. Rules that fired at `doctor` or above already know
     enough, so they are left alone. */
  if (urgency === 'routine' && extraction.symptoms.length > 0 && extraction.durationDays == null && !extraction.atRest && !extraction.onExertion) {
    urgency = 'insufficient';
  }

  const reasons = fired.filter((r) => r.urgency === urgency).map((r) => r.reason);

  /* One question, chosen against the ledger: never one already asked, never one
     whose answer is already on record. Null is a legitimate answer — it means
     this conversation has what it needs and should act instead. */
  const question = (urgency === 'emergency' || urgency === 'urgent') ? null : nextQuestion(extraction, {
    asked: (state && state.questionsAlreadyAsked) || [],
    filled: (state && state.filled) || undefined
  });

  return {
    urgency,
    reasons,
    followUp: question ? question.text : null,
    followUpId: question ? question.id : null,
    appointmentRecommended: urgency === 'urgent' || urgency === 'doctor',
    emergencyRecommended: false,
    crisis: false,
    actions: actionsFor(urgency, extraction),
    band: BANDS[urgency]
  };
}

/*
 * Presentation for each band. Colours are the ŪPIRI palette already used by the
 * symptom checker, so an urgent result looks the same wherever it is reached.
 */
export const BANDS = {
  emergency: { id: 'emergency', label: 'Seek emergency care now', color: '#BE3A2F', soft: '#FBE7E5', when: 'Immediately' },
  urgent: { id: 'urgent', label: 'See a doctor within 24 hours', color: '#BE3A2F', soft: '#FBE7E5', when: 'Within 24 hours' },
  doctor: { id: 'doctor', label: 'Worth seeing a pulmonologist', color: '#916300', soft: '#FBF1DC', when: 'This week' },
  insufficient: { id: 'insufficient', label: 'Tell me a bit more', color: '#2C2A6B', soft: '#E7E7F4', when: '' },
  routine: { id: 'routine', label: 'Manageable for now', color: '#27784C', soft: '#E3F2E9', when: 'Routine' }
};
