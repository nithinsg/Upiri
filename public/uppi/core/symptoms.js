/*
 * Symptom and detail extraction — the layer that turns free text into slots.
 *
 * Deliberately conservative: it never guesses at a condition, it only records
 * what the visitor actually said. What it records, though, is now everything
 * the conversation needs in order not to ask the same thing twice (§10, §12):
 * how long, how bad, how it started, what sets it off, at rest or on effort,
 * how much they smoke, what they already take, what runs in the family.
 *
 * Two rules run through the whole file:
 *
 *   1. A NEGATED symptom is not a missing symptom. "No fever" and "the cough is
 *      dry" answer questions — they fill their slot with a no, and the slot is
 *      never asked about again. Every match therefore goes through
 *      `matchPatterns`, which reports assertion and denial separately.
 *
 *   2. A qualifier a rule needs is extracted HERE, not inferred by the model
 *      later. "Only when I climb stairs" and "even sitting still" lead to
 *      different advice, and that difference must not depend on a model's mood.
 *
 * Runs in the browser and on the server from the same source.
 */

import { normalise, matchPatterns } from './redflags.js';

/* ---------------------------------------------------------------------------
   Duration
   --------------------------------------------------------------------------- */

const NUMBER_WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, couple: 2, few: 3, several: 4
};

const UNIT_DAYS = { day: 1, days: 1, week: 7, weeks: 7, month: 30, months: 30, year: 365, years: 365 };

/**
 * Finds how long something has been going on, in days. Returns null when the
 * message does not say — which is itself a useful signal, because "how long"
 * is the single most valuable follow-up question in respiratory triage.
 */
export function parseDuration(text) {
  const t = normalise(text);

  /* "since childhood", "for years", "all my life" — long-standing */
  if (/\b(?:since\s+(?:childhood|birth|school)|all\s+my\s+life|for\s+years|many\s+years|whole\s+life|as\s+long\s+as\s+i\s+can\s+remember)\b/.test(t)) return 3650;
  if (/\b(?:since\s+)?(?:this\s+)?(?:morning|today|tonight|just\s+now|right\s+now|an?\s+hour)\b/.test(t)) return 0.5;
  if (/\byesterday\b/.test(t)) return 1;
  if (/\blast\s+night\b/.test(t)) return 1;

  const re = /(?:for|since|about|around|over|more\s+than|nearly|almost|past|last)?\s*(\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|couple|few|several)\s*(?:of\s+)?(day|days|week|weeks|month|months|year|years)\b/g;
  let best = null;
  let m;
  while ((m = re.exec(t))) {
    const n = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : NUMBER_WORDS[m[1]];
    if (!n) continue;
    /* "6 year old" is an age, not a duration — and reading it as one turns a
       toddler's two-day cough into a six-year cough. */
    if (/^\s*(?:old|of\s+age)\b/.test(t.slice(m.index + m[0].length))) continue;
    const days = n * UNIT_DAYS[m[2]];
    /* the longest duration mentioned is the one that matters clinically —
       "cough for 4 weeks, fever for 2 days" is a 4-week cough */
    if (best === null || days > best) best = days;
  }
  return best;
}

/** How Uppi says a duration back, so an acknowledgement sounds like listening. */
export function durationPhrase(days) {
  if (days == null) return '';
  if (days >= 3650) return 'something you have had for years';
  if (days >= 365) return Math.round(days / 365) + (days < 730 ? ' year' : ' years');
  if (days >= 60) return Math.round(days / 30) + ' months';
  if (days >= 28) return Math.round(days / 30) + ' month';
  if (days >= 14) return Math.round(days / 7) + ' weeks';
  if (days >= 7) return Math.round(days / 7) === 1 ? 'a week' : Math.round(days / 7) + ' weeks';
  if (days <= 1) return 'a day or so';
  return Math.round(days) + ' days';
}

/* ---------------------------------------------------------------------------
   Symptom lexicon
   --------------------------------------------------------------------------- */

/*
 * `id` is what triage reasons about. `label` is what Uppi says back — always
 * plain language, never the clinical term, per §5 of the brief.
 */
export const SYMPTOMS = [
  { id: 'cough', label: 'cough', patterns: [/\bcough\w*/, /\bkhansi\b/] },
  { id: 'breathless', label: 'breathlessness', patterns: [/\bbreathless\b/, /\bbreathing\s+(?:trouble|problem|difficult\w*|issue)/, /\btrouble\s+breathing/, /\bdifficulty\s+breathing/, /\bhard\s+to\s+breathe/, /\bcan\s+not\s+catch\s+my\s+breath/, /\bout\s+of\s+breath/, /\bshort\s+of\s+breath/, /\bwinded\b/, /\bpuffed\b/] },
  { id: 'wheeze', label: 'wheeze', patterns: [/\bwheez\w*/, /\bwhistl\w*/, /\bchest\s+(?:sounds?|noise)/] },
  { id: 'tightness', label: 'chest tightness', patterns: [/\bchest\s+(?:tight\w*|heav\w*|congest\w*|discomfort)/, /\btight(?:ness)?\s+in\s+(?:my\s+)?chest/, /\bchest\s+feels\s+tight/, /\bband\s+around\s+my\s+chest/] },
  { id: 'sputum', label: 'phlegm', patterns: [/\bsputum\b/, /\bphlegm\b/, /\bmucus\b/, /\bproductive\s+cough/, /\bcough\w*\s+(?:with|up)\s+(?:phlegm|mucus|sputum)/, /\bbringing\s+up\b/, /\bwet\s+cough\b/] },
  { id: 'fever', label: 'fever', patterns: [/\bfever\w*/, /\btemperature\b/, /\bchills?\b/, /\bshiver\w*/, /\brigors?\b/, /\bbukhar\b/] },
  { id: 'weightloss', label: 'weight loss', patterns: [/\b(?:losing|lost|dropping|dropped)\s+(?:\w+\s+){0,3}weight\b/, /\bweight\s+loss\b/] },
  { id: 'hoarse', label: 'a hoarse voice', patterns: [/\bhoarse\w*/, /\bvoice\s+(?:has\s+)?(?:changed|gone|is\s+rough|is\s+not)/, /\blost\s+my\s+voice\b/] },
  { id: 'snoring', label: 'snoring', patterns: [/\bsnor\w*/, /\bsleep\s+apn(?:o?ea|ea)\b/, /\bstop\w*\s+breathing\s+(?:in\s+my\s+)?sleep/, /\bgasp\w*\s+(?:in|during)\s+sleep/] },
  { id: 'daysleepy', label: 'daytime sleepiness', patterns: [/\b(?:sleepy|drowsy|tired|exhaust\w*|fatigue\w*)\s+(?:\w+\s+){0,3}(?:during\s+the\s+day|in\s+the\s+day|daytime|at\s+work|all\s+day)/, /\bdaytime\s+sleepiness\b/, /\bfall\w*\s+asleep\s+(?:at|during|while)/] },
  { id: 'allergy', label: 'allergy symptoms', patterns: [/\ballerg\w*/, /\bsneez\w*/, /\brunny\s+nose\b/, /\bblocked\s+nose\b/, /\bstuffy\s+nose\b/, /\bhay\s+fever\b/, /\bitchy\s+(?:eyes|nose|throat)\b/, /\brhinitis\b/, /\bdust\s+allergy\b/] },
  { id: 'nightsym', label: 'symptoms at night', patterns: [/\b(?:at|during|in\s+the|every|each)\s+nights?\b/, /\bnight\s*time\b/, /\bnights\b/, /\bwake\s+(?:me\s+)?up\b/, /\bwaking\s+up\b/, /\bearly\s+morning\b/, /\b3\s*am\b/, /\bwhen\s+i\s+lie\s+down\b/, /\blying\s+down\b/] },
  { id: 'exercise', label: 'symptoms on exertion', patterns: [/\b(?:stairs?|climbing|walking|exercis\w*|exert\w*|running|gym|uphill|slope|floors?|flights?)\b/] },
  { id: 'chestpain', label: 'chest discomfort', patterns: [/\bchest\s+(?:pain|ache|sore)/, /\bpain\s+in\s+(?:my\s+)?chest/] }
];

/* Context the triage rules need but which are not symptoms. */
export const CONTEXT = [
  { id: 'smoker', patterns: [/\b(?:i\s+)?smoke\w*\b/, /\bcigarett\w*/, /\bbeedi\w*/, /\bbidi\w*/, /\btobacco\b/, /\bvap\w*/, /\bpack\s+years?\b/, /\bhookah\b/, /\bshisha\b/] },
  { id: 'exsmoker', patterns: [/\b(?:quit|stopped|gave\s+up|left)\s+(?:\w+\s+){0,2}(?:smoking|cigarett\w*|beedi\w*|tobacco)/, /\bex[\s-]?smoker\b/, /\bformer\s+smoker\b/, /\bused\s+to\s+smoke\b/] },
  { id: 'child', patterns: [/\bmy\s+(?:son|daughter|child|kid|baby|boy|girl|grandson|granddaughter)\b/, /\b(?:he|she)\s+is\s+\d{1,2}\s+(?:years?|months?)\s+old\b/, /\bmy\s+\d{1,2}\s+year\s+old\b/, /\btoddler\b/, /\binfant\b/, /\bpaediatric\b/, /\bpediatric\b/] },
  { id: 'elderly', patterns: [/\b(?:6\d|7\d|8\d|9\d)\s+years?\s+old\b/, /\bmy\s+(?:elderly\s+)?(?:father|mother|dad|mom|mum|grandfather|grandmother|papa|amma|nanna)\s+(?:is|has|keeps|gets|can\s+not|cannot|needs|feels)\b/] },
  { id: 'pregnant', patterns: [/\bpregnan\w*/, /\bexpecting\b/, /\b\d{1,2}\s+weeks?\s+pregnant\b/] },
  { id: 'knownAsthma', patterns: [/\b(?:my|have|has|diagnosed\s+with|known)\s+(?:\w+\s+){0,2}asthma\b/, /\basthmatic\b/, /\basthma\b/, /\bdamma\b/] },
  { id: 'knownCopd', patterns: [/\bcopd\b/, /\bemphysema\b/, /\bchronic\s+bronchitis\b/] },
  { id: 'knownIld', patterns: [/\bild\b/, /\bipf\b/, /\bpulmonary\s+fibrosis\b/, /\binterstitial\s+lung\b/, /\bfibrosis\b/] },
  { id: 'knownTb', patterns: [/\btb\b/, /\btuberculosis\b/] },
  { id: 'inhaler', patterns: [/\binhaler\b/, /\bpuffer\b/, /\bnebuli[sz]\w*/, /\bsalbutamol\b/, /\basthalin\b/, /\bforacort\b/, /\bseroflo\b/, /\bduolin\b/, /\btiova\b/, /\bbudesonide\b/, /\bformoterol\b/] },
  /* The reliever has stopped holding — an acute presentation, seen today. */
  { id: 'relieverOveruse', patterns: [/\b(?:inhaler|puffer|reliever|salbutamol|asthalin)\b[\s\S]{0,40}\b(?:not\s+(?:working|helping)|no\s+(?:relief|help)|every\s+few\s+hours|many\s+times|[4-9]\s+times|\d\d\s+times)\b/, /\b(?:using|need\w*|taking)\s+(?:my\s+)?(?:inhaler|reliever|puffer)\s+(?:\w+\s+){0,2}(?:more|often|daily|every\s+day)\b/] },
  /* Regular reliever use is poor control rather than an emergency: GINA puts
     the threshold at three times a week, and the answer is a review this week —
     not a same-day slot, which is what an over-escalated band would produce. */
  { id: 'relieverFrequent', patterns: [/\b(?:inhaler|puffer|reliever|salbutamol|asthalin)\b[\s\S]{0,40}\b(?:every\s+(?:day|night)|daily|twice|thrice|two\s+times|three\s+times|several\s+times)\b/, /\b(?:twice|thrice|\d+\s+times|every\s+day|daily)\b[\s\S]{0,30}\b(?:inhaler|puffer|reliever|salbutamol|asthalin)\b/] },
  { id: 'worsening', patterns: [/\b(?:getting|got|becoming|became|feels?)\s+(?:\w+\s+){0,2}worse\b/, /\bworsen\w*/, /\bnot\s+(?:improv\w*|better|getting\s+better|settling)\b/, /\bdeteriorat\w*/] },
  { id: 'wantsAppointment', patterns: [/\bbook\w*\s+(?:\w+\s+){0,3}(?:appointment|consult\w*|slot|visit|pulmonolog\w*|doctor|specialist|chest\s+physician)\b/, /\b(?:see|meet|consult|visit|talk\s+to|speak\s+to|want|need|get)\s+(?:\w+\s+){0,4}(?:doctor|pulmonolog\w*|specialist|physician)\b/, /\bappointment\b/, /\bopd\b/, /\bhow\s+do\s+i\s+book\b/] },
  { id: 'wantsEducation', patterns: [/\bwhat\s+is\b/, /\bwhat\s+are\b/, /\bexplain\b/, /\bhow\s+does\b/, /\bwhy\s+do(?:es)?\b/, /\btell\s+me\s+about\b/, /\bdifference\s+between\b/, /\bmean\w*\?/] },
  { id: 'pollution', patterns: [/\bpollution\b/, /\baqi\b/, /\bsmog\b/, /\bdust\b/, /\bconstruction\b/, /\btraffic\b/, /\bchulha\b/, /\bfirewood\b/, /\bstove\b/, /\bagarbatt\w*/, /\bincense\b/, /\bmosquito\s+coil\b/] },
  { id: 'noduleOrScan', patterns: [/\bnodule\b/, /\bspot\s+on\s+(?:my\s+)?lung\b/, /\bshadow\s+on\s+(?:my\s+)?(?:lung|chest)\b/, /\bx[\s-]?ray\b/, /\bct\s+scan\b/, /\bhrct\b/, /\bscan\s+(?:showed|found|report)\b/, /\bspirometry\b/, /\bpft\b/, /\blung\s+function\s+test\b/] },
  { id: 'scanResult', patterns: [/\bnodule\b/, /\bspot\s+on\s+(?:my\s+)?lung\b/, /\bshadow\s+on\s+(?:my\s+)?(?:lung|chest)\b/, /\b(?:scan|x[\s-]?ray|ct|hrct|report|spirometry|pft)\s+(?:\w+\s+){0,2}(?:showed|shows|found|says|said|reported|abnormal|is\s+abnormal)\b/, /\babnormal\s+(?:x[\s-]?ray|scan|ct|spirometry|pft|lung\s+function)\b/] },
  { id: 'recurrentInfections', patterns: [/\b(?:keep|keeps|always)\s+(?:getting|catching)\s+(?:\w+\s+){0,2}(?:infections?|chest\s+infections?|pneumonia|cold)/, /\b(?:third|fourth|fifth|several|many)\s+(?:time|infection|chest\s+infection|course\s+of\s+antibiotics)/, /\brecurrent\s+(?:infections?|pneumonia|chest)/, /\bantibiotics?\s+(?:again|third|multiple|several)\b/] }
];

/* ---------------------------------------------------------------------------
   Qualifiers: severity, onset, triggers, exposure
   --------------------------------------------------------------------------- */

const SEVERITY = [
  { id: 'severe', patterns: [/\bsevere\w*/, /\bvery\s+(?:bad|breathless|short\s+of\s+breath)/, /\breally\s+bad\b/, /\bterrible\b/, /\bawful\b/, /\bunbearable\b/, /\bworst\b/, /\bcan\s+hardly\b/, /\bstruggl\w*/, /\bdesperate\w*/] },
  { id: 'moderate', patterns: [/\bmoderate\w*/, /\bquite\s+bad\b/, /\bpretty\s+bad\b/, /\buncomfortable\b/, /\bbothering\s+me\b/, /\baffect\w*\s+(?:my\s+)?(?:work|daily|routine|sleep)/] },
  { id: 'mild', patterns: [/\bmild\w*/, /\bslight\w*/, /\bnot\s+(?:too|that)\s+bad\b/, /\bmanageable\b/, /\ba\s+(?:bit|little)\b/, /\bnothing\s+major\b/, /\bonly\s+(?:a\s+)?(?:bit|little)\b/] }
];

const ONSET = [
  { id: 'longstanding', patterns: [/\bsince\s+(?:childhood|birth|school)\b/, /\ball\s+my\s+life\b/, /\bfor\s+(?:many\s+)?years\b/, /\bas\s+long\s+as\s+i\s+can\s+remember\b/, /\balways\s+(?:had|been)\b/] },
  { id: 'sudden', patterns: [/\bsudden\w*/, /\ball\s+of\s+a\s+sudden\b/, /\bout\s+of\s+nowhere\b/, /\bcame\s+on\s+(?:quickly|fast)\b/, /\babruptly\b/, /\bovernight\b/, /\bwithin\s+(?:minutes|an?\s+hour)\b/] },
  { id: 'gradual', patterns: [/\bgradual\w*/, /\bslowly\b/, /\bover\s+(?:the\s+)?(?:past\s+)?(?:few\s+)?(?:months|weeks|years)\b/, /\bcreep\w*\s+up\b/, /\bbit\s+by\s+bit\b/, /\bbuilt\s+up\b/, /\bgetting\s+worse\s+over\b/] }
];

/*
 * Triggers matter twice over: they are the most useful thing a visitor can tell
 * a pulmonologist, and naming one back ("so dust sets it off") is the clearest
 * proof that Uppi was listening rather than running through a form.
 */
const TRIGGERS = [
  { id: 'dust', label: 'dust', patterns: [/\bdust\w*/, /\bcleaning\b/, /\bsweep\w*/, /\bmite\w*/] },
  { id: 'smoke', label: 'smoke', patterns: [/\b(?:around|near|from|in|breathing|passive|second\s*hand)\s+smoke\b/, /\bsmoky\b/, /\bincense\b/, /\bagarbatt\w*/, /\bchulha\b/, /\bfirewood\b/, /\bmosquito\s+coil\b/] },
  { id: 'cold', label: 'cold air', patterns: [/\bcold\s+(?:air|weather|water|wind)\b/, /\bwinter\b/, /\bac\b/, /\bair\s+condition\w*/] },
  { id: 'exercise', label: 'exercise', patterns: [/\bexercis\w*/, /\brunning\b/, /\bgym\b/, /\bsports?\b/, /\bplaying\b/, /\bwhen\s+i\s+run\b/] },
  { id: 'pollen', label: 'pollen and the change of season', patterns: [/\bpollen\b/, /\bseason\w*/, /\bflower\w*/, /\bgarden\w*/, /\bweather\s+chang\w*/] },
  { id: 'pets', label: 'animals', patterns: [/\bpet\w*/, /\bcat\w*/, /\bdog\w*/, /\bbird\w*/, /\banimal\w*/] },
  { id: 'lyingdown', label: 'lying down', patterns: [/\blying\s+down\b/, /\bwhen\s+i\s+lie\b/, /\bflat\s+in\s+bed\b/, /\bpillows?\b/] },
  { id: 'strongsmells', label: 'strong smells', patterns: [/\bperfume\b/, /\bstrong\s+smell\w*/, /\bpaint\b/, /\bchemical\w*/, /\bphenyl\b/, /\bcleaning\s+product\w*/] },
  { id: 'food', label: 'certain foods', patterns: [/\bfood\b/, /\beating\b/, /\bnuts?\b/, /\bcurd\b/, /\bbanana\b/, /\bcold\s+drinks?\b/] },
  { id: 'pollution', label: 'outdoor air', patterns: [/\bpollution\b/, /\baqi\b/, /\bsmog\b/, /\btraffic\b/, /\boutside\b/, /\bconstruction\b/] },
  { id: 'work', label: 'work', patterns: [/\bat\s+work\b/, /\bfactory\b/, /\bworkshop\b/, /\bsite\b/, /\bwelding\b/, /\bstone\b/, /\bmill\b/, /\bfarm\w*/] }
];

const FAMILY_MEMBER = /\b(?:my|his|her)\s+(father|mother|dad|mom|mum|papa|amma|nanna|brother|sister|uncle|aunt|grandfather|grandmother|cousin|son|daughter)\b/g;
const FAMILY_CONDITION = [
  { id: 'lung cancer', re: /\blung\s+cancer\b|\bcancer\b/ },
  { id: 'tuberculosis', re: /\btb\b|\btuberculosis\b/ },
  { id: 'asthma', re: /\basthma\b|\bdamma\b/ },
  { id: 'COPD', re: /\bcopd\b|\bemphysema\b/ },
  { id: 'a lung condition', re: /\blung\s+(?:disease|problem|condition)\b|\bfibrosis\b/ }
];

/* "my father had lung cancer" is a family history, not the visitor's own report
   and not a description of an elderly patient. Read in past tense, about a
   relative, naming a condition. */
function familyHistory(text) {
  const out = [];
  let m;
  FAMILY_MEMBER.lastIndex = 0;
  while ((m = FAMILY_MEMBER.exec(text))) {
    const window = text.slice(m.index, m.index + 90);
    if (!/\b(?:had|has|died|passed|diagnosed|suffered|was)\b/.test(window)) continue;
    const cond = FAMILY_CONDITION.find((c) => c.re.test(window));
    if (!cond) continue;
    if (!out.some((o) => o.who === m[1] && o.condition === cond.id)) out.push({ who: m[1], condition: cond.id });
  }
  return out;
}

/** "I smoke about 5 cigarettes a day", "20 a day", "15 pack years". */
function smokingDetail(text) {
  const perDay = /\b(\d{1,2})\s*(?:cigarettes?|cigs?|beedis?|bidis?|sticks?|smokes?)?\s*(?:a|per|each)\s+day\b/.exec(text)
    || /\bsmoke\s+(?:about\s+|around\s+)?(\d{1,2})\b/.exec(text);
  const packYears = /\b(\d{1,2})\s*pack\s*years?\b/.exec(text);
  return {
    perDay: perDay ? parseInt(perDay[1], 10) : null,
    packYears: packYears ? parseInt(packYears[1], 10) : null
  };
}

function ageYears(text) {
  const m = /\b(\d{1,2})\s*(?:year|yr)s?\s*old\b/.exec(text) || /\bi\s+am\s+(\d{2})\b/.exec(text);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n > 0 && n < 110 ? n : null;
}

function firstMatch(groups, text) {
  for (const g of groups) if (matchPatterns(text, g.patterns).hit) return g.id;
  return null;
}

/* ---------------------------------------------------------------------------
   Extraction
   --------------------------------------------------------------------------- */

/**
 * @param {string} raw a single message
 * @returns {object} everything this message establishes
 */
export function extractSymptoms(raw) {
  const text = normalise(raw);
  const symptoms = [];
  const labels = [];
  const denied = [];
  for (const s of SYMPTOMS) {
    const r = matchPatterns(text, s.patterns);
    if (r.hit) { symptoms.push(s.id); labels.push(s.label); }
    else if (r.denied) denied.push(s.id);
  }

  const context = [];
  const contextDenied = [];
  for (const c of CONTEXT) {
    const r = matchPatterns(text, c.patterns);
    if (r.hit) context.push(c.id);
    else if (r.denied) contextDenied.push(c.id);
  }

  /* "it's dry" is the answer to "dry, or bringing something up?" — it fills the
     phlegm slot with a no, and must never leave it looking unasked. */
  if (/\bdry\b/.test(text) && !symptoms.includes('sputum') && !denied.includes('sputum')) denied.push('sputum');

  const fam = familyHistory(text);
  /* A relative's diagnosis must not be read as "the patient is elderly" — that
     silently changes the triage of someone in their thirties. */
  if (fam.length) {
    const i = context.indexOf('elderly');
    if (i >= 0 && !/\b(?:my\s+(?:father|mother|dad|mom|mum|papa|amma|nanna)\s+(?:is|has|keeps|gets|needs|feels|can\s+not|cannot))\b/.test(text)) context.splice(i, 1);
  }
  /* "I have never smoked" is an answer, not a smoking history. */
  const neverSmoked = /\b(?:never|not?)\s+(?:ever\s+)?smok\w*/.test(text) || /\bnon[\s-]?smoker\b/.test(text);
  if (neverSmoked) {
    for (const id of ['smoker', 'exsmoker']) { const i = context.indexOf(id); if (i >= 0) context.splice(i, 1); }
    if (!contextDenied.includes('smoker')) contextDenied.push('smoker');
  }

  /* "at rest" vs "on exertion" is the qualifier that separates a reassuring
     story from an urgent one, so it is extracted explicitly rather than left
     to the model. */
  const atRest = /\b(?:at\s+rest|even\s+(?:when|while)\s+(?:i\s+am\s+)?(?:sitting|resting|lying|doing\s+nothing)|while\s+(?:sitting|resting|lying)|doing\s+nothing|sitting\s+still|without\s+(?:doing\s+anything|exert\w*))\b/.test(text);
  const onExertion = /\b(?:stairs?|climbing|walking|exercis\w*|exert\w*|running|uphill|floors?|flights?|when\s+i\s+(?:walk|move|climb|run)|after\s+(?:walking|climbing))\b/.test(text);
  /* "only when I run" is a boundary, and it is reassuring in a way that
     "whenever I move" is not. */
  const exertionOnly = onExertion && /\bonly\s+(?:when|if|on|after|during)\b/.test(text);
  const floors = /\b(\d{1,2}|one|two|three|four|five)\s*(?:floors?|flights?|storeys?|stories)\b/.exec(text);

  const triggers = [];
  const triggerLabels = [];
  for (const t of TRIGGERS) {
    if (matchPatterns(text, t.patterns).hit) { triggers.push(t.id); triggerLabels.push(t.label); }
  }

  const smoke = smokingDetail(text);
  const medicationNotHelping = /\b(?:inhaler|puffer|reliever|nebuli[sz]er|medicine|medication|tablets?|treatment)\b[\s\S]{0,50}\b(?:not\s+(?:helping|working)|no\s+(?:help|relief|effect)|stopped\s+working|not\s+as\s+(?:good|effective)|hardly\s+help\w*)\b/.test(text)
    || /\b(?:not\s+(?:helping|working)|no\s+relief)\b[\s\S]{0,30}\b(?:inhaler|puffer|reliever|medicine|medication)\b/.test(text);

  /* "twice a week", "three times a day" — a frequency was given, so the
     question that asks for one has been answered. */
  const frequencyGiven = /\b(?:inhaler|puffer|reliever|nebuli[sz]er|salbutamol|asthalin|medicine|medication|it)\b[\s\S]{0,40}\b(?:once|twice|thrice|\d{1,2}\s*times?|every\s+day|daily|rarely|never)\b/.test(text)
    || /\b(?:once|twice|thrice|\d{1,2}\s*times?)\s+(?:a|per|every)\s+(?:day|week|month)\b[\s\S]{0,40}\b(?:inhaler|puffer|reliever)\b/.test(text);

  const previousEpisodes = /\b(?:happened\s+before|had\s+this\s+before|every\s+(?:winter|year|season|month)|comes?\s+(?:and\s+goes|back)|keeps?\s+coming\s+back|recurr\w*|again\s+this\s+(?:year|winter)|same\s+as\s+last)\b/.test(text);

  return {
    symptoms,
    labels,
    denied,
    context,
    contextDenied,
    durationDays: parseDuration(raw),
    atRest,
    onExertion,
    exertionOnly,
    exertionFloors: floors ? (NUMBER_WORDS[floors[1]] || parseInt(floors[1], 10) || null) : null,
    severity: firstMatch(SEVERITY, text),
    onset: firstMatch(ONSET, text),
    triggers,
    triggerLabels,
    smokingPerDay: smoke.perDay,
    packYears: smoke.packYears,
    familyHistory: fam,
    medicationNotHelping,
    frequencyGiven,
    previousEpisodes,
    ageYears: ageYears(text),
    wordCount: text ? text.split(' ').filter(Boolean).length : 0
  };
}

/*
 * Folds the per-message extractions of a whole conversation into one view, so a
 * visitor who says "cough" in one turn and "three weeks" in the next is triaged
 * on both (§12). Lists union; scalars take the first firm answer and then the
 * most recent revision, because "actually it's getting worse" is an update, not
 * a contradiction to be averaged away.
 */
export function mergeExtractions(list) {
  const merged = {
    symptoms: [], labels: [], denied: [], context: [], contextDenied: [],
    durationDays: null, atRest: false, onExertion: false, exertionOnly: false, exertionFloors: null,
    severity: null, onset: null, triggers: [], triggerLabels: [],
    smokingPerDay: null, packYears: null, familyHistory: [],
    medicationNotHelping: false, frequencyGiven: false, previousEpisodes: false, ageYears: null,
    turns: list.length
  };
  const union = (into, from) => { for (const v of from || []) if (!into.includes(v)) into.push(v); };

  for (const e of list) {
    for (let i = 0; i < e.symptoms.length; i++) {
      if (!merged.symptoms.includes(e.symptoms[i])) { merged.symptoms.push(e.symptoms[i]); merged.labels.push(e.labels[i]); }
    }
    union(merged.denied, e.denied);
    union(merged.context, e.context);
    union(merged.contextDenied, e.contextDenied);
    for (let i = 0; i < (e.triggers || []).length; i++) {
      if (!merged.triggers.includes(e.triggers[i])) { merged.triggers.push(e.triggers[i]); merged.triggerLabels.push(e.triggerLabels[i]); }
    }
    for (const f of e.familyHistory || []) {
      if (!merged.familyHistory.some((o) => o.who === f.who && o.condition === f.condition)) merged.familyHistory.push(f);
    }
    if (e.durationDays != null && (merged.durationDays == null || e.durationDays > merged.durationDays)) merged.durationDays = e.durationDays;
    if (e.atRest) merged.atRest = true;
    if (e.onExertion) merged.onExertion = true;
    if (e.exertionOnly) merged.exertionOnly = true;
    if (e.exertionFloors != null) merged.exertionFloors = e.exertionFloors;
    if (e.severity) merged.severity = e.severity;
    if (e.onset) merged.onset = e.onset;
    if (e.smokingPerDay != null) merged.smokingPerDay = e.smokingPerDay;
    if (e.packYears != null) merged.packYears = e.packYears;
    if (e.medicationNotHelping) merged.medicationNotHelping = true;
    if (e.frequencyGiven) merged.frequencyGiven = true;
    if (e.previousEpisodes) merged.previousEpisodes = true;
    if (e.ageYears != null) merged.ageYears = e.ageYears;
  }

  /* A symptom that was denied later is not being carried forward as present —
     but an assertion always beats a denial, whichever order they arrived in. */
  merged.denied = merged.denied.filter((d) => !merged.symptoms.includes(d));
  merged.contextDenied = merged.contextDenied.filter((d) => !merged.context.includes(d));

  /* Quantified smoking IS a smoking history, however it was phrased. */
  if ((merged.smokingPerDay || merged.packYears) && !merged.context.includes('smoker') && !merged.context.includes('exsmoker')) merged.context.push('smoker');
  if (merged.medicationNotHelping && merged.context.includes('inhaler') && !merged.context.includes('relieverOveruse')) merged.context.push('relieverOveruse');

  return merged;
}
