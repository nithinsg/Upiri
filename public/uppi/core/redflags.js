/*
 * Red-flag safety layer.
 *
 * This runs BEFORE anything else in the pipeline, in the browser and again on
 * the server, and it is deterministic: plain pattern matching over normalised
 * text, no model in the path. A language model is a bad place to put the
 * decision "is this an emergency" — it is non-deterministic, it can be talked
 * out of a conclusion, and it cannot be tested. Rules can be tested, and they
 * fire in under a millisecond, so an emergency never waits for a network
 * round-trip.
 *
 * The rules are written to over-trigger rather than under-trigger. Sending
 * someone to an emergency department who did not strictly need to go is a cost;
 * missing massive haemoptysis is not a cost, it is a catastrophe. Every rule
 * below is a symptom that respiratory guidance treats as same-hour.
 *
 * Two things stop the obvious false positives:
 *   - negation ("no chest pain", "I don't cough up blood")
 *   - the hypothetical frame ("what should I do if I cough blood?")
 * Both are checked against the window of words immediately around the match,
 * not the whole message, so "I have blood in my sputum but no fever" still
 * fires.
 */

/* ---------------------------------------------------------------------------
   Normalisation
   --------------------------------------------------------------------------- */

const CONTRACTIONS = [
  [/\bcan['’]?t\b/g, 'can not'],
  [/\bwon['’]?t\b/g, 'will not'],
  [/\bdon['’]?t\b/g, 'do not'],
  [/\bdoesn['’]?t\b/g, 'does not'],
  [/\bdidn['’]?t\b/g, 'did not'],
  [/\bisn['’]?t\b/g, 'is not'],
  [/\baren['’]?t\b/g, 'are not'],
  [/\bwasn['’]?t\b/g, 'was not'],
  [/\bhaven['’]?t\b/g, 'have not'],
  [/\bhasn['’]?t\b/g, 'has not'],
  [/\bhadn['’]?t\b/g, 'had not'],
  [/\bcouldn['’]?t\b/g, 'could not'],
  [/\bshouldn['’]?t\b/g, 'should not'],
  [/\bwouldn['’]?t\b/g, 'would not'],
  [/\bi['’]?m\b/g, 'i am'],
  [/\bi['’]?ve\b/g, 'i have'],
  [/\bit['’]?s\b/g, 'it is'],
  [/\bthat['’]?s\b/g, 'that is'],
  [/\bhe['’]?s\b/g, 'he is'],
  [/\bshe['’]?s\b/g, 'she is'],
  [/\bthey['’]?re\b/g, 'they are'],
  [/\bcud\b/g, 'could'],
  [/\bpls\b/g, 'please']
];

/* Words visitors in Hyderabad actually type, mapped onto the clinical term the
   rules are written against. Keeping this list here rather than in the model
   prompt means the safety layer understands them too. */
const COLLOQUIAL = [
  [/\bsaans\b/g, 'breath'],
  [/\bsans\b/g, 'breath'],
  [/\bdum\s*ghut\w*/g, 'cannot breathe'],
  [/\bghabra\w*/g, 'breathless'],
  [/\bhaanf\w*/g, 'breathless'],
  [/\bdamma\b/g, 'asthma'],
  [/\bukka\b/g, 'asthma'],
  [/\bdaggu\b/g, 'cough'],
  [/\bkaphamu?\b/g, 'sputum'],
  [/\bkapham\b/g, 'sputum'],
  [/\bayasam\b/g, 'breathless'],
  [/\bchaati\b/g, 'chest'],
  [/\bseene?\b/g, 'chest'],
  [/\bkhoon\b/g, 'blood'],
  [/\bkhansi\b/g, 'cough'],
  [/\bbalgam\b/g, 'sputum'],
  [/\bsheeti\b/g, 'wheeze'],
  [/\bwhistl\w*\s+(?:sound|noise)\b/g, 'wheeze'],
  [/\bbreathlessness\b/g, 'breathless'],
  [/\bshort(?:ness)?\s+of\s+breath\b/g, 'breathless'],
  [/\bsob\b/g, 'breathless'],
  [/\bout\s+of\s+breath\b/g, 'breathless'],
  [/\bgasping\b/g, 'breathless'],
  [/\bhemoptysis\b/g, 'coughing blood'],
  [/\bhaemoptysis\b/g, 'coughing blood'],
  [/\bcyanosis\b/g, 'blue lips'],
  [/\bcyanosed\b/g, 'blue lips'],
  [/\bsyncope\b/g, 'fainting'],
  [/\banaphylaxis\b/g, 'severe allergic reaction']
];

/**
 * Lowercases, expands contractions, folds colloquial vocabulary onto clinical
 * terms and reduces punctuation to clause markers the negation scanner can see.
 * Returns both the normalised string and the clause-boundary positions.
 */
export function normalise(raw) {
  let t = String(raw == null ? '' : raw).toLowerCase();
  t = t.replace(/[‘’]/g, "'");
  for (const [re, to] of CONTRACTIONS) t = t.replace(re, to);
  /* punctuation that ends a thought becomes a marker the negation window will
     not read across; everything else becomes a space */
  t = t.replace(/[.!?;:,]/g, ' | ');
  t = t.replace(/[^a-z0-9|%\s'-]/g, ' ');
  for (const [re, to] of COLLOQUIAL) t = t.replace(re, to);
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

/* ---------------------------------------------------------------------------
   Negation and hypothetical framing
   --------------------------------------------------------------------------- */

const NEGATORS = /\b(?:no|not|never|none|without|denies|deny|free\s+of|nothing|neither|nor)\b/;
const CLAUSE = /\|| but | however | although | though | except /;

/* "what if I cough blood", "should I worry if", "can asthma cause" — the visitor
   is asking about a symptom, not reporting one. */
const HYPOTHETICAL = [
  /\bwhat\s+(?:if|happens\s+if|should\s+i\s+do\s+if|to\s+do\s+if)\b/,
  /\bif\s+(?:i|someone|a\s+person|my\s+\w+)\s+(?:ever|were|was|start\w*|had|has|get\w*)\b/,
  /\b(?:should|would|could|do)\s+i\s+(?:worry|be\s+worried|need|go|call|panic)\b/,
  /\b(?:can|does|do|is|are|could|would|will)\s+\w+\s+(?:cause|lead|mean|result|make)\b/,
  /\bwhat\s+(?:does|do|is|are)\b.*\bmean\b/,
  /\b(?:tell|teach|explain|educate)\s+me\s+(?:about|what)\b/,
  /\bwhen\s+should\s+(?:i|one|someone|a\s+person)\b/,
  /\bwhat\s+are\s+the\s+(?:signs|symptoms|warning)\b/,
  /\bis\s+it\s+(?:normal|serious|dangerous|an\s+emergency)\s+(?:to|if|when)\b/,
  /\b(?:is|are|does)\b[\s\S]{0,40}\b(?:serious|dangerous|normal|an\s+emergency|life\s+threatening|worrying)\b/,
  /\bhow\s+(?:serious|dangerous|bad|urgent|worried)\b/,
  /\bwhy\s+(?:do|does|would|might|can)\b/
];

/* A hypothetical frame is only believed when the visitor is not ALSO reporting
   their own present state. "What should I do if I cough blood — it started this
   morning" is a report, not a question. */
const SELF_REPORT = /\b(?:i\s+am|i\s+have|i\s+had|my\s+\w+\s+(?:is|are|has|have)|right\s+now|since\s+(?:this|yesterday|last)|started\s+(?:this|yesterday|last)|currently|at\s+the\s+moment|today)\b/;

export function isHypothetical(text) {
  if (SELF_REPORT.test(text)) return false;
  return HYPOTHETICAL.some((re) => re.test(text));
}

/* Looks back from the match for a negator, stopping at a clause boundary so a
   negation in a previous clause cannot cancel this one. */
export function isNegated(text, index) {
  const before = text.slice(Math.max(0, index - 60), index);
  const clause = before.split(CLAUSE).pop();
  return NEGATORS.test(clause);
}

/**
 * Tests a list of patterns against already-normalised text and reports both
 * outcomes separately: what was asserted, and what was explicitly denied.
 *
 * The denial half matters as much as the assertion. "Is the cough dry, or does
 * anything come up with it?" answered with "it's dry" has ANSWERED the question
 * — and a companion that asks it again two turns later is the single most
 * irritating thing a symptom checker does. So a negated match fills the slot
 * rather than leaving it empty.
 *
 * @param {string} text normalised text
 * @param {RegExp[]} patterns
 * @returns {{hit:boolean, denied:boolean}}
 */
export function matchPatterns(text, patterns) {
  let denied = false;
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags.replace('g', ''));
    const m = re.exec(text);
    if (!m) continue;
    if (isNegated(text, m.index)) { denied = true; continue; }
    return { hit: true, denied: false };
  }
  return { hit: false, denied };
}

/* ---------------------------------------------------------------------------
   The rules
   --------------------------------------------------------------------------- */

/*
 * `G` is the filler allowed between the words of a pattern — up to N words that
 * are not negations. Written this way because a plain `\w+\s+` gap silently
 * swallows the negation it was meant to respect: "cough but no blood" matches
 * "cough … blood" with "but no" sitting invisibly in the middle, and the
 * look-behind scanner never sees it because it only reads to the left of the
 * match. Excluding negators from the gap itself is the fix.
 */
const G = '(?:(?!\\b(?:no|not|never|nor|without|neither|any)\\b)[\\w-]+\\s+)';

/** Builds a rule pattern from a source string in which `~N` stands for a filler
 *  gap of up to N non-negating words: `'cough\\s+~3blood'` matches "coughing up
 *  bright red blood" but not "cough but no blood". Keeps the rules readable. */
function rx(source) {
  return new RegExp(source.replace(/~(\d)/g, (_, n) => G + '{0,' + n + '}'), '');
}

/*
 * Each rule is one clinically urgent presentation. `why` is written in the
 * second person because it is shown to the visitor verbatim — the urgent state
 * has to say what Uppi noticed, not just that something is wrong.
 */
export const RED_FLAGS = [
  {
    id: 'cannot-speak',
    label: 'too breathless to speak in full sentences',
    why: 'being too breathless to finish a sentence',
    patterns: [
      rx('\\b(?:can\\s?not|cannot|unable\\s+to|struggling\\s+to|hard\\s+to|difficult\\s+to)\\s+~2(?:speak|talk|finish\\s+a\\s+sentence|say\\s+a\\s+sentence)\\b'),
      rx('\\b(?:speak|talk)\\w*\\s+(?:in\\s+)?(?:only\\s+)?(?:single\\s+)?words?\\b'),
      rx('\\bcan\\s+not\\s+(?:complete|finish)\\s+(?:a\\s+)?sentence'),
      rx('\\b(?:breathless|breath)\\w*\\s+~3(?:can\\s?not|cannot)\\s+(?:speak|talk)\\b')
    ]
  },
  {
    id: 'blue-lips',
    label: 'blue or grey lips, face or fingertips',
    why: 'a colour change in your lips or face',
    patterns: [
      rx('\\b(?:blue|bluish|grey|gray|greyish|grayish|purple|dusky)\\s+~2(?:lips?|face|tongue|finger(?:tips?|nails?)?|nails?|skin)\\b'),
      rx('\\b(?:lips?|face|finger(?:tips?|nails?)?|nails?)\\s+(?:has|have|are|is|turning|turned|going|went|look\\w*)\\s+~2(?:blue|bluish|grey|gray|purple|dusky)\\b')
    ]
  },
  {
    id: 'severe-breathless',
    label: 'severe or rapidly worsening breathlessness',
    why: 'breathlessness that is severe or getting worse quickly',
    /* Breathlessness *at rest* alone is not sent here. It is serious, but it is
       also how someone with long-standing fibrosis describes an ordinary
       Tuesday, and an ambulance is the wrong answer to that. The triage rules
       put plain at-rest breathlessness in the 24-hour band; this rule wants a
       severity or a rate of change alongside it, which is the brief's own
       wording — "severe or rapidly worsening". */
    patterns: [
      rx('\\b(?:can\\s?not|cannot|unable\\s+to)\\s+breathe?\\b'),
      rx('\\bnot\\s+able\\s+to\\s+breathe?\\b'),
      rx('\\b(?:severe|severely|extreme|extremely|terrible|terribly|really\\s+bad|very\\s+bad|worst)\\s+~2breathless\\b'),
      rx('\\bbreathless\\w*\\s+~2(?:at\\s+rest|even\\s+at\\s+rest|while\\s+(?:sitting|resting|lying))\\b(?=[\\s\\S]{0,70}\\b(?:worse|worsening|sudden\\w*|rapid\\w*|severe|scared|frightening)\\b)'),
      rx('\\b(?:suddenly|sudden|rapidly|rapid|quickly)\\s+~3(?:breathless|can\\s?not\\s+breathe)\\b'),
      rx('\\bbreathless\\w*\\s+~3(?:getting|got|becoming|became)\\s+(?:much\\s+)?worse\\s+~2(?:fast|quickly|rapidly|by\\s+the\\s+(?:hour|minute)|today|since\\s+(?:this\\s+)?morning)\\b'),
      rx('\\bfighting\\s+for\\s+(?:my\\s+|his\\s+|her\\s+|their\\s+)?breath\\b'),
      rx('\\bsuffocat\\w*')
    ]
  },
  {
    id: 'chest-pain',
    label: 'severe chest pain or pressure',
    why: 'severe pain or pressure in your chest',
    patterns: [
      /* "tightness" is deliberately absent: a tight chest is how most people
         describe an asthma flare, and routing every one of those to casualty
         would make the urgent state meaningless. "Pressure" stays — it is
         rarely used for airway tightness and often used for cardiac pain. */
      rx('\\b(?:severe|severely|crushing|crushed|heavy|heaviness|pressure|squeezing|elephant|unbearable|terrible|worst)\\s+~3chest\\b(?:\\s+(?:pain|discomfort|pressure))?'),
      rx('\\bchest\\s+(?:pain|discomfort|pressure|tightness|heaviness)\\s+~3(?:severe|crushing|unbearable|radiat\\w*|spreading|going)\\s'),
      rx('\\bchest\\s+pain\\s+~3(?:left\\s+)?(?:arm|jaw|shoulder|back)\\b'),
      rx('\\b(?:heart\\s+attack|cardiac\\s+arrest)\\b'),
      rx('\\belephant\\s+(?:sitting|on)\\b')
    ]
  },
  {
    id: 'fainting',
    label: 'fainting or nearly fainting',
    why: 'fainting, or nearly fainting',
    patterns: [
      rx('\\b(?:fainted|fainting|faint|blacked\\s+out|black\\s+out|passed\\s+out|pass\\s+out|collapsed|collapse)\\b'),
      rx('\\b(?:nearly|almost|about\\s+to)\\s+(?:faint\\w*|black\\s+out|pass\\s+out|collapse)\\b'),
      rx('\\blost\\s+consciousness\\b')
    ]
  },
  {
    id: 'confusion',
    label: 'new confusion or drowsiness',
    why: 'new confusion or unusual drowsiness',
    patterns: [
      rx('\\b(?:severe|sudden|new|suddenly|very)\\s+~2(?:confus\\w*|disorient\\w*|drows\\w*|unrespons\\w*)\\b'),
      rx('\\b(?:confus\\w*|disorient\\w*|talking\\s+nonsense|unrespons\\w*)\\s+~3(?:suddenly|since|today|now)\\b'),
      rx('\\b(?:can\\s+not|cannot)\\s+(?:wake|rouse)\\b'),
      rx('\\bnot\\s+(?:responding|waking)\\b')
    ]
  },
  {
    id: 'haemoptysis',
    label: 'coughing up blood',
    why: 'coughing up blood',
    patterns: [
      rx('\\b(?:cough\\w*|spit\\w*|bring\\w*)\\s+(?:up\\s+)?~3blood\\b'),
      rx('\\bblood\\s+~2(?:in|with)\\s+~2(?:sputum|phlegm|cough|spit|saliva|mucus)\\b'),
      rx('\\b(?:sputum|phlegm|mucus|spit)\\s+~3blood\\w*\\b'),
      rx('\\b(?:blood|bloody)\\s+(?:stained\\s+)?(?:sputum|phlegm|mucus|cough)\\b'),
      rx('\\bcoughing\\s+blood\\b'),
      /* Blood named first, with the cough a few words later. Real messages
         arrive part-translated — "khoon aa raha hai when I cough" folds to
         "blood aa raha hai when i cough", where every ordered pattern above
         misses because the Hindi verb sits in the middle. The gap excludes
         negators, so "no blood when I cough" still does not fire. */
      rx('\\bblood\\b(?!\\s+(?:pressure|test|report|sugar|group|count|bank|work|donation))\\s+~5(?:cough\\w*|sputum|phlegm|spit\\w*|mucus)'),
      rx('\\bvomit\\w*\\s+blood\\b')
    ]
  },
  {
    id: 'anaphylaxis',
    label: 'a severe allergic reaction affecting breathing',
    why: 'an allergic reaction that is affecting your breathing',
    patterns: [
      rx('\\bsevere\\s+allergic\\s+reaction\\b'),
      rx('\\b(?:throat|tongue|lips?|face)\\s+~2(?:swell\\w*|closing|tightening|blocking)\\b'),
      rx('\\bswell\\w*\\s+(?:of\\s+(?:my|the)\\s+)?(?:throat|tongue|face|lips?)\\b'),
      rx('\\b(?:allergic|allergy|reaction|hives|rash|sting|bee|peanut|nuts?)\\b(?=[\\s\\S]{0,80}\\b(?:breathless|can\\s+not\\s+breathe|wheez\\w*|throat)\\b)'),
      rx('\\bepipen\\b')
    ]
  },
  {
    id: 'self-harm',
    label: 'thoughts of self-harm',
    why: 'what you said about wanting to hurt yourself',
    /* Not respiratory, but a visitor in distress may say it to whoever is
       listening, and the one unacceptable outcome is a cheerful reply about
       inhaler technique. Routed to the same urgent state with its own copy. */
    kind: 'crisis',
    patterns: [
      /\b(?:kill|killing)\s+myself\b/,
      /\b(?:end|ending)\s+(?:my|it\s+all)\s*(?:life)?\b/,
      /\bsuicid\w*/,
      /\b(?:want|wanted|going)\s+to\s+die\b/,
      /\bharm\s+myself\b/,
      /\bno\s+(?:point|reason)\s+(?:in\s+)?living\b/
    ]
  }
];

/* ---------------------------------------------------------------------------
   Detection
   --------------------------------------------------------------------------- */

/**
 * Scans a message for red flags.
 *
 * @param {string} raw the visitor's message, unmodified
 * @returns {{hit:boolean, flags:Array<{id:string,label:string,why:string,kind?:string}>, crisis:boolean, normalised:string}}
 */
export function detectRedFlags(raw) {
  const text = normalise(raw);
  const flags = [];
  if (!text) return { hit: false, flags, crisis: false, normalised: text };

  const hypothetical = isHypothetical(text);

  for (const rule of RED_FLAGS) {
    for (const pattern of rule.patterns) {
      const re = new RegExp(pattern.source, pattern.flags.replace('g', ''));
      const m = re.exec(text);
      if (!m) continue;
      /* A question about a symptom is not a report of it — except for the
         crisis rule, which is answered the same way however it is framed. */
      if (hypothetical && rule.kind !== 'crisis') continue;
      if (isNegated(text, m.index)) continue;
      flags.push({ id: rule.id, label: rule.label, why: rule.why, kind: rule.kind || 'emergency' });
      break;
    }
  }

  return {
    hit: flags.length > 0,
    flags,
    crisis: flags.some((f) => f.kind === 'crisis'),
    normalised: text
  };
}

/**
 * The sentence Uppi opens the urgent state with. Built from the flags actually
 * detected so it names what was said rather than reciting a generic warning —
 * §7 of the brief: do not bury urgent advice under paragraphs.
 */
export function urgentOpening(flags) {
  if (!flags.length) return '';
  if (flags.some((f) => f.kind === 'crisis')) {
    return "I'm really glad you told me, and I don't want you to be alone with this. I'm not the right kind of help for it — please talk to someone now: Tele-MANAS on 14416 is free, 24 hours, and staffed by people trained for exactly this. If you are in immediate danger, call 112.";
  }
  const whys = flags.map((f) => f.why);
  const list =
    whys.length === 1 ? whys[0]
      : whys.length === 2 ? whys[0] + ' and ' + whys[1]
        : whys.slice(0, -1).join(', ') + ' and ' + whys[whys.length - 1];
  return "I'm concerned about " + list + '. This may need urgent medical attention. Please seek emergency care now rather than waiting for an online assessment.';
}
