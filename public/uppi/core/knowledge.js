/*
 * Respiratory knowledge layer.
 *
 * §11 of the brief: the medical content Uppi speaks from is curated and
 * attributable, never scraped from the open internet at request time. Every
 * entry below is mainstream patient-facing respiratory education, and each one
 * names the guideline family it reflects so the respiratory team can audit it.
 *
 * This module is the whole abstraction. To change what Uppi knows, edit ENTRIES
 * — nothing else in the application reads clinical content from anywhere else.
 * Adding a Yashoda-approved entry is adding one object to the array.
 *
 * Two consumers:
 *   1. the model, which receives the top matches as grounding context;
 *   2. the deterministic composer, which uses `plain` verbatim when no model is
 *      configured, so the answer is real either way.
 *
 * Editorial rules for anyone adding an entry:
 *   - `plain` is what a visitor reads. Short sentences, no jargon, and any
 *     clinical term explained in the same breath (§5).
 *   - Never state or imply a diagnosis. Entries describe possibilities and what
 *     an assessment would look at (§6).
 *   - `sources` names guideline families, not article URLs, so the line does not
 *     rot. Keep it accurate: if an entry drifts from the guideline, fix the
 *     entry or drop the citation.
 *   - No claim about Yashoda's volumes, firsts or outcomes belongs here. Those
 *     are supplied by the hospital, not written by whoever edits this file.
 */

/*
 * TODO(content): there is no entry for RECURRENT CHEST INFECTIONS / suspected
 * bronchiectasis, and one belongs here — repeated courses of antibiotics for
 * the chest is a common reason people write in. It is deliberately left blank
 * rather than filled with plausible copy: the wording needs to come from
 * Yashoda Pulmonology or from BTS/ERS bronchiectasis guidance with a named
 * source, like every other entry in this file. Until then the triage rule still
 * routes it correctly — the reply simply carries no teaching paragraph.
 */
export const ENTRIES = [
  {
    id: 'acute-cough',
    title: 'A cough that started recently',
    match: ['cough', 'cold', 'chest infection', 'phlegm', 'sputum', 'viral'],
    symptoms: ['cough'],
    plain: [
      'Most coughs that start in the last week or two come from a viral infection, and they settle on their own — though the cough itself can hang around for a while after everything else has gone.',
      'What matters is the trend. A cough that is slowly easing week by week is usually behaving normally. A cough that is getting worse, or that comes with fever and breathlessness, is worth having looked at sooner.'
    ],
    sources: ['NICE acute cough guidance', 'WHO respiratory infection guidance']
  },
  {
    id: 'chronic-cough',
    title: 'A cough lasting three weeks or more',
    match: ['chronic cough', 'long cough', 'three weeks', 'persistent cough', 'not going away'],
    symptoms: ['cough'],
    plain: [
      'Three weeks is the point where a cough stops being a leftover from a cold and starts deserving a proper look. That is not a reason to panic — it is a reason to book.',
      'A persistent cough has several common causes: asthma, post-nasal drip from allergies, acid reflux, a lingering infection, the after-effects of smoking, and in some cases tuberculosis, which is still common in India. Less often it points to something in the lung that needs finding early.',
      'An assessment usually starts with a chest X-ray and a breathing test, plus a sputum test where tuberculosis is a possibility.'
    ],
    sources: ['NICE NG12 suspected cancer referral', 'India National TB Elimination Programme screening criteria', 'ERS chronic cough guidance']
  },
  {
    id: 'breathlessness',
    title: 'Feeling breathless',
    match: ['breathless', 'shortness of breath', 'cannot breathe', 'winded', 'stairs', 'exertion'],
    symptoms: ['breathless'],
    plain: [
      'Breathlessness is worth taking seriously whenever it is new, or worse than it used to be for the same amount of effort.',
      'The two questions that matter most are when it happens and how fast it changed. Breathlessness that only comes on when you climb stairs or walk uphill, and has crept up over months, points in a different direction from breathlessness that arrived suddenly or happens while you are sitting still.',
      'Lungs are not the only cause — the heart, anaemia and anxiety all produce genuine breathlessness. That is part of why an assessment rather than a guess is the right next step.'
    ],
    sources: ['ATS/ERS dyspnoea statement', 'NICE breathlessness guidance']
  },
  {
    id: 'wheeze',
    title: 'Wheezing and a whistling chest',
    match: ['wheeze', 'whistling', 'tight chest', 'chest tightness'],
    symptoms: ['wheeze', 'tightness'],
    plain: [
      'A wheeze is the whistling sound air makes when it squeezes through airways that have narrowed. Sometimes the small airways inside the lungs tighten, which can make breathing feel difficult or cause that whistle.',
      'A wheeze that comes and goes — worse at night or early morning, worse around dust, smoke, cold air or exercise — is a pattern worth showing a doctor, because it responds well to treatment once it is properly identified.'
    ],
    sources: ['GINA global asthma strategy', 'GOLD global COPD strategy']
  },
  {
    id: 'asthma',
    title: 'Asthma',
    match: ['asthma', 'inhaler', 'puffer', 'reliever', 'preventer', 'controller'],
    symptoms: ['wheeze', 'cough', 'breathless'],
    plain: [
      'Asthma means the airways are inflamed and easily irritated, so they narrow in response to triggers. It typically shows up as wheeze, cough, chest tightness or breathlessness that varies — worse at some times, gone at others.',
      'Well-controlled asthma should mean almost no daytime symptoms, no waking at night because of it, and rarely needing a reliever inhaler. Needing the reliever several times a week is the clearest sign the treatment needs revisiting — it is not a sign of failure, and it usually has a straightforward fix.',
      'Two things change asthma outcomes more than anything else: taking the preventer inhaler every day even when you feel fine, and using the inhaler correctly. A large share of people get less than half their dose because of technique alone.'
    ],
    sources: ['GINA global asthma strategy'],
    route: '/asthma-control-test'
  },
  {
    id: 'copd',
    title: 'COPD',
    match: ['copd', 'emphysema', 'chronic bronchitis', 'smoker cough'],
    symptoms: ['breathless', 'cough', 'sputum'],
    plain: [
      'COPD is long-term narrowing of the airways, most often from years of smoking, and in India also from cooking smoke and occupational dust. It usually shows as breathlessness that has built up over years, a cough on most days, and phlegm.',
      'Unlike asthma, the narrowing does not fully reverse — but that does not mean nothing can be done. Stopping smoking, the right inhalers, vaccination and pulmonary rehabilitation all measurably change how well someone lives with it.',
      'Diagnosis needs spirometry, a simple breathing test where you blow hard into a machine. It is the only way to confirm COPD rather than assume it.'
    ],
    sources: ['GOLD global COPD strategy'],
    route: '/copd-assessment-test'
  },
  {
    id: 'allergic-rhinitis',
    title: 'Allergies, sneezing and a blocked nose',
    match: ['allergy', 'allergic', 'sneezing', 'runny nose', 'blocked nose', 'hay fever', 'dust allergy', 'pollen'],
    symptoms: ['allergy'],
    plain: [
      'Sneezing, an itchy or blocked nose and watery eyes usually mean the lining of the nose is reacting to something in the air — dust mites, pollen, mould, pets or smoke.',
      'It matters more than it looks. Untreated nasal allergy makes asthma harder to control, and the drip down the back of the throat is a common reason a cough will not settle. Treating the nose often quietens the chest.'
    ],
    sources: ['ARIA allergic rhinitis guidance', 'GINA global asthma strategy'],
    route: '/allergy-calendar'
  },
  {
    id: 'sleep-apnoea',
    title: 'Snoring and sleep apnoea',
    match: ['snoring', 'sleep apnea', 'sleep apnoea', 'stop breathing in sleep', 'daytime sleepiness', 'cpap'],
    symptoms: ['snoring', 'daysleepy'],
    plain: [
      'Loud snoring with pauses in breathing, gasping in the night, and feeling tired through the day despite enough hours in bed is the pattern of obstructive sleep apnoea — the throat relaxing enough during sleep to block airflow, over and over.',
      'It is common, very treatable, and worth diagnosing because untreated it pushes up blood pressure and cardiac risk. The test is a sleep study, which can often be done at home.'
    ],
    sources: ['AASM sleep apnoea guidance', 'ERS sleep-disordered breathing statement']
  },
  {
    id: 'pneumonia',
    title: 'Chest infections and pneumonia',
    match: ['pneumonia', 'chest infection', 'lrti', 'fever cough', 'infection'],
    symptoms: ['fever', 'cough', 'breathless'],
    plain: [
      'A fever with a cough, phlegm and breathlessness can mean an infection has reached the lung. That combination is worth being seen for promptly rather than waiting it out, particularly for anyone older, pregnant, or living with a long-term lung or heart condition.',
      'A chest X-ray usually settles the question quickly.'
    ],
    sources: ['WHO pneumonia guidance', 'NICE pneumonia guidance']
  },
  {
    id: 'tuberculosis',
    title: 'Tuberculosis',
    match: ['tb', 'tuberculosis', 'night sweats', 'weight loss cough'],
    symptoms: ['cough', 'weightloss', 'fever'],
    plain: [
      'Tuberculosis is still common in India, and it is treatable — but it needs to be found. The pattern to know is a cough lasting two weeks or more, often with evening fevers, night sweats, weight loss or loss of appetite.',
      'Testing is straightforward: a sputum test and a chest X-ray. Anyone with that pattern should be tested rather than treated with repeated courses of ordinary antibiotics.'
    ],
    sources: ['WHO TB guidance', 'India National TB Elimination Programme']
  },
  {
    id: 'ild',
    title: 'Interstitial lung disease and pulmonary fibrosis',
    match: ['ild', 'fibrosis', 'ipf', 'interstitial', 'scarring'],
    symptoms: ['breathless', 'cough'],
    plain: [
      'Interstitial lung disease is a group of conditions in which the tissue between the air sacs becomes inflamed or scarred, making the lungs stiffer and less able to move oxygen across. The usual story is breathlessness building over months and a dry cough that will not go.',
      'It needs specialist assessment — typically a high-resolution CT scan and detailed lung function testing — because the different types are managed very differently and some are treatable.'
    ],
    sources: ['ATS/ERS/JRS/ALAT IPF guidance']
  },
  {
    id: 'lung-cancer',
    title: 'When a cough needs ruling out properly',
    match: ['lung cancer', 'cancer', 'nodule', 'spot on lung', 'screening', 'ct scan'],
    symptoms: ['cough', 'weightloss', 'hoarse'],
    plain: [
      'Most persistent coughs are not cancer. But a few features move a cough from "watch it" to "check it now": coughing up blood, weight loss without trying, a cough that has changed in someone who smokes or used to, or a hoarse voice that lasts beyond three weeks.',
      'Checking is quick and usually reassuring — a chest X-ray, and a CT scan if anything needs a closer look. Finding something early is the entire reason the threshold for looking is set low.'
    ],
    sources: ['NICE NG12 suspected cancer referral', 'ATS lung cancer screening guidance'],
    route: '/nodule-journey'
  },
  {
    id: 'smoking',
    title: 'Smoking, and what stopping does',
    match: ['smoking', 'smoke', 'cigarette', 'beedi', 'quit', 'tobacco', 'vape'],
    symptoms: [],
    plain: [
      'Stopping smoking is the single change with the largest effect on lung health, at any age and after any number of years. Carbon monoxide clears from the blood within a day, the airways start to relax within a few days, and lung function measurably improves over the following months.',
      'It is also genuinely hard, and it usually takes support rather than willpower alone. That is not a character judgement — it is how nicotine works.'
    ],
    sources: ['WHO tobacco cessation guidance', 'GOLD global COPD strategy'],
    route: '/rendo-upiri'
  },
  {
    id: 'inhaler-technique',
    title: 'Getting the most from an inhaler',
    match: ['inhaler technique', 'how to use inhaler', 'spacer', 'not working'],
    symptoms: [],
    plain: [
      'An inhaler only works if the medicine reaches the small airways, and technique decides whether it does. The commonest problems are breathing in too fast with a metered-dose inhaler, not holding the breath afterwards, and not using a spacer when one would help.',
      'If an inhaler seems to have stopped working, technique is worth checking before the dose is changed. It is a two-minute thing to review at any appointment.'
    ],
    sources: ['GINA global asthma strategy', 'ERS inhaler device guidance']
  },
  {
    id: 'air-quality',
    title: 'Air quality, dust and cooking smoke',
    match: ['pollution', 'aqi', 'smog', 'dust', 'air quality', 'construction', 'traffic', 'stove', 'firewood'],
    symptoms: [],
    plain: [
      'Polluted air makes existing lung conditions flare and irritates healthy airways too. In Indian cities the main exposures are traffic and construction dust outdoors, and cooking smoke, incense and mosquito coils indoors.',
      'Practical steps help more than they sound like they would: cooking on gas or electricity rather than solid fuel, ventilating while cooking, avoiding outdoor exertion on the worst days, and keeping windows shut when a road is being dug up.'
    ],
    sources: ['WHO global air quality guidelines'],
    route: '/allergy-calendar'
  },
  {
    id: 'spirometry',
    title: 'Breathing tests, explained',
    match: ['spirometry', 'lung function', 'pft', 'breathing test', 'peak flow'],
    symptoms: [],
    plain: [
      'Spirometry means blowing as hard and as long as you can into a machine that measures how much air you move and how fast. It is the test that separates asthma from COPD rather than guessing between them.',
      'It takes a few minutes, needs no needles, and is repeated a couple of times to get a reliable reading. You may be asked to do it again after an inhaler, to see how much the airways open up.'
    ],
    sources: ['ATS/ERS spirometry standards'],
    route: '/tests-and-procedures'
  },
  {
    id: 'child-wheeze',
    title: 'Wheezing in children',
    match: ['child', 'kid', 'son', 'daughter', 'baby', 'toddler', 'paediatric'],
    symptoms: ['wheeze', 'cough'],
    plain: [
      'Wheezing is common in young children, and many who wheeze with colds grow out of it. That said, a child who wheezes repeatedly, coughs at night, or gets breathless with play deserves a proper assessment rather than repeated courses of cough syrup.',
      'Signs that a child needs to be seen the same day: breathing fast or with obvious effort, the skin pulling in between or under the ribs, being too breathless to feed or speak, or drowsiness.'
    ],
    sources: ['GINA global asthma strategy — children', 'WHO IMCI guidance']
  }
];

/* ---------------------------------------------------------------------------
   Retrieval
   --------------------------------------------------------------------------- */

/*
 * Whole words only. A plain `includes()` scores "ild" against "childhood" and
 * "tb" against "subtle", which is how a first message of "I've had this since
 * childhood" came back with a paragraph about pulmonary fibrosis.
 */
function mentions(text, term) {
  return new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(text);
}

function scoreEntry(entry, text, symptoms) {
  let score = 0;
  for (const term of entry.match) {
    if (mentions(text, term)) score += term.includes(' ') ? 3 : 2;
  }
  for (const s of entry.symptoms) {
    if (symptoms.includes(s)) score += 2;
  }
  return score;
}

/**
 * Returns the entries most relevant to what the visitor said. Deterministic and
 * local — no network call, no embedding service, nothing to be down.
 *
 * @param {string} normalisedText output of normalise()
 * @param {string[]} symptoms symptom ids from the extraction
 * @param {number} limit how many entries to return
 */
export function retrieve(normalisedText, symptoms, limit) {
  return scored(normalisedText, symptoms, limit).map((x) => x.entry);
}

/**
 * The same ranking, with the scores kept.
 *
 * The composer needs them: choosing what to say next is a trade-off between
 * relevance and not repeating itself, and that trade-off cannot be made on an
 * unordered list. Preferring novelty over relevance is how a companion ends up
 * answering "only when I walk quickly" with a paragraph about COPD.
 */
export function scored(normalisedText, symptoms, limit) {
  const text = String(normalisedText || '');
  const syms = symptoms || [];
  return ENTRIES
    .map((e) => ({ entry: e, score: scoreEntry(e, text, syms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit || 3);
}

/** Flattens the retrieved entries into the grounding block sent to the model. */
export function asContext(entries) {
  if (!entries.length) return '';
  return entries
    .map((e) => '### ' + e.title + '\n' + e.plain.join('\n') + '\nGuideline basis: ' + e.sources.join('; '))
    .join('\n\n');
}

/** Every guideline family cited by the retrieved entries, de-duplicated. */
export function sourcesOf(entries) {
  const out = [];
  for (const e of entries) for (const s of e.sources) if (!out.includes(s)) out.push(s);
  return out;
}
