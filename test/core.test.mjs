/*
 * The deterministic layers: red flags, extraction, triage, the safety gate.
 *
 * Everything here decides something medical, which is why it is rules rather
 * than a model — and why it needs a test that fails loudly when someone
 * "simplifies" it. The awkward cases are the point of the file: the negations,
 * the hypotheticals and the colloquial vocabulary are all things that were
 * wrong at some stage of the build.
 */

import { describe, ok, eq, includes, excludes, report } from './_harness.mjs';
import { detectRedFlags, normalise } from '../public/uppi/core/redflags.js';
import { extractSymptoms, mergeExtractions, parseDuration } from '../public/uppi/core/symptoms.js';
import { triage } from '../public/uppi/core/triage.js';
import { validate, present } from '../public/uppi/core/safety.js';
import { retrieve } from '../public/uppi/core/knowledge.js';
import { classifyIntents, primaryConcern } from '../public/uppi/core/intents.js';
import { callbackOffer } from '../public/uppi/core/compose.js';
import { buildState } from '../public/uppi/core/state.js';

const flags = (t) => detectRedFlags(t);
const band = (turns) => {
  const merged = mergeExtractions(turns.map(extractSymptoms));
  return triage(merged, detectRedFlags(turns[turns.length - 1]), null).urgency;
};

describe('Red flags — the emergency layer');
ok(flags("I'm coughing up blood").hit, 'coughing up blood is an emergency');
ok(flags('my lips are turning blue').hit, 'blue lips is an emergency');
ok(flags('I cannot speak in full sentences').hit, 'too breathless to speak is an emergency');
ok(flags('khoon aa raha hai when I cough').hit, 'Hinglish "khoon" reaches the same rule');
ok(flags('I want to kill myself').crisis, 'self-harm routes to the crisis path');

describe('Red flags — the guards that stop false alarms');
ok(!flags('cough but no blood').hit, 'a negated flag does not fire ("cough but no blood")');
ok(!flags('is coughing blood serious?').hit, 'a question about a symptom is not a report of it');
ok(!flags('what should I do if I cough blood').hit, 'a hypothetical is not a report');
ok(flags('what should I do if I cough blood — it started this morning').hit, 'a hypothetical that also self-reports IS a report');
ok(!flags('I have no chest pain').hit, 'an explicit denial does not fire');

describe('Duration parsing');
eq(parseDuration('about three weeks'), 21, 'three weeks');
eq(parseDuration('for a couple of months'), 60, 'a couple of months');
eq(parseDuration('since childhood'), 3650, 'since childhood is long-standing');
eq(parseDuration('cough for 4 weeks, fever for 2 days'), 28, 'the longest duration mentioned wins');
eq(parseDuration('my 6 year old'), null, 'an age is not a duration');
eq(parseDuration('no idea'), null, 'unstated stays unstated');

describe('Extraction — assertions and denials');
includes(extractSymptoms('I have a fever').symptoms, 'fever', 'a fever is recorded');
includes(extractSymptoms('no fever').denied, 'fever', 'a denied fever FILLS the slot rather than leaving it empty');
includes(extractSymptoms("it's dry").denied, 'sputum', '"it\'s dry" answers the phlegm question');
excludes(extractSymptoms('I have never smoked').context, 'smoker', '"never smoked" is not a smoking history');
includes(extractSymptoms('I have never smoked').contextDenied, 'smoker', '"never smoked" answers the smoking question');

describe('Extraction — the qualifiers that change management');
ok(extractSymptoms('breathless even when sitting still').atRest, 'at rest is extracted');
ok(extractSymptoms('breathless when I climb stairs').onExertion, 'on exertion is extracted');
ok(extractSymptoms('only when I run').exertionOnly, '"only when" is a boundary, and is kept');
eq(extractSymptoms('I get breathless after two floors').exertionFloors, 2, 'the effort threshold is kept');
eq(extractSymptoms('I smoke about 5 cigarettes a day').smokingPerDay, 5, 'quantified smoking');
eq(extractSymptoms('it came on suddenly').onset, 'sudden', 'sudden onset');
eq(extractSymptoms('very bad breathlessness').severity, 'severe', 'severity in their words');
ok(extractSymptoms("my inhaler isn't helping").medicationNotHelping, 'a reliever that has stopped working');
includes(extractSymptoms('dust sets it off').triggers, 'dust', 'triggers are named');
excludes(extractSymptoms('I smoke 10 a day').triggers, 'smoke', 'own smoking is a history, not a trigger');

describe('Extraction — family history is not the visitor');
const fam = extractSymptoms('my father had lung cancer');
eq(fam.familyHistory.length, 1, 'a relative’s diagnosis is recorded as family history');
excludes(fam.context, 'elderly', "a relative's diagnosis does not make the visitor elderly");
eq(fam.symptoms.length, 0, "a relative's illness is not the visitor's symptom");

describe('Triage bands');
eq(band(["I've been coughing", 'three weeks']), 'doctor', 'a three-week cough earns an appointment');
eq(band(['I have a cough', 'about four days']), 'routine', 'a four-day cough does not');
eq(band(['I am breathless even at rest']), 'urgent', 'breathlessness at rest is urgent');
eq(band(["my inhaler isn't helping and I can't breathe"]), 'urgent', 'a reliever that has stopped working is urgent');
eq(band(['I have asthma and I use my reliever twice a day']), 'doctor', 'daily reliever use is a review, not a same-day slot');
eq(band(["I've been coughing up blood"]), 'emergency', 'haemoptysis is an emergency');
eq(band(['I get breathless on stairs', 'it started two months ago']), 'doctor', 'exertional breathlessness over weeks earns an appointment');
eq(band(['I want to book a pulmonologist']), 'doctor', 'asking to be seen is honoured');
eq(band(['I have a cough']), 'insufficient', 'a symptom with no qualifiers is not a clean bill of health');
eq(band(["I'm worried because my father had lung cancer"]), 'routine', 'family history alone is a conversation, not a clinic');

describe('Retrieval');
const childhood = retrieve(normalise("I've had this since childhood"), []);
ok(!childhood.some((e) => e.id === 'ild'), '"childhood" does not match the entry id "ild" (whole words only)');
ok(retrieve(normalise('I wheeze at night'), ['wheeze']).length > 0, 'a wheeze retrieves something');

describe('Intents (§13)');
const intents = classifyIntents(mergeExtractions([extractSymptoms('I get breathless on stairs')]), null, 'i get breathless on stairs');
includes(intents, 'breathlessness', 'breathlessness is classified');
includes(intents, 'exercise_breathlessness', 'exertional breathlessness is its own intent');
eq(primaryConcern(['cough', 'smoking']), 'cough', 'the symptom, not the history, is what the conversation is about');
includes(classifyIntents(mergeExtractions([extractSymptoms('I want to book an appointment')]), null, ''), 'appointment_request', 'a booking request is an intent');

describe('The call-back request (§15)');
const actionsFor = (turns) => {
  const merged = mergeExtractions(turns.map(extractSymptoms));
  return triage(merged, detectRedFlags(turns[turns.length - 1]), null).actions;
};
const kinds = (turns) => actionsFor(turns).map((a) => a.kind);

includes(kinds(["I've been coughing", 'three weeks']), 'callback', 'a call back is offered when an appointment is advised');
eq(kinds(["I've been coughing", 'three weeks'])[0], 'callback', 'and offered first — it is the least work for someone unwell');
includes(kinds(['I am breathless even at rest']), 'callback', 'offered on the urgent band too');
excludes(kinds(['I have a cough']), 'callback', 'not offered before anything has been established');
excludes(kinds(['what is spirometry?']), 'callback', 'not offered to someone just reading');

const emergency = kinds(["I've been coughing up blood"]);
eq(emergency[0], 'emergency', 'in an emergency the ambulance is the FIRST action');
eq(emergency[emergency.length - 1], 'callback', 'and a call back is the last — never a substitute for going now');
ok(emergency.indexOf('emergency') < emergency.indexOf('callback'), 'ordering holds: 108 before any offer to ring back');

ok(callbackOffer({ urgency: 'doctor' }).indexOf('name and number') !== -1, 'the offer asks for a name and a number');
ok(callbackOffer({ urgency: 'doctor' }).indexOf('Nothing else') !== -1, 'and says what is NOT sent — asking for a number without saying where it goes is not a fair ask');

const offered = buildState([
  { role: 'user', content: "I've been coughing for three weeks" },
  { role: 'assistant', content: 'If it is easier, I can ask the Yashoda team to call you.' },
  { role: 'user', content: 'it is dry' }
]);
ok(offered.callbackOffered, 'the offer is remembered, so it is not repeated every turn');
ok(!buildState([{ role: 'user', content: 'I have a cough' }]).callbackOffered, 'and is not remembered before it was made');

describe('The safety gate');
const urgentDecision = { urgency: 'emergency', emergencyRecommended: true };
const routineDecision = { urgency: 'routine', emergencyRecommended: false };
ok(!validate('You have asthma.', routineDecision).ok, 'a stated diagnosis is rejected');
ok(!validate('You do not have COPD.', routineDecision).ok, 'ruling a condition out is rejected');
ok(!validate("There's nothing to worry about.", routineDecision).ok, 'false reassurance is rejected');
ok(!validate('As a doctor, I would say...', routineDecision).ok, 'claiming to be a clinician is rejected');
ok(!validate('You should take an antibiotic.', routineDecision).ok, 'prescribing is rejected');
ok(!validate('As an AI, I cannot help.', routineDecision).ok, 'AI disclosure language is rejected');
ok(!validate('Take it easy and rest up.', urgentDecision).ok, 'an emergency that is not conveyed is rejected');
ok(!validate('Call 108 immediately.', routineDecision).ok, 'over-escalation on a routine band is rejected');
ok(validate('Asthma can cause symptoms like this, but several things can. It is worth having a doctor listen to your chest.', routineDecision).ok, 'careful, non-diagnostic prose passes');
eq(present('**bold** and [a link](http://x.com)'), 'bold and a link', 'markdown and links are stripped from anything shown');

report('core');
