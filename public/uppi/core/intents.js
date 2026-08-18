/*
 * The symptom / intent taxonomy (§13).
 *
 * NOT a diagnosis system. Every id here names what the visitor is TALKING
 * ABOUT, never what they have. `cough` means a cough was described; `asthma`
 * means asthma was mentioned as something they already live with or are asking
 * about. Nothing downstream is allowed to read these as conclusions, and the
 * safety gate rejects any reply that treats one as a diagnosis.
 *
 * Two things use this layer:
 *
 *   1. Conversation state, which needs a stable name for "what this
 *      conversation is about" so it can tell a new topic from a follow-up
 *      answer to the old one.
 *   2. The model brief, which is given the intent list rather than raw text, so
 *      the structured understanding is what reaches it (§9, §12).
 *
 * Derived from what `symptoms.js` already extracted — this file adds no new
 * text matching except for the few intents that are about a REQUEST rather than
 * a symptom.
 */

/**
 * The taxonomy. `from` maps an intent to the extraction that implies it; the
 * two request intents carry their own patterns.
 *
 * `label` is how Uppi refers to it out loud, so a summary reads like a person
 * talking rather than a database dump.
 */
export const INTENTS = [
  { id: 'breathlessness', label: 'breathlessness', symptoms: ['breathless'] },
  { id: 'exercise_breathlessness', label: 'breathlessness on effort', when: (e) => e.symptoms.includes('breathless') && e.onExertion },
  { id: 'cough', label: 'a cough', symptoms: ['cough'] },
  { id: 'wheeze', label: 'a wheeze', symptoms: ['wheeze'] },
  { id: 'chest_tightness', label: 'chest tightness', symptoms: ['tightness'] },
  { id: 'chest_pain', label: 'chest pain', symptoms: ['chestpain'] },
  { id: 'phlegm', label: 'phlegm', symptoms: ['sputum'] },
  { id: 'blood_in_sputum', label: 'blood when coughing', when: (e, flags) => !!(flags && flags.flags && flags.flags.some((f) => f.id === 'haemoptysis')) },
  { id: 'fever', label: 'fever', symptoms: ['fever'] },
  { id: 'sleep_related_breathing', label: 'breathing during sleep', when: (e) => e.symptoms.includes('snoring') || e.symptoms.includes('daysleepy') },
  { id: 'snoring', label: 'snoring', symptoms: ['snoring'] },
  { id: 'allergy', label: 'allergies', symptoms: ['allergy'] },
  { id: 'nasal_symptoms', label: 'nose symptoms', when: (e) => e.symptoms.includes('allergy') },
  { id: 'asthma', label: 'asthma', context: ['knownAsthma'] },
  { id: 'COPD', label: 'COPD', context: ['knownCopd'] },
  { id: 'smoking', label: 'smoking', context: ['smoker', 'exsmoker'] },
  { id: 'pollution_exposure', label: 'the air around you', context: ['pollution'] },
  { id: 'recurrent_infections', label: 'infections that keep coming back', context: ['recurrentInfections'] },
  { id: 'lung_nodule', label: 'a lung nodule', when: (e) => e.context.includes('noduleOrScan') && /nodule/.test((e._text || '')) },
  { id: 'abnormal_xray', label: 'a scan result', when: (e) => e.context.includes('noduleOrScan') && /x[\s-]?ray|ct|scan|shadow|spot/.test((e._text || '')) },
  { id: 'abnormal_PFT', label: 'a breathing test result', when: (e) => /spirometry|pft|lung\s+function/.test((e._text || '')) },
  { id: 'child_respiratory_symptoms', label: "your child's breathing", when: (e) => e.context.includes('child') && e.symptoms.length > 0 },
  { id: 'family_history', label: 'what runs in your family', when: (e) => (e.familyHistory || []).length > 0 },
  { id: 'appointment_request', label: 'seeing someone', context: ['wantsAppointment'] },
  { id: 'general_information', label: 'understanding how lungs work', context: ['wantsEducation'] }
];

/* Which intents describe a symptom the visitor is living with, as opposed to a
   request or a piece of history. Used to pick what the conversation is ABOUT. */
const CONCERN_ORDER = [
  'blood_in_sputum', 'chest_pain', 'breathlessness', 'exercise_breathlessness',
  'cough', 'wheeze', 'chest_tightness', 'phlegm', 'fever',
  'sleep_related_breathing', 'snoring', 'allergy', 'nasal_symptoms',
  'recurrent_infections', 'lung_nodule', 'abnormal_xray', 'abnormal_PFT',
  'child_respiratory_symptoms'
];

/**
 * @param {object} extraction merged extraction from symptoms.js
 * @param {object} [flags] red-flag result, for the intents that depend on one
 * @param {string} [text] normalised conversation text, for the scan intents
 * @returns {string[]} intent ids, most clinically significant first
 */
export function classifyIntents(extraction, flags, text) {
  const e = { ...extraction, _text: text || '' };
  const hits = [];
  for (const intent of INTENTS) {
    let hit = false;
    if (intent.symptoms) hit = intent.symptoms.some((s) => e.symptoms.includes(s));
    if (!hit && intent.context) hit = intent.context.some((c) => e.context.includes(c));
    if (!hit && intent.when) { try { hit = !!intent.when(e, flags); } catch { hit = false; } }
    if (hit) hits.push(intent.id);
  }
  return hits;
}

/** The one the conversation is really about — what a follow-up refers back to. */
export function primaryConcern(intents) {
  for (const id of CONCERN_ORDER) if (intents.includes(id)) return id;
  if (intents.includes('asthma') || intents.includes('COPD')) return intents.includes('asthma') ? 'asthma' : 'COPD';
  if (intents.includes('family_history')) return 'family_history';
  if (intents.includes('appointment_request')) return 'appointment_request';
  if (intents.includes('general_information')) return 'general_information';
  return null;
}

/** How Uppi names an intent out loud. */
export function intentLabel(id) {
  const i = INTENTS.find((x) => x.id === id);
  return i ? i.label : id;
}
