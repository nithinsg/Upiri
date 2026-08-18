/*
 * The conversation, end to end through the deterministic engine.
 *
 * These are the six conversations §30 of the brief names, plus the properties
 * that have to hold across ALL of them: never ask a question twice, never lose
 * something you were told, never repeat a paragraph, and never let the reply
 * disagree with the triage band.
 *
 * Every assertion here is a regression that actually happened. The build being
 * replaced answered "mostly at night" with the same opening paragraph about
 * coughs it had already sent, and asked "is the cough dry?" three turns
 * running, having already been told the answer.
 */

import { describe, ok, eq, includes, excludes, report } from './_harness.mjs';
import { assess } from '../public/uppi/core/engine.js';

/* Runs a conversation and returns every turn's assessment. */
function converse(turns) {
  const messages = [];
  const out = [];
  for (const t of turns) {
    messages.push({ role: 'user', content: t });
    const a = assess(messages);
    messages.push({ role: 'assistant', content: a.text });
    out.push(a);
  }
  return out;
}

/* No question id may be selected twice in one conversation. */
function repeatedQuestion(turns) {
  const seen = [];
  for (const a of turns) {
    const id = a.decision.followUpId;
    if (!id) continue;
    if (seen.indexOf(id) !== -1) return id;
    seen.push(id);
  }
  return null;
}

/* No sentence of curated material may be sent twice. */
function repeatedSentence(turns) {
  const seen = [];
  for (const a of turns) {
    for (const s of a.text.split(/(?<=\.)\s+/)) {
      const key = s.trim();
      if (key.length < 60) continue;               /* short lines recur legitimately */
      if (seen.indexOf(key) !== -1) return key;
      seen.push(key);
    }
  }
  return null;
}

describe('TEST 1 — breathless on stairs, accumulating context');
const t1 = converse([
  "I'm getting breathless when I climb stairs.",
  'Only when I walk quickly.',
  'It started about two months ago.'
]);
eq(repeatedQuestion(t1), null, 'no question is asked twice');
eq(repeatedSentence(t1), null, 'no paragraph is sent twice');
ok(t1[1].state.onExertion, 'turn 2 keeps what turn 1 established');
eq(t1[2].state.duration, 60, 'turn 3 adds the duration to the picture');
eq(t1[2].decision.urgency, 'doctor', 'the accumulated picture reaches a real conclusion');
ok(t1[2].decision.appointmentRecommended, 'and recommends an appointment');

describe('TEST 2 — cough: the duration must never be asked twice');
const t2 = converse(["I've been coughing.", 'Three weeks.', 'Mostly at night.', 'I sometimes wheeze.']);
eq(t2[0].decision.followUpId, 'duration', 'the first question is how long');
eq(repeatedQuestion(t2), null, 'no question is asked twice across four turns');
for (let i = 1; i < t2.length; i++) {
  excludes(t2[i].decision.followUpId || '', 'duration', 'turn ' + (i + 1) + ' does not ask the duration again');
  eq(t2[i].state.duration, 21, 'turn ' + (i + 1) + ' still knows it is three weeks');
}
eq(repeatedSentence(t2), null, 'no paragraph is sent twice');
includes(t2[1].text, 'weeks', 'the reply USES the duration it was given');
includes(t2[2].state.symptoms, 'nightsym', '"mostly at night" is understood as a night pattern');
includes(t2[3].state.symptoms, 'wheeze', 'a wheeze added later joins the picture');

describe('TEST 3 — the inhaler has stopped working');
const t3 = converse(["My inhaler isn't helping and I'm finding it hard to breathe."]);
eq(t3[0].decision.urgency, 'urgent', 'this is urgent, not an asthma lesson');
eq(t3[0].emotion, 'concerned', 'and the face matches');
eq(t3[0].decision.followUpId, null, 'an urgent answer does not continue the interview');
ok(t3[0].text.indexOf('today') !== -1 || t3[0].text.indexOf('tomorrow') !== -1, 'it says when to be seen');
ok(t3[0].text.indexOf('108') !== -1, 'and what to do if it worsens first');

describe('TEST 4 — someone asking to be seen');
const t4 = converse(['I want to book a pulmonologist.']);
ok(t4[0].decision.appointmentRecommended, 'the appointment pathway is offered immediately');
ok(t4[0].decision.actions.some((a) => a.kind === 'book'), 'with a booking action');
ok(t4[0].decision.actions.some((a) => a.kind === 'call'), 'and the call centre');
includes(t4[0].text, 'pulmonologist', 'and says so in words, not only in buttons');

describe('TEST 5 — haemoptysis with breathlessness');
const t5 = converse(["I've been coughing up a lot of blood and I'm very breathless."]);
eq(t5[0].decision.urgency, 'emergency', 'this is an emergency');
ok(t5[0].flags.hit, 'detected by the red-flag layer, which runs in the browser');
includes(t5[0].text, '108', 'the ambulance number is in the first reply');
eq(t5[0].decision.followUpId, null, 'no follow-up question is asked');
ok(t5[0].text.indexOf('emergency') !== -1, 'the word emergency is used plainly');

describe('TEST 6 — a father with lung cancer');
const t6 = converse(["I'm worried because my father had lung cancer."]);
eq(t6[0].decision.urgency, 'routine', 'family history alone is not escalated');
eq(t6[0].state.familyHistory.length, 1, 'the family history is recorded');
eq(t6[0].state.symptoms.length, 0, "and is not mistaken for the visitor's own symptoms");
eq(t6[0].decision.followUpId, 'ownSymptoms', 'the question asked is about them, not about their father');
ok(t6[0].text.indexOf('worried') !== -1 || t6[0].text.indexOf('reasonable') !== -1, 'the reply acknowledges the worry first');

describe('Natural language the brief names (§11)');
const nl = converse([
  'I get breathless when I climb two floors.',
  "It's been happening for around a month.",
  'I smoke about 5 cigarettes a day.',
  'My chest feels tight.',
  'Sometimes I wheeze.'
]);
eq(repeatedQuestion(nl), null, 'five turns, no repeated question');
eq(repeatedSentence(nl), null, 'five turns, no repeated paragraph');
eq(nl[0].state.exertionFloors, 2, '"two floors" is understood as an effort threshold');
eq(nl[1].state.duration, 30, '"around a month" is understood');
eq(nl[2].state.smokingExposure.perDay, 5, '"about 5 cigarettes a day" is understood');
eq(nl[2].state.smokingExposure.status, 'current', 'and recorded as a current smoking history');
includes(nl[3].state.symptoms, 'tightness', '"my chest feels tight" is understood');
includes(nl[4].state.symptoms, 'wheeze', '"sometimes I wheeze" is understood');

describe('Answers are not re-asked, whichever way they are phrased');
const denial = converse(['My 6 year old coughs every night', 'no fever', 'about two weeks now', "it's dry"]);
eq(repeatedQuestion(denial), null, 'no repeated question');
includes(denial[1].state.denied, 'fever', '"no fever" fills the fever slot');
includes(denial[3].state.denied, 'sputum', '"it\'s dry" fills the phlegm slot');
eq(denial[0].state.ageGroup, 'child', 'a child is recognised');
for (const a of denial.slice(2)) {
  excludes(a.decision.followUpId || '', 'fever', 'the fever question is never asked after it was answered with a no');
}

describe('Properties that hold across every conversation');
const all = [t1, t2, t3, t4, t5, t6, nl, denial];
let asked = 0;
for (const c of all) {
  for (const a of c) {
    if (a.decision.followUpId) asked++;
    ok(a.text.length > 0, 'every turn produces an answer');
    ok(a.text.length <= 1100, 'no answer exceeds the display limit');
    ok((a.text.match(/\?/g) || []).length <= 1, 'never more than one question in a reply (§17)');
    if (a.decision.urgency === 'emergency') eq(a.decision.followUpId, null, 'an emergency never asks a question');
  }
}
ok(asked > 0, 'questions are still being asked where they are useful (' + asked + ' across the suite)');

report('conversation');
