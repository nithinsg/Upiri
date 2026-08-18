/*
 * Symptom extraction.
 *
 * Turns a free-text message into a structured set of observations the triage
 * rules can reason about. Deliberately conservative: this layer never guesses
 * at a condition, it only records what the visitor actually said, plus the two
 * qualifiers that change respiratory management most — how long a cough has
 * lasted, and whether breathlessness happens on exertion or at rest.
 *
 * Runs in the browser and on the server from the same source.
 */

import { normalise } from './redflags.js';

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
  if (/\b(?:since\s+(?:childhood|birth|school)|all\s+my\s+life|for\s+years|many\s+years|whole\s+life)\b/.test(t)) return 3650;
  if (/\b(?:since\s+)?(?:this\s+)?(?:morning|today|tonight|just\s+now|right\s+now|an?\s+hour)\b/.test(t)) return 0.5;
  if (/\byesterday\b/.test(t)) return 1;
  if (/\blast\s+night\b/.test(t)) return 1;

  const re = /(?:for|since|about|around|over|more\s+than|nearly|almost|past|last)?\s*(\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|couple|few|several)\s*(?:of\s+)?(day|days|week|weeks|month|months|year|years)\b/g;
  let best = null;
  let m;
  while ((m = re.exec(t))) {
    const n = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : NUMBER_WORDS[m[1]];
    if (!n) continue;
    const days = n * UNIT_DAYS[m[2]];
    /* the longest duration mentioned is the one that matters clinically —
       "cough for 4 weeks, fever for 2 days" is a 4-week cough */
    if (best === null || days > best) best = days;
  }
  return best;
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
  { id: 'breathless', label: 'breathlessness', patterns: [/\bbreathless\b/, /\bbreathing\s+(?:trouble|problem|difficult\w*|issue)/, /\btrouble\s+breathing/, /\bdifficulty\s+breathing/, /\bhard\s+to\s+breathe/, /\bwinded\b/, /\bpuffed\b/] },
  { id: 'wheeze', label: 'wheeze', patterns: [/\bwheez\w*/, /\bwhistl\w*/, /\bchest\s+(?:sounds?|noise)/] },
  { id: 'tightness', label: 'chest tightness', patterns: [/\bchest\s+(?:tight\w*|heav\w*|congest\w*|discomfort)/, /\btight(?:ness)?\s+in\s+(?:my\s+)?chest/, /\bband\s+around\s+my\s+chest/] },
  { id: 'sputum', label: 'phlegm', patterns: [/\bsputum\b/, /\bphlegm\b/, /\bmucus\b/, /\bproductive\s+cough/, /\bcough\w*\s+(?:with|up)\s+(?:phlegm|mucus|sputum)/] },
  { id: 'fever', label: 'fever', patterns: [/\bfever\w*/, /\btemperature\b/, /\bchills?\b/, /\bshiver\w*/, /\brigors?\b/, /\bbukhar\b/] },
  { id: 'weightloss', label: 'weight loss', patterns: [/\b(?:losing|lost|dropping|dropped)\s+(?:\w+\s+){0,3}weight\b/, /\bweight\s+loss\b/] },
  { id: 'hoarse', label: 'a hoarse voice', patterns: [/\bhoarse\w*/, /\bvoice\s+(?:has\s+)?(?:changed|gone|is\s+rough|is\s+not)/, /\blost\s+my\s+voice\b/] },
  { id: 'snoring', label: 'snoring', patterns: [/\bsnor\w*/, /\bsleep\s+apn(?:o?ea|ea)\b/, /\bstop\w*\s+breathing\s+(?:in\s+my\s+)?sleep/, /\bgasp\w*\s+(?:in|during)\s+sleep/] },
  { id: 'daysleepy', label: 'daytime sleepiness', patterns: [/\b(?:sleepy|drowsy|tired|exhaust\w*|fatigue\w*)\s+(?:\w+\s+){0,3}(?:during\s+the\s+day|in\s+the\s+day|daytime|at\s+work|all\s+day)/, /\bdaytime\s+sleepiness\b/, /\bfall\w*\s+asleep\s+(?:at|during|while)/] },
  { id: 'allergy', label: 'allergy symptoms', patterns: [/\ballerg\w*/, /\bsneez\w*/, /\brunny\s+nose\b/, /\bblocked\s+nose\b/, /\bstuffy\s+nose\b/, /\bhay\s+fever\b/, /\bitchy\s+(?:eyes|nose|throat)\b/, /\brhinitis\b/, /\bdust\s+allergy\b/] },
  { id: 'nightsym', label: 'symptoms at night', patterns: [/\b(?:at|during|in\s+the)\s+night\b/, /\bnight\s*time\b/, /\bwake\s+(?:me\s+)?up\b/, /\bwaking\s+up\b/, /\bearly\s+morning\b/, /\b3\s*am\b/] },
  { id: 'exercise', label: 'symptoms on exertion', patterns: [/\b(?:stairs?|climbing|walking|exercis\w*|exert\w*|running|gym|uphill|slope)\b/] },
  { id: 'chestpain', label: 'chest discomfort', patterns: [/\bchest\s+(?:pain|ache|discomfort|sore)/, /\bpain\s+in\s+(?:my\s+)?chest/] }
];

/* Context the triage rules need but which are not symptoms. */
export const CONTEXT = [
  { id: 'smoker', patterns: [/\b(?:i\s+)?smoke\w*\b/, /\bcigarett\w*/, /\bbeedi\w*/, /\bbidi\w*/, /\btobacco\b/, /\bvap\w*/, /\bpack\s+years?\b/, /\bhookah\b/, /\bshisha\b/] },
  { id: 'exsmoker', patterns: [/\b(?:quit|stopped|gave\s+up|left)\s+(?:\w+\s+){0,2}(?:smoking|cigarett\w*|beedi\w*|tobacco)/, /\bex[\s-]?smoker\b/, /\bformer\s+smoker\b/, /\bused\s+to\s+smoke\b/] },
  { id: 'child', patterns: [/\bmy\s+(?:son|daughter|child|kid|baby|boy|girl|grandson|granddaughter)\b/, /\b(?:he|she)\s+is\s+\d{1,2}\s+(?:years?|months?)\s+old\b/, /\bmy\s+\d{1,2}\s+year\s+old\b/, /\btoddler\b/, /\binfant\b/, /\bpaediatric\b/, /\bpediatric\b/] },
  { id: 'elderly', patterns: [/\bmy\s+(?:father|mother|dad|mom|mum|grandfather|grandmother|papa|amma|nanna)\b/, /\b(?:6\d|7\d|8\d|9\d)\s+years?\s+old\b/] },
  { id: 'pregnant', patterns: [/\bpregnan\w*/, /\bexpecting\b/, /\b\d{1,2}\s+weeks?\s+pregnant\b/] },
  { id: 'knownAsthma', patterns: [/\b(?:my|have|has|diagnosed\s+with|known)\s+(?:\w+\s+){0,2}asthma\b/, /\basthmatic\b/, /\basthma\b/] },
  { id: 'knownCopd', patterns: [/\bcopd\b/, /\bemphysema\b/, /\bchronic\s+bronchitis\b/] },
  { id: 'knownIld', patterns: [/\bild\b/, /\bipf\b/, /\bpulmonary\s+fibrosis\b/, /\binterstitial\s+lung\b/, /\bfibrosis\b/] },
  { id: 'knownTb', patterns: [/\btb\b/, /\btuberculosis\b/] },
  { id: 'inhaler', patterns: [/\binhaler\b/, /\bpuffer\b/, /\bnebuli[sz]\w*/, /\bsalbutamol\b/, /\basthalin\b/, /\bforacort\b/, /\bseroflo\b/, /\bduolin\b/, /\btiova\b/, /\bbudesonide\b/, /\bformoterol\b/] },
  { id: 'relieverOveruse', patterns: [/\b(?:inhaler|puffer|reliever|salbutamol|asthalin)\b[\s\S]{0,40}\b(?:not\s+(?:working|helping)|no\s+(?:relief|help)|every\s+(?:day|few\s+hours)|many\s+times|several\s+times|\d+\s+times\s+a\s+day)\b/, /\b(?:using|need\w*|taking)\s+(?:my\s+)?(?:inhaler|reliever|puffer)\s+(?:\w+\s+){0,2}(?:more|often|daily|every\s+day)\b/] },
  { id: 'worsening', patterns: [/\b(?:getting|got|becoming|became|feels?)\s+(?:\w+\s+){0,2}worse\b/, /\bworsen\w*/, /\bnot\s+(?:improv\w*|better|getting\s+better|settling)\b/, /\bdeteriorat\w*/] },
  { id: 'wantsAppointment', patterns: [/\bbook\w*\s+(?:an?\s+)?(?:appointment|consult\w*|slot|visit)\b/, /\b(?:see|meet|consult|talk\s+to)\s+(?:a\s+)?(?:doctor|pulmonolog\w*|specialist|physician)\b/, /\bappointment\b/, /\bopd\b/] },
  { id: 'wantsEducation', patterns: [/\bwhat\s+is\b/, /\bwhat\s+are\b/, /\bexplain\b/, /\bhow\s+does\b/, /\bwhy\s+do(?:es)?\b/, /\btell\s+me\s+about\b/, /\bdifference\s+between\b/, /\bmean\w*\?/] },
  { id: 'pollution', patterns: [/\bpollution\b/, /\baqi\b/, /\bsmog\b/, /\bdust\b/, /\bconstruction\b/, /\btraffic\b/, /\bchulha\b/, /\bfirewood\b/, /\bstove\b/, /\bagarbatt\w*/, /\bincense\b/, /\bmosquito\s+coil\b/] }
];

function anyMatch(text, patterns) {
  return patterns.some((p) => p.test(text));
}

/* ---------------------------------------------------------------------------
   Extraction
   --------------------------------------------------------------------------- */

/**
 * @param {string} raw a single message
 * @returns {{symptoms:string[], labels:string[], context:string[], durationDays:number|null, atRest:boolean, onExertion:boolean, wordCount:number}}
 */
export function extractSymptoms(raw) {
  const text = normalise(raw);
  const symptoms = [];
  const labels = [];
  for (const s of SYMPTOMS) {
    if (anyMatch(text, s.patterns)) { symptoms.push(s.id); labels.push(s.label); }
  }
  const context = CONTEXT.filter((c) => anyMatch(text, c.patterns)).map((c) => c.id);

  /* "at rest" vs "on exertion" is the qualifier that separates a reassuring
     story from an urgent one, so it is extracted explicitly rather than left
     to the model. */
  const atRest = /\b(?:at\s+rest|even\s+(?:when|while)\s+(?:i\s+am\s+)?(?:sitting|resting|lying|doing\s+nothing)|while\s+(?:sitting|resting|lying)|doing\s+nothing|without\s+(?:doing\s+anything|exert\w*))\b/.test(text);
  const onExertion = /\b(?:stairs?|climbing|walking|exercis\w*|exert\w*|running|uphill|when\s+i\s+(?:walk|move|climb)|after\s+(?:walking|climbing))\b/.test(text);

  return {
    symptoms,
    labels,
    context,
    durationDays: parseDuration(raw),
    atRest,
    onExertion,
    wordCount: text ? text.split(' ').filter(Boolean).length : 0
  };
}

/**
 * Folds the per-message extractions of a whole conversation into one view, so
 * a visitor who says "cough" in one turn and "three weeks" in the next is
 * triaged on both. Later turns win on the qualifiers.
 */
export function mergeExtractions(list) {
  const merged = { symptoms: [], labels: [], context: [], durationDays: null, atRest: false, onExertion: false, turns: list.length };
  for (const e of list) {
    for (let i = 0; i < e.symptoms.length; i++) {
      if (!merged.symptoms.includes(e.symptoms[i])) { merged.symptoms.push(e.symptoms[i]); merged.labels.push(e.labels[i]); }
    }
    for (const c of e.context) if (!merged.context.includes(c)) merged.context.push(c);
    if (e.durationDays != null && (merged.durationDays == null || e.durationDays > merged.durationDays)) merged.durationDays = e.durationDays;
    if (e.atRest) merged.atRest = true;
    if (e.onExertion) merged.onExertion = true;
  }
  return merged;
}
