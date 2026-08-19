/*
 * The Knowledge Hub and procedure artwork.
 *
 * WHY THIS EXISTS
 * Every topic card and procedure card used to show one of eight stroke icons,
 * reused across twenty-seven subjects — most of them falling back to the same
 * generic lung outline. Three cards in a row looked identical, and the whole
 * hub read as clip art rather than as a hospital's own library.
 *
 * These are illustrations rather than line icons: a distinct scene per subject,
 * in the ŪPIRI palette, rasterised to real image files by
 * `scripts/make-artwork.mjs` and served as `<img>` with alt text and lazy
 * loading. `npm run artwork` regenerates them.
 *
 * WHAT THESE ARE NOT
 * They are not photographs and they are not diagnostic diagrams. Nothing here
 * is drawn to anatomical scale or intended to be read clinically — they are
 * subject markers, the way a good textbook's chapter openers are. Real clinical
 * photography, if the hospital wants it, still has to come from Yashoda.
 *
 * HOUSE STYLE, so a later addition matches without guesswork:
 *   - 480 × 300 canvas, safe margin 24px
 *   - one soft tinted wash + one large offset blob behind the subject
 *   - the subject in flat shapes with a single light source, upper left
 *   - marigold used once per scene, as the accent that carries the eye
 *   - no text, no arrows, nothing that would need translating
 */

export const W = 480;
export const H = 300;

/* The palette. Nothing here invents a colour — these are the site's own. */
export const C = {
  navy: '#2C2A6B',
  navyDeep: '#1D1B4B',
  navyLight: '#4A4880',
  marigold: '#F5821F',
  marigoldSoft: '#FCA14E',
  ground: '#EDF2F8',
  coral: '#EFA294',
  coralDeep: '#D97F6E',
  teal: '#2E8B8B',
  green: '#27784C',
  violet: '#6C63B5',
  cream: '#FBF6EE',
  white: '#FFFFFF',
  ink: '#16130F'
};

/* ---------------------------------------------------------------------------
   Shared parts
   --------------------------------------------------------------------------- */

const wash = (a, b) => `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
    </linearGradient>
    <radialGradient id="blob" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="150" cy="96" r="190" fill="url(#blob)"/>`;

/** A pair of lungs, the recurring subject. `scar` and `spot` vary the story. */
function lungs(x, y, s, opts) {
  const o = opts || {};
  const fill = o.fill || C.coral;
  const dark = o.dark || C.coralDeep;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-7" y="-74" width="14" height="46" rx="7" fill="${dark}"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="-9" y="${-72 + i * 9}" width="18" height="6" rx="3" fill="${fill}"/>`).join('')}
    <path d="M-4 -30C-10 -50-30-58-46-46-66-31-76-2-72 26c3 22 17 33 33 28C-22 49-12 34-8 12Z" fill="${fill}"/>
    <path d="M4 -30C10 -50 30-58 46-46 66-31 76-2 72 26c-3 22-17 33-33 28C22 49 12 34 8 12Z" fill="${fill}"/>
    <path d="M-4 -30C-10 -50-30-58-46-46-56-37-64-24-69-9c8-16 20-27 34-30 14-3 24 4 27 15Z" fill="#FFFFFF" opacity="0.3"/>
    ${o.scar ? `<g stroke="${dark}" stroke-width="3" stroke-linecap="round" opacity="0.75" fill="none">
      <path d="M-52 -18 -30 -6M-58 2-32 10M-54 22-30 26M52-18 30-6M58 2 32 10M54 22 30 26"/></g>` : ''}
    ${o.tree ? `<g stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" opacity="0.62" fill="none">
      <path d="M0-26 0-6M0-10-28 6M0-10 28 6M-28 6-40 22M-28 6-22 26M28 6 40 22M28 6 22 26"/></g>` : ''}
    ${o.spot ? `<circle cx="34" cy="4" r="13" fill="${C.marigold}"/><circle cx="34" cy="4" r="21" fill="none" stroke="${C.marigold}" stroke-width="3" opacity="0.5"/>` : ''}
    ${o.tight ? `<g stroke="${C.violet}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.85">
      <path d="M-58 -4C-38 -14-18-14-4-6M58-4C38-14 18-14 4-6"/></g>` : ''}
  </g>`;
}

/** Soft floating particles — dust, pollen, droplets, smoke. */
function motes(seed, colour, count, r) {
  let out = '';
  let n = seed;
  const rnd = () => { n = (n * 9301 + 49297) % 233280; return n / 233280; };
  for (let i = 0; i < (count || 14); i++) {
    out += `<circle cx="${40 + rnd() * 400}" cy="${30 + rnd() * 240}" r="${(r || 5) * (0.5 + rnd())}" fill="${colour}" opacity="${0.18 + rnd() * 0.4}"/>`;
  }
  return out;
}

/** A trace — flow-volume loop, ECG, breathing waveform. */
function trace(d, colour, width) {
  return `<path d="${d}" fill="none" stroke="${colour || C.marigold}" stroke-width="${width || 5}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const scope = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot || 0})">
  <path d="M0 0C40 0 70 22 92 48" stroke="${C.navy}" stroke-width="13" fill="none" stroke-linecap="round"/>
  <circle cx="0" cy="0" r="16" fill="${C.navyDeep}"/>
  <circle cx="0" cy="0" r="7" fill="${C.marigold}"/></g>`;

/* ---------------------------------------------------------------------------
   The scenes
   --------------------------------------------------------------------------- */

export const SCENES = {
  asthma: {
    alt: 'An illustration of lungs with a reliever inhaler',
    svg: () => wash('#E9F0FB', '#DCE7F7') + lungs(200, 160, 1.25, { tree: true }) +
      `<g transform="translate(348 150) rotate(12)">
        <rect x="-26" y="-52" width="52" height="86" rx="16" fill="${C.marigold}"/>
        <rect x="-26" y="-52" width="52" height="30" rx="15" fill="${C.marigoldSoft}"/>
        <rect x="-15" y="-74" width="30" height="26" rx="9" fill="${C.navy}"/>
        <rect x="-9" y="-84" width="18" height="14" rx="6" fill="${C.navyDeep}"/>
      </g>` + motes(7, C.white, 8, 4)
  },
  'severe-asthma': {
    alt: 'An illustration of tightened airways with a treatment syringe',
    svg: () => wash('#EEEAF8', '#E0DAF3') + lungs(190, 158, 1.22, { tight: true, tree: true }) +
      `<g transform="translate(360 150) rotate(-28)">
        <rect x="-12" y="-58" width="24" height="90" rx="7" fill="${C.white}"/>
        <rect x="-12" y="-14" width="24" height="46" rx="6" fill="${C.violet}" opacity="0.55"/>
        <rect x="-20" y="-64" width="40" height="12" rx="6" fill="${C.navy}"/>
        <rect x="-3" y="32" width="6" height="34" rx="3" fill="${C.navy}"/>
      </g>`
  },
  copd: {
    alt: 'An illustration of over-inflated lungs with smoke drifting past',
    svg: () => wash('#F1EDE6', '#E4DCCF') + lungs(210, 162, 1.3, { fill: '#E2A08E', dark: '#C07E६E'.replace('६', '6') }) +
      `<g stroke="${C.navyLight}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.35">
        <path d="M330 96c26-10 26 22 52 12M330 138c30-12 30 24 58 12M336 180c24-9 24 20 48 11"/></g>` + motes(3, C.navyLight, 10, 4)
  },
  ild: {
    alt: 'An illustration of lungs with a honeycomb scarring pattern',
    svg: () => wash('#E7F1EF', '#D6E7E4') + lungs(210, 158, 1.28, { scar: true }) +
      `<g transform="translate(366 168)" fill="none" stroke="${C.teal}" stroke-width="3.4" opacity="0.8">
        ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<polygon points="0,-13 11,-6 11,7 0,14 -11,7 -11,-6" transform="translate(${c * 23 - 23 + (r % 2 ? 11 : 0)} ${r * 20 - 20})"/>`).join('')).join('')}
      </g>`
  },
  'pulmonary-fibrosis': {
    alt: 'An illustration of scarred lung tissue under a magnifier',
    svg: () => wash('#EDEBF6', '#DEDAEF') + lungs(196, 160, 1.24, { scar: true }) +
      `<g transform="translate(356 142)">
        <circle cx="0" cy="0" r="52" fill="${C.white}" opacity="0.92"/>
        <circle cx="0" cy="0" r="52" fill="none" stroke="${C.navy}" stroke-width="9"/>
        <path d="M38 38 76 76" stroke="${C.navy}" stroke-width="14" stroke-linecap="round"/>
        <g stroke="${C.coralDeep}" stroke-width="4" stroke-linecap="round" opacity="0.9">
          <path d="M-30-16-4-26M-32 2-2-6M-26 20 2 12M6-22 30-10M8 0 32 8M6 18 28 26"/></g>
      </g>`
  },
  'lung-cancer': {
    alt: 'An illustration of a lung with a highlighted spot inside a scan crosshair',
    svg: () => wash('#F3ECEA', '#E7DAD6') + lungs(200, 160, 1.28, { spot: true }) +
      `<g transform="translate(360 152)" stroke="${C.navy}" stroke-width="6" fill="none" stroke-linecap="round">
        <path d="M-46-24v-14a10 10 0 0 1 10-10h14M46-24v-14a10 10 0 0 0-10-10h-14M-46 24v14a10 10 0 0 0 10 10h14M46 24v14a10 10 0 0 1-10 10h-14"/>
      </g><circle cx="360" cy="152" r="13" fill="${C.marigold}"/>`
  },
  'lung-nodules': {
    alt: 'An illustration of a CT slice with a small nodule and a measuring scale',
    svg: () => wash('#E9EEF8', '#D9E3F4') +
      `<circle cx="200" cy="150" r="104" fill="${C.white}" opacity="0.9"/>
       <circle cx="200" cy="150" r="104" fill="none" stroke="${C.navy}" stroke-width="7"/>
       ${lungs(200, 158, 0.86, {})}
       <circle cx="232" cy="140" r="15" fill="${C.marigold}"/>
       <circle cx="232" cy="140" r="27" fill="none" stroke="${C.marigold}" stroke-width="4" opacity="0.55"/>
       <g transform="translate(352 96)" stroke="${C.navy}" stroke-width="5" stroke-linecap="round">
         <path d="M0 0v112"/><path d="M0 0h22M0 28h14M0 56h22M0 84h14M0 112h22"/></g>`
  },
  'pulmonary-hypertension': {
    alt: 'An illustration of the heart and pulmonary artery with a pressure gauge',
    svg: () => wash('#F6EAEC', '#EBD6DA') +
      `<path d="M196 106c-22-26-64-20-70 12-6 32 30 62 70 92 40-30 76-60 70-92-6-32-48-38-70-12Z" fill="${C.coralDeep}"/>
       <path d="M196 106c-14-16-38-16-52-2 16-6 34-2 44 10Z" fill="${C.white}" opacity="0.4"/>
       <path d="M232 130c34-6 56 10 62 40" stroke="${C.navy}" stroke-width="15" fill="none" stroke-linecap="round"/>
       <g transform="translate(340 196)">
         <circle r="46" fill="${C.white}"/><circle r="46" fill="none" stroke="${C.navy}" stroke-width="7"/>
         <path d="M0 0 26-24" stroke="${C.marigold}" stroke-width="8" stroke-linecap="round"/>
         <circle r="7" fill="${C.navy}"/></g>` + trace('M60 250c30-14 40 16 70 2s40-40 70-26', C.navy, 4)
  },
  'lung-transplantation': {
    alt: 'An illustration of lungs held in cupped hands',
    svg: () => wash('#E8F2EC', '#D6E8DD') + lungs(240, 138, 1.16, { tree: true }) +
      `<path d="M126 196c0 40 46 74 114 74s114-34 114-74c0-16-16-24-28-14-16 14-46 24-86 24s-70-10-86-24c-12-10-28-2-28 14Z" fill="${C.navy}"/>
       <path d="M150 206c14 12 44 22 90 22s76-10 90-22" stroke="${C.white}" stroke-width="4" fill="none" opacity="0.35"/>`
  },
  'interventional-pulmonology': {
    alt: 'An illustration of a bronchoscope and instruments beside an airway',
    svg: () => wash('#E9EDF9', '#DAE1F5') + lungs(184, 164, 1.14, { tree: true }) + scope(300, 96, 6) +
      `<g transform="translate(392 196)" stroke="${C.navy}" stroke-width="7" stroke-linecap="round" fill="none">
        <path d="M-34 0h68M-24-22 24 22M-24 22 24-22"/></g>`
  },
  bronchoscopy: {
    alt: 'An illustration of a bronchoscope passing into the airway tree',
    svg: () => wash('#EAEFFA', '#DCE4F6') +
      `<g transform="translate(216 176)">
        <rect x="-11" y="-118" width="22" height="70" rx="11" fill="${C.coralDeep}"/>
        <g stroke="${C.coral}" stroke-width="16" stroke-linecap="round" fill="none">
          <path d="M0-52 0-16M0-24-54 22M0-24 54 22M-54 22-78 62M-54 22-40 68M54 22 78 62M54 22 40 68"/></g>
      </g>` + scope(346, 60, 28) +
      `<circle cx="216" cy="130" r="9" fill="${C.marigold}"/>`
  },
  'pulmonary-function-testing': {
    alt: 'An illustration of a spirometer with a flow-volume trace',
    svg: () => wash('#E9F1F0', '#D7E6E5') +
      `<rect x="72" y="120" width="180" height="122" rx="22" fill="${C.white}"/>
       <rect x="72" y="120" width="180" height="122" rx="22" fill="none" stroke="${C.navy}" stroke-width="6"/>
       ${trace('M96 216c22 0 30-64 52-64s26 56 54 56 28-28 28-28', C.marigold, 6)}
       <path d="M252 150c40-14 68-6 92 18" stroke="${C.navy}" stroke-width="13" fill="none" stroke-linecap="round"/>
       <g transform="translate(372 190) rotate(24)">
         <rect x="-20" y="-34" width="40" height="68" rx="16" fill="${C.navy}"/>
         <rect x="-12" y="-26" width="24" height="30" rx="10" fill="${C.marigoldSoft}"/></g>`
  },
  cpet: {
    alt: 'An illustration of exercise testing with a mask and a heart-rate trace',
    svg: () => wash('#EDE9F7', '#DFD9F1') +
      `<circle cx="176" cy="92" r="38" fill="${C.coral}"/>
       <path d="M150 100c0 22 18 34 26 34s26-12 26-34c0-12-12-18-26-18s-26 6-26 18Z" fill="${C.navy}"/>
       <path d="M176 130c40 0 66 26 72 66H104c6-40 32-66 72-66Z" fill="${C.violet}"/>
       <rect x="120" y="230" width="240" height="20" rx="10" fill="${C.navy}"/>
       <rect x="140" y="250" width="200" height="14" rx="7" fill="${C.navyLight}"/>
       ${trace('M264 120h28l14-34 20 74 16-40h34', C.marigold, 6)}`
  },
  allergy: {
    alt: 'An illustration of pollen drifting from a flower',
    svg: () => wash('#F4F0E4', '#E9E2CE') +
      `<g transform="translate(150 168)">
        <path d="M0 96V4" stroke="${C.green}" stroke-width="9" stroke-linecap="round"/>
        <path d="M0 44c-30-6-42-28-30-46 16-8 30 12 30 30" fill="${C.green}" opacity="0.85"/>
        ${[0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="0" cy="-34" rx="17" ry="30" fill="${C.marigoldSoft}" transform="rotate(${i * 60})"/>`).join('')}
        <circle cx="0" cy="0" r="15" fill="${C.marigold}"/></g>` +
      motes(11, C.marigold, 22, 6) +
      `<g transform="translate(352 158)">
        <path d="M0-56c26 0 44 24 44 56 0 26-18 44-44 44S-44 82-44 56C-44 24-26 0 0-56Z" fill="${C.coral}" opacity="0.55"/>
        <path d="M-16 34c10 8 22 8 32 0" stroke="${C.coralDeep}" stroke-width="5" fill="none" stroke-linecap="round"/></g>`
  },
  'sleep-medicine': {
    alt: 'An illustration of night-time sleep with a breathing mask and a moon',
    svg: () => wash('#2B3566', '#1D2450') +
      `<circle cx="368" cy="76" r="40" fill="${C.cream}"/><circle cx="352" cy="66" r="34" fill="#2B3566"/>
       ${motes(5, C.white, 16, 3)}
       <rect x="60" y="180" width="330" height="26" rx="13" fill="${C.navyLight}"/>
       <rect x="88" y="206" width="70" height="46" rx="10" fill="${C.navyDeep}"/>
       <rect x="292" y="206" width="70" height="46" rx="10" fill="${C.navyDeep}"/>
       <path d="M100 180c0-34 30-58 74-58h130v58Z" fill="${C.violet}"/>
       <circle cx="150" cy="150" r="30" fill="${C.coral}"/>
       <path d="M128 154c0 20 14 30 22 30s22-10 22-30c0-10-10-16-22-16s-22 6-22 16Z" fill="${C.cream}" opacity="0.95"/>
       <path d="M150 168c22 0 26-24 46-24" stroke="${C.marigold}" stroke-width="7" fill="none" stroke-linecap="round"/>`
  },
  'respiratory-infections': {
    alt: 'An illustration of infection particles beside a thermometer',
    svg: () => wash('#F3EAE9', '#E7D7D5') + lungs(178, 160, 1.1, {}) +
      `${[[318, 96, 26], [386, 156, 20], [332, 214, 16]].map(([x, y, r]) => `
        <g transform="translate(${x} ${y})"><circle r="${r}" fill="${C.coralDeep}"/>
        ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<g transform="rotate(${i * 45})"><rect x="-3" y="${-r - 10}" width="6" height="11" rx="3" fill="${C.coralDeep}"/><circle cy="${-r - 12}" r="4" fill="${C.coralDeep}"/></g>`).join('')}
        </g>`).join('')}
       <g transform="translate(262 210) rotate(18)">
         <rect x="-9" y="-72" width="18" height="76" rx="9" fill="${C.white}"/>
         <rect x="-5" y="-40" width="10" height="46" rx="5" fill="${C.marigold}"/>
         <circle cy="16" r="16" fill="${C.marigold}"/></g>`
  },
  'smoking-cessation': {
    alt: 'An illustration of a broken cigarette and a fresh green leaf',
    svg: () => wash('#E7F2EA', '#D5E7DA') +
      `<g transform="translate(150 150) rotate(-14)">
        <rect x="-96" y="-16" width="108" height="32" rx="8" fill="${C.white}"/>
        <rect x="-96" y="-16" width="30" height="32" rx="8" fill="${C.marigoldSoft}"/>
        <rect x="26" y="-16" width="74" height="32" rx="8" fill="${C.white}" transform="rotate(24 26 0)"/>
        <path d="M12-18 22 0 12 18Z" fill="${C.coralDeep}"/></g>
       <g transform="translate(336 168)">
         <path d="M0 84C0 30 34-16 88-30 78 30 46 78 0 84Z" fill="${C.green}"/>
         <path d="M0 84C22 44 50 12 84-26" stroke="${C.cream}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.8"/></g>
       ${motes(19, C.green, 8, 5)}`
  },
  'occupational-lung-disease': {
    alt: 'An illustration of a safety helmet with workplace dust in the air',
    svg: () => wash('#F3EFE3', '#E6DCC7') +
      `<g transform="translate(170 176)">
        <path d="M-76 26c0-52 34-86 76-86s76 34 76 86Z" fill="${C.marigold}"/>
        <path d="M-76 26c0-52 34-86 76-86 6 0 12 1 18 2-34 8-58 42-58 84Z" fill="${C.marigoldSoft}"/>
        <rect x="-96" y="20" width="192" height="22" rx="11" fill="${C.navy}"/>
        <path d="M-24-56c14-6 34-6 48 0" stroke="${C.navy}" stroke-width="7" fill="none" stroke-linecap="round"/></g>
       ${motes(23, C.navyLight, 26, 5)}
       <g transform="translate(374 214)" opacity="0.85">
         <rect x="-54" y="-56" width="96" height="56" fill="${C.navy}"/>
         <path d="M-54-56 -30-84 -6-56ZM-6-56 18-84 42-56Z" fill="${C.navyDeep}"/>
         <rect x="52" y="-104" width="20" height="104" fill="${C.navy}"/>
         <g fill="${C.white}" opacity="0.28">
           <rect x="-44" y="-40" width="18" height="18"/><rect x="-16" y="-40" width="18" height="18"/><rect x="12" y="-40" width="18" height="18"/></g>
         <g stroke="${C.navyLight}" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.5">
           <path d="M62-116c14-8 14 14 28 6"/></g></g>`
  },

  /* ---- procedures ---- */

  'pulmonary-function-test': {
    alt: 'An illustration of a breathing test being performed into a spirometer',
    svg: () => wash('#E9F1F0', '#D7E6E5') +
      `<circle cx="150" cy="112" r="40" fill="${C.coral}"/>
       <path d="M150 152c40 0 66 26 72 74H78c6-48 32-74 72-74Z" fill="${C.navy}"/>
       <path d="M186 122c30-6 44 6 52 22" stroke="${C.navyLight}" stroke-width="13" fill="none" stroke-linecap="round"/>
       <rect x="250" y="122" width="150" height="106" rx="20" fill="${C.white}"/>
       <rect x="250" y="122" width="150" height="106" rx="20" fill="none" stroke="${C.navy}" stroke-width="6"/>
       ${trace('M272 206c18 0 24-56 44-56s22 48 46 48 22-24 22-24', C.marigold, 6)}`
  },
  ebus: {
    alt: 'An illustration of an ultrasound probe examining a lymph node',
    svg: () => wash('#E8EDF9', '#D9E2F5') +
      `<g transform="translate(160 168)">
        <g stroke="${C.coral}" stroke-width="18" stroke-linecap="round" fill="none">
          <path d="M0-70 0-20M0-28-52 16M0-28 52 16"/></g>
        <circle cx="52" cy="16" r="24" fill="${C.violet}"/>
        <circle cx="-52" cy="16" r="18" fill="${C.violet}" opacity="0.6"/></g>
       <g transform="translate(330 150)">
         <rect x="-30" y="-58" width="60" height="92" rx="18" fill="${C.navy}"/>
         <rect x="-20" y="34" width="40" height="14" rx="7" fill="${C.navyDeep}"/>
         ${[26, 44, 62].map((r, i) => `<path d="M${-r} 76a${r} ${r} 0 0 1 ${r * 2} 0" fill="none" stroke="${C.marigold}" stroke-width="5" opacity="${0.9 - i * 0.25}" transform="translate(0 -16)"/>`).join('')}
       </g>`
  },
  cryobiopsy: {
    alt: 'An illustration of a freezing probe taking a tissue sample',
    svg: () => wash('#E6F0F7', '#D3E4F1') +
      `<g transform="translate(160 160)">
        <g stroke="${C.coral}" stroke-width="17" stroke-linecap="round" fill="none">
          <path d="M0-66 0-18M0-26-50 18M0-26 50 18"/></g></g>
       <g transform="translate(338 150)" stroke="${C.teal}" stroke-width="7" stroke-linecap="round">
         ${[0, 60, 120].map((a) => `<g transform="rotate(${a})"><path d="M0-56 0 56"/><path d="M0-56-16-40M0-56 16-40M0 56-16 40M0 56 16 40"/></g>`).join('')}
       </g>
       <rect x="196" y="140" width="118" height="16" rx="8" fill="${C.navy}" transform="rotate(-8 196 140)"/>
       <circle cx="316" cy="150" r="12" fill="${C.white}" opacity="0.9"/>`
  },
  thoracoscopy: {
    alt: 'An illustration of a camera passing between the chest wall and the lung',
    svg: () => wash('#EDEAF7', '#DFDAF0') +
      `<g transform="translate(206 164)">
        <path d="M-118-88C-60-110 60-110 118-88c14 62 14 116 0 176-58 22-178 22-236 0-14-60-14-114 0-176Z" fill="${C.white}" opacity="0.75"/>
        ${[0, 1, 2, 3].map((i) => `<path d="M-116 ${-52 + i * 44}c60-16 172-16 232 0" fill="none" stroke="${C.navyLight}" stroke-width="7" stroke-linecap="round" opacity="0.55"/>`).join('')}
        ${lungs(0, 30, 0.82, {})}
      </g>` + scope(384, 74, 132)
  },
  'lung-nodule-biopsy': {
    alt: 'An illustration of a needle guided towards a small lung nodule',
    svg: () => wash('#F1ECEA', '#E4D8D4') +
      `<circle cx="190" cy="152" r="102" fill="${C.white}" opacity="0.9"/>
       <circle cx="190" cy="152" r="102" fill="none" stroke="${C.navy}" stroke-width="7"/>
       ${lungs(190, 160, 0.84, {})}
       <circle cx="222" cy="136" r="14" fill="${C.marigold}"/>
       <g transform="translate(222 136) rotate(-36)">
         <rect x="8" y="-5" width="150" height="10" rx="5" fill="${C.navy}"/>
         <rect x="150" y="-13" width="52" height="26" rx="9" fill="${C.navyDeep}"/></g>`
  },
  'airway-procedures': {
    alt: 'An illustration of a stent holding a narrowed airway open',
    svg: () => wash('#E9EEF6', '#D9E2F1') +
      `<g transform="translate(240 150)">
        <path d="M-170-52c60 0 60 22 90 22s30-22 90-22v104c-60 0-60-22-90-22s-30 22-90 22Z" fill="${C.coral}" opacity="0.5"/>
        <rect x="-46" y="-56" width="130" height="112" rx="18" fill="none" stroke="${C.navy}" stroke-width="7"/>
        ${[0, 1, 2, 3, 4].map((i) => `<path d="M${-40 + i * 30}-56 ${-10 + i * 30} 56M${-10 + i * 30}-56 ${-40 + i * 30} 56" stroke="${C.navy}" stroke-width="5" opacity="0.75"/>`).join('')}
        <path d="M-46 0h130" stroke="${C.marigold}" stroke-width="6" stroke-linecap="round"/></g>`
  },
  'sleep-study': {
    alt: 'An illustration of overnight sleep monitoring with sensors and a trace',
    svg: () => wash('#2B3566', '#1D2450') +
      `<circle cx="392" cy="66" r="34" fill="${C.cream}"/><circle cx="378" cy="58" r="29" fill="#2B3566"/>
       ${motes(13, C.white, 14, 3)}
       <rect x="52" y="196" width="340" height="24" rx="12" fill="${C.navyLight}"/>
       <path d="M92 196c0-32 28-54 70-54h122v54Z" fill="${C.violet}"/>
       <circle cx="138" cy="164" r="28" fill="${C.coral}"/>
       <g stroke="${C.marigold}" stroke-width="4" fill="none" stroke-linecap="round">
         <path d="M138 136 118 96M150 142 176 104M126 152 92 128"/></g>
       ${[[118, 96], [176, 104], [92, 128]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="${C.marigold}"/>`).join('')}
       ${trace('M232 118h26l12-26 16 56 14-30h84', C.cream, 5)}`
  }
};

/* Which artwork a subject uses. Anything not listed keeps the old stroke icon,
   so adding a topic can never leave a broken image behind. */
export const FOR_TOPIC = {
  asthma: 'asthma', 'severe-asthma': 'severe-asthma', copd: 'copd', ild: 'ild',
  'pulmonary-fibrosis': 'pulmonary-fibrosis', 'lung-cancer': 'lung-cancer',
  'lung-nodules': 'lung-nodules', 'pulmonary-hypertension': 'pulmonary-hypertension',
  'lung-transplantation': 'lung-transplantation',
  'interventional-pulmonology': 'interventional-pulmonology', bronchoscopy: 'bronchoscopy',
  'pulmonary-function-testing': 'pulmonary-function-testing', cpet: 'cpet',
  allergy: 'allergy', 'sleep-medicine': 'sleep-medicine',
  'respiratory-infections': 'respiratory-infections',
  'smoking-cessation': 'smoking-cessation',
  'occupational-lung-disease': 'occupational-lung-disease',
  'pulmonary-function-test': 'pulmonary-function-test', ebus: 'ebus',
  cryobiopsy: 'cryobiopsy', thoracoscopy: 'thoracoscopy',
  'lung-nodule-biopsy': 'lung-nodule-biopsy', 'airway-procedures': 'airway-procedures',
  'sleep-study': 'sleep-study'
};

export function document_(key) {
  const scene = SCENES[key];
  if (!scene) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${scene.svg()}</svg>`;
}
