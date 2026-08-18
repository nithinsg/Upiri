/*
 * Output safety validation.
 *
 * The last stage of the pipeline. Whatever the model produced, this decides
 * whether a visitor is allowed to see it. Nothing here is a suggestion to the
 * model — it is a gate applied to the finished text, so a prompt that gets
 * ignored, drifted from, or talked around still cannot put a diagnosis on
 * screen.
 *
 * On a violation the caller drops the model's text entirely and falls back to
 * the deterministic composition. Never patch a bad medical sentence and ship
 * the rest of the paragraph: if the model claimed a diagnosis in sentence two,
 * sentence three is not trustworthy either.
 */

/* ---------------------------------------------------------------------------
   Hard failures — the text is discarded
   --------------------------------------------------------------------------- */

const CONDITIONS = 'asthma|copd|emphysema|chronic bronchitis|pneumonia|tuberculosis|tb|lung cancer|cancer|ild|pulmonary fibrosis|bronchiectasis|sleep apn(?:o?ea)|covid|allergic rhinitis|pleural effusion|pulmonary embolism';

const FORBIDDEN = [
  {
    id: 'diagnosis-asserted',
    /* "you have asthma", "you are suffering from COPD", "your child has pneumonia" */
    re: new RegExp('\\b(?:you|your \\w+)\\s+(?:have|has|have got|are suffering from|is suffering from|are having|do have)\\s+(?:' + CONDITIONS + ')\\b', 'i')
  },
  {
    id: 'diagnosis-declared',
    re: new RegExp('\\b(?:this|that|it)\\s+(?:is|sounds|looks|seems)\\s+(?:definitely|certainly|clearly|most likely|probably)\\s+(?:' + CONDITIONS + ')\\b', 'i')
  },
  {
    id: 'diagnosis-verb',
    re: /\bi\s+(?:diagnose|can diagnose|am diagnosing|would diagnose)\b/i
  },
  {
    id: 'ruled-out',
    /* Telling someone they do NOT have something is the more dangerous half. */
    re: new RegExp('\\b(?:you|your \\w+)\\s+(?:do not|don\'t|does not|doesn\'t)\\s+have\\s+(?:' + CONDITIONS + ')\\b', 'i')
  },
  {
    id: 'false-reassurance',
    re: /\b(?:nothing to worry about|no need to worry|there'?s nothing wrong|you'?ll be (?:fine|okay|alright)|it'?s (?:just|only) a|not serious at all|completely harmless)\b/i
  },
  {
    id: 'claims-clinician',
    re: /\b(?:as (?:a|your) doctor|i am a doctor|i'?m a doctor|speaking as a (?:doctor|physician|pulmonologist)|in my clinical (?:opinion|judgement|judgment))\b/i
  },
  {
    id: 'prescribes',
    /* Naming a drug and a dose is prescribing, whoever says it. */
    re: /\b(?:take|start|use|begin)\s+(?:\w+\s+){0,3}\b\d+\s*(?:mg|mcg|ml|g)\b/i
  },
  {
    id: 'antibiotic-advice',
    re: /\b(?:you should (?:take|start)|i (?:recommend|suggest) (?:you )?(?:take|start))\s+(?:an? )?(?:antibiotic|azithromycin|amoxicillin|augmentin|steroid|prednisolone)/i
  },
  {
    id: 'ai-disclosure-language',
    /* §19: never sound like a chatbot introducing itself. */
    re: /\b(?:as an ai|i am an ai|i'?m an ai|as a language model|i'?m just a (?:bot|program)|how (?:can|may) i assist you)\b/i
  }
];

/* ---------------------------------------------------------------------------
   Soft failures — the text is repaired
   --------------------------------------------------------------------------- */

const STRIP = [
  [/^#{1,6}\s+/gm, ''],                      /* markdown headings */
  [/\*\*(.+?)\*\*/g, '$1'],                  /* bold */
  [/(?<![*\w])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![*\w])/g, '$1'], /* italics, not bullets */
  [/\[([^\]]+)\]\([^)]*\)/g, '$1'],          /* links — CTAs are buttons, not prose */
  [/https?:\/\/\S+/g, ''],                   /* bare URLs */
  [/^\s*[-•]\s+/gm, '• '],                   /* normalise bullets */
  [/\n{3,}/g, '\n\n']
];

const MAX_CHARS = 1100;

function tidy(text) {
  let t = String(text || '').trim();
  for (const [re, to] of STRIP) t = t.replace(re, to);
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return t;
}

/* Trims to whole sentences rather than mid-word, so a long answer ends cleanly
   instead of trailing off. */
function clamp(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut).trim();
}

/* ---------------------------------------------------------------------------
   The gate
   --------------------------------------------------------------------------- */

/**
 * @param {string} text the model's response
 * @param {object} decision the triage result the text was supposed to convey
 * @returns {{ok:boolean, text:string, violations:string[]}}
 */
export function validate(text, decision) {
  const violations = [];
  const raw = String(text || '').trim();
  if (!raw) return { ok: false, text: '', violations: ['empty'] };

  for (const rule of FORBIDDEN) {
    if (rule.re.test(raw)) violations.push(rule.id);
  }

  /* An emergency answer that reads like a normal educational reply is a
     failure however well written it is. */
  if (decision && decision.emergencyRecommended && !/\b(?:emergency|108|urgent|straight away|right now|immediately)\b/i.test(raw)) {
    violations.push('emergency-not-conveyed');
  }

  /* Conversely, an emergency instruction attached to a routine answer sends
     people to a casualty department for a two-day cough. */
  if (decision && decision.urgency === 'routine' && /\b(?:call 108|emergency (?:department|room|care)|go to (?:the )?(?:hospital|casualty) (?:now|immediately))\b/i.test(raw)) {
    violations.push('over-escalated');
  }

  if (violations.length) return { ok: false, text: '', violations };

  return { ok: true, text: clamp(tidy(raw), MAX_CHARS), violations };
}

/**
 * Applied to text that has already passed `validate`, or to text this codebase
 * wrote itself. Formatting only — it makes no safety decision.
 */
export function present(text) {
  return clamp(tidy(text), MAX_CHARS);
}
