/* Shared configuration for the three Breath Clubs.
   The diary architecture is identical across clubs; only the medication presets,
   tracked metric (peak flow vs SpO₂) and copy differ. */

export const CLUBS = {
  asthma: {
    id: "asthma",
    label: "Asthma Club",
    te: "ఆస్తమా క్లబ్",
    academy: "Asthma Academy",
    academyTe: "ఆస్తమా అకాడమీ",
    championsTitle: "Asthma Champions",
    desc: "Log inhalers, track peak flow, catch flare-ups early — plus the Academy video library and member champions.",
    metric: "pef",
    relieverRule: true, // reliever-overuse early warning applies
    symptomQ: "How is your breathing today?",
    presets: [
      { name: "Budesonide+Formoterol (e.g., Foracort)", type: "controller", perDay: 2 },
      { name: "Fluticasone+Salmeterol (e.g., Seroflo)", type: "controller", perDay: 2 },
      { name: "Budesonide (e.g., Budecort)", type: "controller", perDay: 2 },
      { name: "Salbutamol (e.g., Asthalin) — reliever", type: "reliever", perDay: 0 },
      { name: "Montelukast tablet", type: "controller", perDay: 1 },
    ],
    clubLife: [
      "Monthly tea-and-talk session: inhaler technique clinic + trigger-proofing your home. Spacer demos for everyone.",
      "Still symptomatic on regular inhalers? Ask about the Severe Asthma & Biologics Centre — some members haven't needed oral steroids in a year.",
      "Flu & pneumonia vaccination status check at every visit — protecting vulnerable lungs is half the battle.",
    ],
    videos: [
      { t: "Inhaler technique masterclass — 8 mistakes we see daily", dur: "6:42", by: "Consultant Pulmonologist" },
      { t: "Spacers: why they double your medicine's reach", dur: "4:15", by: "Consultant Pulmonologist" },
      { t: "Trigger-proofing a Hyderabad home", dur: "7:30", by: "Allergy & Immunology Consultant" },
      { t: "Your asthma action plan, explained zone by zone", dur: "5:58", by: "Consultant Pulmonologist" },
      { t: "Biologics: life after severe asthma", dur: "9:12", by: "Severe Asthma Centre Lead" },
      { t: "Asthma in pregnancy — what changes, what doesn't", dur: "6:05", by: "Consultant Pulmonologist" },
      { t: "Exercise and asthma: train, don't retreat", dur: "5:20", by: "Pulmonary Rehab Physiotherapist" },
      { t: "Peak flow diaries: reading your own early warnings", dur: "4:48", by: "Consultant Pulmonologist" },
    ],
    champions: [
      { initials: "SK", name: "S. K.", age: 34, quote: "I ran the 10K this year. Two years ago I couldn't climb my own stairs without stopping.", outcome: "No oral steroids in 12 months" },
      { initials: "RM", name: "R. M.", age: 28, quote: "One session on inhaler technique changed everything. Same medicines — new life.", outcome: "Zero ER visits since joining" },
      { initials: "PD", name: "P. D.", age: 41, quote: "The diary caught my flare-up three days before I felt it. A small dose change, and nothing happened.", outcome: "Fully controlled, 18 months" },
    ],
  },

  copd: {
    id: "copd",
    label: "COPD Club",
    te: "సీఓపీడీ క్లబ్",
    academy: "COPD Academy",
    academyTe: "సీఓపీడీ అకాడమీ",
    championsTitle: "COPD Champions",
    desc: "Daily adherence, breathing diary and peak-flow trend alerts — plus pulmonary rehab content and member champions.",
    metric: "pef",
    relieverRule: false,
    symptomQ: "How is your breathing today?",
    presets: [
      { name: "Tiotropium (e.g., Tiova)", type: "controller", perDay: 1 },
      { name: "Glycopyrronium+Formoterol", type: "controller", perDay: 2 },
      { name: "Budesonide+Formoterol (e.g., Foracort)", type: "controller", perDay: 2 },
      { name: "Ipratropium+Levosalbutamol (e.g., Duolin) — reliever", type: "reliever", perDay: 0 },
    ],
    clubLife: [
      "Monthly tea-and-talk session: breathing techniques + pulmonary rehab taster. Bring a family member — they're part of the treatment.",
      "Severe COPD? Ask about valve-based lung volume reduction (BLVR) — advanced options beyond inhalers, without surgery.",
      "Flu & pneumonia vaccination status check at every visit — protecting vulnerable lungs is half the battle.",
    ],
    videos: [
      { t: "DPI inhalers: the deep, fast breath that matters", dur: "5:35", by: "Consultant Pulmonologist" },
      { t: "Pulmonary rehab at home — the 20-minute routine", dur: "8:44", by: "Pulmonary Rehab Physiotherapist" },
      { t: "Pursed-lip breathing: your built-in rescue tool", dur: "3:52", by: "Pulmonary Rehab Physiotherapist" },
      { t: "BLVR explained: valves, not surgery", dur: "7:18", by: "Interventional Pulmonologist" },
      { t: "Home oxygen: myths that keep people housebound", dur: "6:27", by: "Consultant Pulmonologist" },
      { t: "Eating well when breathing costs calories", dur: "5:10", by: "Clinical Nutritionist" },
      { t: "Flare-ups: the 48-hour window that changes outcomes", dur: "6:50", by: "Consultant Pulmonologist" },
      { t: "Vaccines for COPD: which, when, why", dur: "4:33", by: "Consultant Pulmonologist" },
    ],
    champions: [
      { initials: "VR", name: "V. R.", age: 63, quote: "Pulmonary rehab gave me back my morning walk. I thought those days were finished.", outcome: "6-min walk distance up 40%" },
      { initials: "GN", name: "G. N.", age: 58, quote: "Quit at 58 with Rendo Ūpiri, joined the club the same week. Best two decisions of my life.", outcome: "No admissions in 14 months" },
      { initials: "MA", name: "M. A.", age: 67, quote: "After the valve procedure I climb two flights. Before, twenty steps would stop me.", outcome: "BLVR — breathless at 20 steps → 2 flights" },
    ],
  },

  ild: {
    id: "ild",
    label: "ILD Club",
    te: "ఐఎల్‌డీ క్లబ్",
    academy: "ILD Academy",
    academyTe: "ఐఎల్‌డీ అకాడమీ",
    championsTitle: "ILD Champions",
    desc: "A breathlessness diary with home SpO₂ tracking, antifibrotic support and a community that understands pacing.",
    metric: "spo2",
    relieverRule: false,
    symptomQ: "How is your breathlessness today?",
    presets: [
      { name: "Pirfenidone (antifibrotic)", type: "controller", perDay: 3 },
      { name: "Nintedanib (antifibrotic)", type: "controller", perDay: 2 },
      { name: "Prescribed inhaler (as advised)", type: "controller", perDay: 2 },
      { name: "Rescue inhaler / nebulisation — as needed", type: "reliever", perDay: 0 },
    ],
    clubLife: [
      "Monthly ILD circle: pacing techniques, breathing exercises and caregiver support — family members warmly welcome.",
      "Antifibrotic side-effect clinic: practical fixes for nausea, appetite and sun-sensitivity so you can stay on therapy.",
      "Ask about pulmonary rehabilitation and a home-oxygen assessment — both change daily life more than any pill.",
    ],
    videos: [
      { t: "Understanding ILD and lung fibrosis, in plain words", dur: "8:05", by: "ILD Clinic Lead" },
      { t: "Antifibrotics explained: pirfenidone & nintedanib", dur: "7:41", by: "ILD Clinic Lead" },
      { t: "Managing antifibrotic side-effects — the practical guide", dur: "6:22", by: "Consultant Pulmonologist" },
      { t: "Home SpO₂ monitoring: numbers that matter", dur: "4:58", by: "Consultant Pulmonologist" },
      { t: "Oxygen therapy at home, without fear", dur: "6:36", by: "Consultant Pulmonologist" },
      { t: "Pulmonary rehab for ILD: pace, don't push", dur: "7:52", by: "Pulmonary Rehab Physiotherapist" },
      { t: "The ILD cough: what helps, honestly", dur: "5:14", by: "Consultant Pulmonologist" },
      { t: "When to call the clinic — your early-warning list", dur: "4:20", by: "ILD Nurse Coordinator" },
    ],
    champions: [
      { initials: "KS", name: "K. S.", age: 59, quote: "The SpO₂ diary means my doctor adjusts things before I'm in trouble, not after.", outcome: "Stable fibrosis, 2 years" },
      { initials: "LN", name: "L. N.", age: 64, quote: "The side-effects nearly made me stop the tablets. The club taught me the tricks — I'm still on therapy.", outcome: "On antifibrotics 18 months" },
      { initials: "BT", name: "B. T.", age: 52, quote: "Rehab taught me to pace, not to fear. I'm back to teaching part-time.", outcome: "Back at work part-time" },
    ],
  },
};

export const CLUB_LIST = Object.values(CLUBS);
