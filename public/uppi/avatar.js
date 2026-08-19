/*
 * Uppi — the character rig.
 *
 * Built to the approved Uppi reference and nothing else: lung-pair head with
 * bronchial tracery and a ribbed trachea, big brown eyes under dark brows, open
 * friendly smile, navy Yashoda hoodie with the marigold petal mark and orange
 * drawstrings, khaki cargo trousers, navy-and-cream sneakers. Same anatomy,
 * same palette, same proportions, same clothes. Nothing here redesigns him.
 *
 * WHY A RIG AND NOT THE FLAT ARTWORK
 * §18 requires a mouth that forms real viseme shapes while he speaks, §19–20
 * require attentive listening and thinking faces, and §8 requires him to droop
 * and doze. A raster cannot do any of it. So the character is assembled from
 * named, separately transformable parts — each eye, its lid, each brow, the
 * mouth with its tongue and teeth, both arms with switchable hand poses, both
 * legs, the torso and the head.
 *
 * THREE THINGS THAT MAKE IT READ AS A CHARACTER RATHER THAN A DIAGRAM
 *   1. POSES, NOT ONE FIXED SHAPE. Each arm carries several pre-built poses and
 *      shows one. The previous rig drew the right arm permanently raised, which
 *      is why Uppi appeared to wave forever: it was not the animation, it was
 *      the geometry. `setPose` now switches hand-on-hip, relaxed, waving,
 *      thinking and pointing.
 *   2. DEPTH. Every large surface carries a gradient and an occlusion shadow —
 *      under the hood, under the chin, inside the cleft, beneath the hem. Flat
 *      fills are what made the old rig read as clip art.
 *   3. EYELIDS. Real lids that can hood, droop and close, so tired, sleeping and
 *      concerned are different faces rather than the same face at three sizes.
 *
 * DROPPING IN A RIVE BOARD LATER
 * Everything above this file talks to the interface at the bottom — setMouth,
 * setViseme, setEyes, setLids, blink, look, setBrows, setExpression, setPose —
 * and to the `parts` map, and to nothing else. The state machine in states.js
 * drives those inputs by name, exactly as it would drive Rive state-machine
 * inputs, so replacing `build()` with a .riv board is a one-file change. Keep
 * that boundary intact.
 *
 * All motion is CSS transforms on these parts, so it stays on the compositor.
 */

/* The approved palette. Nothing outside this object sets a colour on Uppi. */
export const SKIN = {
  lung: '#EFA294',
  lungDark: '#E08877',
  lungDeep: '#C9705F',
  lungLight: '#F7C4B7',
  lungPale: '#FBDDD4',
  vein: '#FBDDD4',
  trachea: '#EDA396',
  tracheaDark: '#DC8877',
  navy: '#22305F',
  navyDark: '#19224A',
  navyDeep: '#121A38',
  navyLight: '#2E3F78',
  marigold: '#F5821F',
  marigoldDark: '#D96C11',
  marigoldLight: '#FCA14E',
  khaki: '#C9A26B',
  khakiDark: '#AC8751',
  khakiLight: '#DCBB8A',
  sole: '#F1E5D3',
  eyeWhite: '#FFFFFF',
  eyeShade: '#E8DCE2',
  iris: '#6E3B1C',
  irisLight: '#9A5C2E',
  pupil: '#2B1408',
  brow: '#16130F',
  mouth: '#7C2A33',
  mouthDeep: '#5E1D25',
  tongue: '#E4737E',
  teeth: '#FFF7F2',
  blush: '#E98879'
};

/* ---------------------------------------------------------------------------
   Mouth shapes — the viseme set (§18)
   ---------------------------------------------------------------------------
   Ten speech shapes plus the expression mouths. Every one is drawn around the
   same anchor at (160, 256), so swapping the `d` reads as the mouth moving
   rather than as a new mouth appearing.

   `open` is how far the jaw has dropped, which decides whether the tongue and
   the upper teeth are drawn at all. `lipRound` and `lipWide` let the motion
   layer stretch the whole mouth group without redrawing it, which is what makes
   the difference between "oo" and "ee" legible at 110px on a phone. */

export const MOUTHS = {
  /* ---- speech ---- */

  /* neutral / rest between words — lips together */
  neutral: {
    open: 0, lipRound: 1, lipWide: 1,
    mouth: 'M132 259 Q160 267 188 259 Q160 276 132 259 Z', teeth: '', tongue: ''
  },
  /* M, B, P — pressed together, very slightly compressed */
  mbp: {
    open: 0, lipRound: 0.94, lipWide: 0.96,
    mouth: 'M134 258 Q160 264 186 258 Q160 273 134 258 Z', teeth: '', tongue: ''
  },
  /* A, E, I — the workhorse open vowel */
  ai: {
    open: 0.7, lipRound: 1, lipWide: 1.06,
    mouth: 'M128 253 Q160 261 192 253 Q190 292 160 296 Q130 292 128 253 Z',
    teeth: 'M130 254 Q160 262 190 254 Q160 270 130 254 Z',
    tongue: 'M140 281 Q160 272 180 281 Q179 293 160 295 Q141 293 140 281 Z'
  },
  /* a wider variant for stressed open vowels — "ah" */
  aa: {
    open: 1, lipRound: 1, lipWide: 1.1,
    mouth: 'M124 251 Q160 260 196 251 Q194 300 160 304 Q126 300 124 251 Z',
    teeth: 'M126 252 Q160 261 194 252 Q160 270 126 252 Z',
    tongue: 'M138 283 Q160 273 182 283 Q181 300 160 303 Q139 300 138 283 Z'
  },
  /* O — rounded and open */
  o: {
    open: 0.7, lipRound: 0.88, lipWide: 0.9,
    mouth: 'M142 257 Q160 249 178 257 Q186 279 160 291 Q134 279 142 257 Z',
    teeth: '',
    tongue: 'M148 278 Q160 272 172 278 Q171 287 160 289 Q149 287 148 278 Z'
  },
  /* U — tighter and pushed forward */
  u: {
    open: 0.45, lipRound: 0.74, lipWide: 0.78,
    mouth: 'M147 259 Q160 253 173 259 Q178 274 160 282 Q142 274 147 259 Z',
    teeth: '', tongue: ''
  },
  /* F, V — lower lip drawn under the top teeth */
  fv: {
    open: 0.2, lipRound: 1, lipWide: 1.02,
    mouth: 'M134 256 Q160 262 186 256 Q184 270 160 272 Q136 270 134 256 Z',
    teeth: 'M137 257 Q160 264 183 257 Q160 268 137 257 Z',
    tongue: ''
  },
  /* L — jaw part-open, tongue tip visible at the ridge */
  l: {
    open: 0.5, lipRound: 1, lipWide: 1.02,
    mouth: 'M132 255 Q160 262 188 255 Q186 285 160 288 Q134 285 132 255 Z',
    teeth: 'M134 256 Q160 263 186 256 Q160 268 134 256 Z',
    tongue: 'M150 266 Q160 258 170 266 Q170 280 160 282 Q150 280 150 266 Z'
  },
  /* S, SH, CH, J — narrow, teeth close, corners drawn in */
  sh: {
    open: 0.22, lipRound: 0.84, lipWide: 0.88,
    mouth: 'M140 257 Q160 262 180 257 Q179 273 160 276 Q141 273 140 257 Z',
    teeth: 'M142 258 Q160 264 178 258 Q160 269 142 258 Z',
    tongue: ''
  },
  /* TH — tongue tip between the teeth */
  th: {
    open: 0.35, lipRound: 1, lipWide: 1,
    mouth: 'M134 256 Q160 262 186 256 Q184 278 160 281 Q136 278 134 256 Z',
    teeth: 'M136 257 Q160 263 184 257 Q160 267 136 257 Z',
    tongue: 'M148 262 Q160 256 172 262 Q172 272 160 274 Q148 272 148 262 Z'
  },

  /* ---- expressions ---- */

  /* the default face: the broad warm open smile from the reference */
  smile: {
    open: 0.8, lipRound: 1, lipWide: 1.04,
    mouth: 'M126 250 Q160 262 194 250 Q192 297 160 302 Q128 297 126 250 Z',
    teeth: 'M128 251 Q160 263 192 251 Q160 274 128 251 Z',
    tongue: 'M139 282 Q160 272 181 282 Q180 298 160 301 Q140 298 139 282 Z'
  },
  /* closed-lip smile — listening, and the settled idle */
  soft: {
    open: 0.15, lipRound: 1, lipWide: 1,
    mouth: 'M131 255 Q160 271 189 255 Q187 273 160 279 Q133 273 131 255 Z', teeth: '', tongue: ''
  },
  /* small — thinking, and the breathing idle */
  small: {
    open: 0.25, lipRound: 0.96, lipWide: 0.96,
    mouth: 'M135 256 Q160 262 185 256 Q183 275 160 278 Q137 275 135 256 Z',
    teeth: 'M137 257 Q160 263 183 257 Q160 266 137 257 Z', tongue: ''
  },
  /* concerned — flat, very slightly downturned. Never a cartoon frown: this is
     the face for an urgent triage result, and a sad-clown mouth would be the
     wrong register entirely. */
  concerned: {
    open: 0.1, lipRound: 1, lipWide: 0.98,
    mouth: 'M136 269 Q160 259 184 269 Q160 265 136 269 Z', teeth: '', tongue: ''
  },
  /* a yawn, for the tired state */
  yawn: {
    open: 1, lipRound: 0.8, lipWide: 0.84,
    mouth: 'M136 250 Q160 244 184 250 Q194 292 160 302 Q126 292 136 250 Z',
    teeth: 'M139 252 Q160 250 181 252 Q160 262 139 252 Z',
    tongue: 'M146 282 Q160 272 174 282 Q173 298 160 300 Q147 298 146 282 Z'
  }
};

/* Legacy shape names kept as aliases so nothing that already asks for them
   breaks: the motion layer, the tests and any saved state all still work. */
MOUTHS.closed = MOUTHS.neutral;
MOUTHS.mid = MOUTHS.ai;
MOUTHS.wide = MOUTHS.aa;

/*
 * Which viseme a written character reaches for. Used when the only timing
 * available is character-level — either the browser voice's boundary events or
 * a provider's character timestamps (§18). Crude by design: at ~90ms a shape the
 * eye reads rhythm and closure, not phonetic accuracy.
 */
const VISEME_BY_CHAR = {
  a: 'aa', á: 'aa', e: 'ai', i: 'ai', y: 'ai',
  o: 'o', u: 'u', w: 'u',
  m: 'mbp', b: 'mbp', p: 'mbp',
  f: 'fv', v: 'fv',
  l: 'l',
  s: 'sh', z: 'sh', c: 'sh', j: 'sh', x: 'sh',
  t: 'th', d: 'th', n: 'th',
  r: 'ai', h: 'ai', g: 'ai', k: 'ai', q: 'u'
};

/* Digraphs read before single letters, so "sh", "ch" and "th" get their own
   shape instead of collapsing onto the first letter. */
const VISEME_BY_PAIR = { sh: 'sh', ch: 'sh', th: 'th', ph: 'fv', wh: 'u', qu: 'u', ng: 'ai' };

export function visemeFor(ch, next) {
  const a = String(ch || '').toLowerCase();
  if (next) {
    const pair = VISEME_BY_PAIR[a + String(next).toLowerCase()];
    if (pair) return pair;
  }
  if (/\s/.test(a) || a === '') return 'neutral';
  return VISEME_BY_CHAR[a] || 'ai';
}

/**
 * Turns a whole string into a viseme schedule: one entry per shape change, with
 * the fraction of the utterance at which it should appear. The speech layer
 * scales it against real audio timing.
 */
export function visemeSchedule(text) {
  const s = String(text || '');
  const out = [];
  let last = null;
  for (let i = 0; i < s.length; i++) {
    if (!/[a-z]/i.test(s[i])) {
      /* a pause closes the mouth, which is what makes speech read as words
         rather than as a flapping jaw */
      if (/[\s.,;:!?]/.test(s[i]) && last !== 'neutral') { out.push({ at: i / s.length, viseme: 'neutral' }); last = 'neutral'; }
      continue;
    }
    const v = visemeFor(s[i], s[i + 1]);
    if (v === last) continue;
    out.push({ at: i / s.length, viseme: v });
    last = v;
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Markup
   ---------------------------------------------------------------------------
   Coordinates are taken from the approved reference render, in a viewBox of
   0 0 372 660 — the reference's own proportions. The character is 3.2 heads
   tall with the lung mass filling the top third, which is what makes him read
   as Uppi rather than as a generic mascot: get the head-to-body ratio wrong and
   nothing else rescues it.

   Landmarks, so a later change can stay in register:

     trachea      x 186, y 22 → 132, ten rings
     lung mass    x 72 → 300, y 105 → 314 (wider than tall, as in the reference)
     eyes         centres (146, 214) and (226, 214)
     mouth        anchor (186, 264)
     shoulders    (110, 356) and (262, 356)
     hoodie hem   y 496
     hips         (149, 496) and (223, 496)
     ground       y 648
*/

const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs, children) {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] != null) node.setAttribute(k, attrs[k]);
  if (children) for (const c of children) node.appendChild(c);
  return node;
}

function path(d, attrs) {
  return el('path', Object.assign({ d }, attrs || {}));
}

/*
 * The two lobes are separate shapes meeting at the centre line. Drawn apart
 * rather than as one silhouette because each needs its own radial gradient to
 * bulge — a single gradient across the pair flattens the middle, which is the
 * first thing that makes a character look printed rather than modelled.
 */
const LOBE_LEFT = 'M186 148 C184 122 172 104 148 101 C110 98 74 134 72 184 C70 226 82 262 104 284 C126 304 156 312 186 312 Z';
const LOBE_RIGHT = 'M186 148 C188 122 200 104 224 101 C262 98 298 134 300 184 C302 226 290 262 268 284 C246 304 216 312 186 312 Z';
/* the pair, for clipping and for the contact shadow under the chin */
const HEAD_D = 'M186 148 C184 122 172 104 148 101 C110 98 74 134 72 184 C70 226 82 262 104 284 C126 304 156 312 186 312 C216 312 246 304 268 284 C290 262 302 226 300 184 C298 134 262 98 224 101 C200 104 188 122 186 148 Z';

/*
 * The bronchial tree. Two mirrored halves branching down and outward from the
 * carina, routed clear of the eyes and the mouth so the face stays readable.
 * Written out rather than generated so it renders identically every time and
 * matches the branching in the reference.
 */
const VEINS_TRUNK = [
  'M186 134 L186 160',
  'M186 158 C166 168 146 178 128 192',
  'M186 158 C206 168 226 178 244 192'
];
const VEINS_TWIG = [
  /* left lobe */
  'M128 192 C112 176 100 160 92 144',
  'M128 192 C118 212 110 234 106 254',
  'M106 254 C100 268 96 280 96 292',
  'M106 254 C112 268 116 280 118 290',
  'M92 144 C86 134 82 126 80 118',
  'M92 144 C86 150 80 158 78 166',
  'M118 192 C108 182 98 174 86 168',
  /* right lobe */
  'M244 192 C260 176 272 160 280 144',
  'M244 192 C254 212 262 234 266 254',
  'M266 254 C272 268 276 280 276 292',
  'M266 254 C260 268 256 280 254 290',
  'M280 144 C286 134 290 126 292 118',
  'M280 144 C286 150 292 158 294 166',
  'M254 192 C264 182 274 174 286 168'
];

let uid = 0;

/*
 * Gradients and soft shadows.
 *
 * This is most of what separates a character from clip art, and it is cheap:
 * every one is a paint server evaluated once by the rasteriser, not a filter
 * re-run per frame. Ids are per instance because Uppi is mounted twice when the
 * panel is open (the dock and the panel) and duplicate ids would make the
 * second instance paint with the first one's definitions.
 */
function defs(id) {
  const lin = (suffix, stops, attrs) => el('linearGradient', Object.assign({ id: id + '-' + suffix }, attrs || { x1: '0', y1: '0', x2: '0', y2: '1' }),
    stops.map(([offset, color, opacity]) => el('stop', { offset, 'stop-color': color, 'stop-opacity': opacity == null ? 1 : opacity })));
  const rad = (suffix, stops, attrs) => el('radialGradient', Object.assign({ id: id + '-' + suffix }, attrs),
    stops.map(([offset, color, opacity]) => el('stop', { offset, 'stop-color': color, 'stop-opacity': opacity == null ? 1 : opacity })));

  return el('defs', {}, [
    /* Each lobe lit from the upper left, with a deeper falloff towards the
       centre line than towards the rim — which is what reads as two rounded
       masses meeting rather than one flat blob. */
    rad('lobeL', [[0, '#F8C7B9'], [0.3, SKIN.lungLight], [0.66, SKIN.lung], [1, SKIN.lungDeep]], { cx: '0.34', cy: '0.3', r: '0.84' }),
    rad('lobeR', [[0, '#F8C6B9'], [0.36, SKIN.lungLight], [0.74, SKIN.lung], [1, SKIN.lungDeep]], { cx: '0.44', cy: '0.28', r: '0.88' }),
    lin('trachea', [[0, SKIN.lungPale], [0.28, SKIN.trachea], [1, SKIN.tracheaDark]], { x1: '0', y1: '0', x2: '1', y2: '0' }),
    lin('hood', [[0, SKIN.navyLight], [0.42, SKIN.navy], [1, SKIN.navyDark]]),
    lin('sleeve', [[0, SKIN.navyLight], [0.55, SKIN.navy], [1, SKIN.navyDeep]], { x1: '0', y1: '0', x2: '1', y2: '1' }),
    lin('trouser', [[0, SKIN.khakiLight], [0.4, SKIN.khaki], [1, SKIN.khakiDark]]),
    lin('shoe', [[0, SKIN.navyLight], [1, SKIN.navyDeep]]),
    lin('sole', [[0, '#FFFAF2'], [1, '#DCCBB4']]),
    rad('hand', [[0, SKIN.lungLight], [0.6, SKIN.lung], [1, SKIN.lungDark]], { cx: '0.36', cy: '0.3', r: '0.85' }),
    rad('iris', [[0, SKIN.irisLight], [0.55, SKIN.iris], [1, '#4A2510']], { cx: '0.38', cy: '0.32', r: '0.78' }),
    rad('blush', [[0, SKIN.blush, 0.55], [1, SKIN.blush, 0]], { cx: '0.5', cy: '0.5', r: '0.5' }),
    rad('shadow', [[0, '#1D1B4B', 0.34], [0.6, '#1D1B4B', 0.15], [1, '#1D1B4B', 0]], { cx: '0.5', cy: '0.5', r: '0.5' }),
    rad('mouthDepth', [[0, SKIN.mouthDeep], [1, SKIN.mouth]], { cx: '0.5', cy: '0.26', r: '0.82' }),
    el('clipPath', { id: id + '-lobeL' }, [path(LOBE_LEFT)]),
    el('clipPath', { id: id + '-lobeR' }, [path(LOBE_RIGHT)]),
    el('clipPath', { id: id + '-head' }, [path(HEAD_D)]),
    el('clipPath', { id: id + '-torso' }, [path(TORSO_D)])
  ]);
}

/* The hoodie body. Square shoulders softened at the corners, straight sides,
   a hem that sits just below the hips. */
const TORSO_D = 'M186 330 C224 330 254 340 264 358 C272 374 274 420 272 466 C271 484 264 494 250 494 H122 C108 494 101 484 100 466 C98 420 100 374 108 358 C118 340 148 330 186 330 Z';

function tracheaRings() {
  /* Ten cartilage rings, tapering slightly towards the top, seated so the
     lowest ring is swallowed by the cleft between the lobes rather than
     floating above it. A highlight down the left of each gives the tube a
     cylinder's roundness instead of a stack of flat bars. */
  const g = el('g', {});
  for (let i = 0; i < 9; i++) {
    const y = 40 + i * 12.4;
    const inset = (7 - i) * 0.7;
    const x = 162 + inset;
    const w = 48 - inset * 2;
    g.appendChild(el('rect', { x, y, width: w, height: 9.6, rx: 4.8, fill: 'url(#' + TRACHEA_ID.id + '-trachea)' }));
    g.appendChild(el('rect', { x: x + 4, y: y + 1.8, width: 7.5, height: 6, rx: 3, fill: SKIN.lungPale, opacity: 0.6 }));
    g.appendChild(el('rect', { x, y: y + 8.8, width: w, height: 2.4, rx: 1.2, fill: SKIN.lungDeep, opacity: 0.26 }));
  }
  return g;
}

/* `tracheaRings` needs the instance id for its gradient; passing it through
   every call site would be noise, so the builder sets it for the duration of
   one build. Builds are synchronous, so there is nothing to race with. */
const TRACHEA_ID = { id: '' };

function petals(cx, cy, r, fill) {
  /* The Yashoda marigold: eight petals, the same mark the site's brand logo
     uses. Drawn rather than imported so it scales with the character. */
  const g = el('g', { fill });
  for (let i = 0; i < 9; i++) {
    const a = (i * 45 * Math.PI) / 180;
    const px = cx + Math.cos(a) * r * 0.52;
    const py = cy + Math.sin(a) * r * 0.52;
    g.appendChild(el('ellipse', {
      cx: px, cy: py, rx: r * 0.5, ry: r * 0.26,
      transform: 'rotate(' + i * 45 + ' ' + px + ' ' + py + ')'
    }));
  }
  g.appendChild(el('circle', { cx, cy, r: r * 0.19, fill: '#fff', opacity: 0.92 }));
  return g;
}

/*
 * One eye, drawn around its own origin and then placed.
 *
 * Four layers: sclera, an iris group that translates to look around, a lid that
 * lowers over the top, and the highlights. The placement transform lives on an
 * outer group because the animated groups drive `style.transform`, and a CSS
 * transform replaces the presentation attribute rather than composing with it —
 * so placing and animating on the same element would make the eye jump to the
 * origin the moment it blinked.
 */
function eye(cx, cy, id) {
  const look = el('g', { 'data-part': 'look' }, [
    el('circle', { cx: 0, cy: 2, r: 21.5, fill: 'url(#' + id + '-iris)' }),
    el('circle', { cx: 0, cy: 3, r: 10.5, fill: SKIN.pupil }),
    el('circle', { cx: -8, cy: -9, r: 8, fill: '#fff' }),
    el('circle', { cx: 9, cy: 11, r: 3.8, fill: '#fff', opacity: 0.8 })
  ]);

  const lid = el('g', {
    'data-part': 'lid',
    style: 'transform-box:fill-box;transform-origin:top;will-change:transform;transform:scaleY(0)'
  }, [
    /* drawn full height and scaled down to nothing when the eye is open, so one
       scaleY drives blink, droop and sleep from the same part */
    el('ellipse', { cx: 0, cy: 0, rx: 31.4, ry: 34.4, fill: SKIN.lung }),
    el('ellipse', { cx: 0, cy: -7, rx: 31.4, ry: 26, fill: SKIN.lungDark, opacity: 0.32 }),
    path('M-22 25 q22 12 44 0', { fill: 'none', stroke: SKIN.brow, 'stroke-width': 3.2, 'stroke-linecap': 'round', opacity: 0.85 })
  ]);

  const eyeball = el('g', {
    'data-part': 'eye',
    style: 'transform-box:fill-box;transform-origin:center;will-change:transform'
  }, [
    el('ellipse', { cx: 0, cy: 0, rx: 30.5, ry: 33.5, fill: SKIN.eyeWhite }),
    /* contact shadow where the lid meets the sclera — stops the eye reading as
       a flat white hole */
    el('ellipse', { cx: 0, cy: -19, rx: 28, ry: 13, fill: SKIN.eyeShade, opacity: 0.5 }),
    look,
    lid
  ]);

  return el('g', { transform: 'translate(' + cx + ' ' + cy + ')' }, [eyeball]);
}

/* ---------------------------------------------------------------------------
   Hands
   --------------------------------------------------------------------------- */

/*
 * Three hands, because a character reads through its hands almost as much as
 * through its face. Each is drawn around its own origin and then placed, so the
 * same generator serves either arm at any angle.
 */
function handOpen(id) {
  /* the waving palm of the reference: four fingers spread, thumb out, creases */
  const g = el('g', {});
  const fill = 'url(#' + id + '-hand)';
  const fingers = [[-23, -36, 14, 42, -15], [-7, -47, 14, 53, -4], [8, -44, 14, 50, 6], [22, -30, 13, 40, 15]];
  for (const [x, y, w, h, rot] of fingers) {
    g.appendChild(el('rect', {
      x, y, width: w, height: h, rx: w / 2, fill,
      transform: 'rotate(' + rot + ' ' + (x + w / 2) + ' ' + (y + h) + ')'
    }));
  }
  /* thumb */
  g.appendChild(path('M-27 22 C-40 18 -50 27 -49 40 C-48 53 -36 60 -26 54 Z', { fill }));
  /* palm */
  g.appendChild(path('M-28 34 C-30 17 -25 1 -17 -6 L20 -6 C29 1 32 17 30 34 C27 55 15 66 1 66 C-13 66 -25 55 -28 34 Z', { fill }));
  g.appendChild(path('M-15 -2 v12 M0 -6 v14 M15 -3 v13', {
    fill: 'none', stroke: SKIN.lungDark, 'stroke-width': 1.9, 'stroke-linecap': 'round', opacity: 0.38
  }));
  g.appendChild(el('ellipse', { cx: -4, cy: 22, rx: 16, ry: 12, fill: SKIN.lungLight, opacity: 0.3 }));
  return g;
}

function handRelaxed(id) {
  /* hanging at the side: a soft, slightly curled fist */
  const g = el('g', {});
  const fill = 'url(#' + id + '-hand)';
  g.appendChild(path('M-19 -14 C-7 -23 9 -23 19 -14 C27 -7 28 11 22 22 C16 34 -13 34 -20 22 C-26 11 -26 -7 -19 -14 Z', { fill }));
  g.appendChild(path('M-16 -5 C-4 -10 7 -10 17 -5', { fill: 'none', stroke: SKIN.lungDark, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.42 }));
  g.appendChild(path('M-13 7 h26 M-11 17 h22', { fill: 'none', stroke: SKIN.lungDark, 'stroke-width': 1.7, 'stroke-linecap': 'round', opacity: 0.3 }));
  return g;
}

function handHip(id) {
  /* on the hip: thumb forward, fingers wrapping back — the pose that turns a
     standing figure into a relaxed one (§6) */
  const g = el('g', {});
  const fill = 'url(#' + id + '-hand)';
  g.appendChild(path('M-20 -16 C-5 -25 13 -22 22 -11 C29 -2 28 13 20 21 C9 32 -13 31 -20 20 C-27 9 -27 -7 -20 -16 Z', { fill }));
  g.appendChild(path('M-15 -13 C-20 -2 -20 11 -14 21', { fill: 'none', stroke: SKIN.lungDark, 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0.45 }));
  g.appendChild(path('M-2 -20 C7 -13 10 -2 8 9', { fill: 'none', stroke: SKIN.lungDark, 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.32 }));
  return g;
}

/*
 * The phone Uppi holds out when he offers to have someone ring you (§15).
 *
 * Drawn rather than mimed: an empty raised hand reads as a wave, and the whole
 * point of the pose is that the offer is legible before the text is. Navy body,
 * lit screen, in the ŪPIRI palette so it belongs to him rather than looking
 * like a stock icon.
 */
function phone() {
  const g = el('g', {});
  g.appendChild(el('rect', { x: -17, y: -30, width: 34, height: 58, rx: 7, fill: SKIN.navyDeep }));
  g.appendChild(el('rect', { x: -14, y: -26, width: 28, height: 46, rx: 4, fill: '#8FA6D8' }));
  g.appendChild(el('rect', { x: -14, y: -26, width: 28, height: 20, rx: 4, fill: '#B9C9EC', opacity: 0.7 }));
  /* a marigold call button, so the screen reads as a call rather than a slab */
  g.appendChild(el('circle', { cx: 0, cy: 10, r: 6.4, fill: SKIN.marigold }));
  g.appendChild(el('rect', { x: -5, y: 22, width: 10, height: 2.6, rx: 1.3, fill: '#8FA6D8' }));
  return g;
}

function place(node, x, y, rot, scale) {
  return el('g', { transform: 'translate(' + x + ' ' + y + ') rotate(' + (rot || 0) + ') scale(' + (scale == null ? 1 : scale) + ')' }, [node]);
}

/* ---------------------------------------------------------------------------
   Arms — built as switchable poses (§6)
   --------------------------------------------------------------------------- */

/*
 * Each arm holds every pose it can take, and shows exactly one. This is the fix
 * for the single most visible defect in the previous character: the right arm
 * was DRAWN raised with an open palm, so Uppi waved for as long as the page was
 * open. Now `rest` and `hip` are the defaults and `wave` is a pose he enters and
 * leaves.
 *
 * The sleeve is a thick round-capped stroke; the cuff and the hand ride at its
 * end.
 */
function armPose(side, name, id) {
  const g = el('g', { 'data-pose': name, style: 'will-change:transform' });
  const sleeve = (d, w) => path(d, { fill: 'none', stroke: 'url(#' + id + '-sleeve)', 'stroke-width': w, 'stroke-linecap': 'round' });
  const cuff = (x, y, rot) => el('rect', { x: x - 19, y: y - 8, width: 38, height: 16, rx: 8, fill: SKIN.navyLight, transform: rot ? 'rotate(' + rot + ' ' + x + ' ' + y + ')' : null });

  if (side > 0) {
    if (name === 'wave') {
      g.appendChild(sleeve('M262 356 C302 350 324 320 328 276', 42));
      g.appendChild(cuff(329, 266, -6));
      g.appendChild(place(handOpen(id), 331, 214, 8, 0.95));
    } else if (name === 'hip') {
      g.appendChild(sleeve('M260 356 C288 378 292 418 262 444', 41));
      g.appendChild(cuff(266, 434, 26));
      g.appendChild(place(handHip(id), 258, 458, -20, -1));
    } else if (name === 'phone') {
      /* held up beside the shoulder, screen towards the visitor */
      g.appendChild(sleeve('M262 356 C298 352 318 330 322 300', 42));
      g.appendChild(cuff(323, 292, -12));
      g.appendChild(place(handRelaxed(id), 325, 268, -8, 0.95));
      g.appendChild(place(phone(), 330, 250, 8));
    } else if (name === 'point') {
      g.appendChild(sleeve('M262 356 C296 356 322 342 338 320', 41));
      g.appendChild(cuff(340, 315, -34));
      g.appendChild(place(handOpen(id), 352, 296, 40, 0.95));
    } else {
      /* rest: hanging naturally, elbow very slightly out */
      g.appendChild(sleeve('M262 356 C278 388 282 424 278 456', 41));
      g.appendChild(cuff(278, 452, 4));
      g.appendChild(place(handRelaxed(id), 279, 480, 4));
    }
  } else if (name === 'hip') {
    g.appendChild(sleeve('M112 356 C90 380 86 420 104 446', 41));
    g.appendChild(cuff(104, 442, -16));
    g.appendChild(place(handHip(id), 100, 464, 16, 0.84));
  } else if (name === 'chin') {
    /* The thinking pose — hand up against the cheek. Under the chin it was
       swallowed by the head, which on a character this top-heavy is most of the
       silhouette; against the cheek it reads at dock size (§20). */
    g.appendChild(sleeve('M112 356 C96 332 90 298 98 274', 40));
    g.appendChild(cuff(99, 270, 8));
    g.appendChild(place(handRelaxed(id), 101, 250, -12, 0.9));
  } else {
    g.appendChild(sleeve('M112 356 C96 388 92 424 96 456', 40));
    g.appendChild(cuff(96, 452, -4));
    g.appendChild(place(handRelaxed(id), 95, 480, -4));
  }
  return g;
}

function arm(side, poses, id) {
  const g = el('g', {
    'data-part': side > 0 ? 'arm-right' : 'arm-left',
    /* pivot at the shoulder, in viewBox user units */
    style: 'transform-origin:' + (side > 0 ? '262px 356px' : '112px 356px') + ';will-change:transform'
  });
  for (const p of poses) {
    const pose = armPose(side, p, id);
    /* `display` rather than the `hidden` attribute: `hidden` is an HTML global
       and SVG elements do not honour it, so every pose stayed on screen at once
       — which is exactly how the old rig ended up waving permanently. */
    if (p !== poses[0]) pose.style.display = 'none';
    g.appendChild(pose);
  }
  return g;
}

function leg(side, id) {
  const cx = side > 0 ? 224 : 148;
  const x = cx - 34;
  const g = el('g', {
    'data-part': side > 0 ? 'leg-right' : 'leg-left',
    /* pivot at the hip */
    style: 'transform-origin:' + cx + 'px 490px;will-change:transform'
  });
  /* cargo trouser leg */
  g.appendChild(path('M' + x + ' 486 h68 v106 a12 12 0 0 1 -12 12 h-44 a12 12 0 0 1 -12 -12 Z', { fill: 'url(#' + id + '-trouser)' }));
  /* the cargo pocket of the reference: a flap on the outer thigh */
  const px = side > 0 ? cx + 3 : cx - 31;
  g.appendChild(el('rect', { x: px, y: 524, width: 30, height: 34, rx: 5, fill: SKIN.khakiDark, opacity: 0.42 }));
  g.appendChild(el('rect', { x: px - 1, y: 520, width: 32, height: 10, rx: 4, fill: SKIN.khakiDark, opacity: 0.85 }));
  /* folds, so the leg has a front and a side */
  g.appendChild(path('M' + (x + 4) + ' 572 q29 7 58 0', { fill: 'none', stroke: SKIN.khakiDark, 'stroke-width': 2.2, opacity: 0.3, 'stroke-linecap': 'round' }));
  g.appendChild(path('M' + (x + 6) + ' 500 q27 6 54 0', { fill: 'none', stroke: SKIN.khakiDark, 'stroke-width': 2, opacity: 0.22, 'stroke-linecap': 'round' }));

  /* sneaker: navy upper, cream toe cap and sole, marigold flash */
  g.appendChild(path('M' + (cx - 30) + ' 596 h44 c12 0 20 9 20 19 v7 h-70 v-8 c0 -10 2 -18 6 -18 Z', { fill: 'url(#' + id + '-shoe)' }));
  /* cream toe cap */
  g.appendChild(path('M' + (cx + 18) + ' 600 c12 2 18 10 18 16 v6 h-22 Z', { fill: SKIN.sole, opacity: 0.95 }));
  g.appendChild(el('rect', { x: cx - 34, y: 620, width: 68, height: 24, rx: 12, fill: 'url(#' + id + '-sole)' }));
  g.appendChild(el('rect', { x: cx - 26, y: 602, width: 34, height: 6, rx: 3, fill: SKIN.marigold }));
  g.appendChild(path('M' + (cx - 22) + ' 611 h26 M' + (cx - 18) + ' 617 h20', { stroke: SKIN.sole, 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.8 }));
  return g;
}

/* ---------------------------------------------------------------------------
   Assembly
   --------------------------------------------------------------------------- */

export function build() {
  const id = 'uppi-' + (++uid);
  TRACHEA_ID.id = id;

  const svg = el('svg', {
    viewBox: '0 0 372 660',
    xmlns: NS,
    'data-uppi': 'avatar',
    role: 'img',
    focusable: 'false',
    /* §25: the animated character needs a text alternative, not silence */
    'aria-label': 'Uppi, a friendly pair of lungs in a navy Yashoda hoodie'
  });
  const title = el('title');
  title.textContent = 'Uppi, your lung partner';
  svg.appendChild(title);
  svg.appendChild(defs(id));

  /* soft contact shadow, so he stands on something rather than floating */
  svg.appendChild(el('ellipse', { 'data-part': 'shadow', cx: 186, cy: 648, rx: 112, ry: 16, fill: 'url(#' + id + '-shadow)' }));

  /* legs sit behind the body, so the hoodie hem overlaps the waistband */
  svg.appendChild(el('g', { 'data-part': 'legs' }, [leg(-1, id), leg(1, id)]));

  const body = el('g', { 'data-part': 'body', style: 'transform-origin:186px 494px;will-change:transform' });
  /* hood, bunched behind the neck */
  body.appendChild(path('M126 350 C130 322 156 310 186 310 C216 310 242 322 246 350 C228 364 144 364 126 350 Z', { fill: SKIN.navyDeep }));
  /* torso */
  body.appendChild(path(TORSO_D, { fill: 'url(#' + id + '-hood)' }));

  /* everything below is clipped to the torso, so no shading can spill */
  const shade = el('g', { 'clip-path': 'url(#' + id + '-torso)' });
  /* the shadow the head casts on the chest — the single biggest depth cue */
  shade.appendChild(el('ellipse', { cx: 186, cy: 336, rx: 96, ry: 34, fill: SKIN.navyDeep, opacity: 0.6 }));
  /* light down the left edge, shadow down the right */
  shade.appendChild(path('M100 358 C110 340 148 330 186 330 L186 494 H122 C108 494 101 484 100 466 Z', { fill: SKIN.navyLight, opacity: 0.16 }));
  shade.appendChild(path('M272 358 C262 340 224 330 186 330 L186 494 H250 C264 494 271 484 272 466 Z', { fill: SKIN.navyDeep, opacity: 0.24 }));
  /* hem */
  shade.appendChild(el('rect', { x: 96, y: 478, width: 180, height: 18, fill: SKIN.navyDeep, opacity: 0.42 }));
  body.appendChild(shade);

  /* collar */
  body.appendChild(path('M154 330 C164 350 208 350 218 330 C208 322 164 322 154 330 Z', { fill: SKIN.navyLight }));
  /* drawstrings */
  /* short, and stopping well clear of the petal mark — run them down to it and
     the two read as one pendant rather than as drawstrings and a badge */
  body.appendChild(path('M168 338 C166 352 165 364 166 376 M204 338 C206 352 207 364 206 376', {
    fill: 'none', stroke: SKIN.marigold, 'stroke-width': 4.6, 'stroke-linecap': 'round'
  }));
  body.appendChild(el('circle', { cx: 166, cy: 380, r: 4.2, fill: SKIN.marigoldDark }));
  body.appendChild(el('circle', { cx: 206, cy: 380, r: 4.2, fill: SKIN.marigoldDark }));
  /* kangaroo pocket */
  body.appendChild(path('M114 444 C140 438 232 438 258 444 L252 488 H120 Z', { fill: SKIN.navyLight, opacity: 0.42 }));
  body.appendChild(path('M114 444 C140 438 232 438 258 444', { fill: 'none', stroke: SKIN.navyDeep, 'stroke-width': 2.4, opacity: 0.5 }));
  /* the Yashoda marigold on the chest */
  body.appendChild(petals(186, 420, 27, SKIN.marigold));
  svg.appendChild(body);

  /* neck, tucked under the collar */
  svg.appendChild(el('rect', { x: 168, y: 300, width: 36, height: 26, rx: 13, fill: SKIN.lungDark }));

  /* ---- head ---- */
  const head = el('g', { 'data-part': 'head', style: 'transform-origin:186px 320px;will-change:transform' });

  /* the trachea goes in first: its base belongs behind the cleft */
  head.appendChild(tracheaRings());

  /*
   * ONE mass, not two balloons. Drawing the lobes as separate filled shapes put
   * a hard gradient seam straight down the middle of the face, which read as a
   * peanut rather than as a pair of lungs. The reference has a cleft in the top
   * third only: below that the lobes are one form, and the separation is
   * carried by shading rather than by an edge.
   */
  head.appendChild(path(HEAD_D, { fill: 'url(#' + id + '-lobeL)' }));

  const face = el('g', { 'clip-path': 'url(#' + id + '-head)' });
  /* each lobe gets its own soft highlight, so the pair still bulges */
  face.appendChild(el('ellipse', { cx: 118, cy: 158, rx: 44, ry: 30, fill: '#FFF3ED', opacity: 0.3, transform: 'rotate(-24 118 158)' }));
  face.appendChild(el('ellipse', { cx: 252, cy: 156, rx: 40, ry: 26, fill: '#FFF3ED', opacity: 0.22, transform: 'rotate(20 252 156)' }));
  /* and its own falloff towards the rim */
  face.appendChild(path('M72 184 C70 226 82 262 104 284 C92 244 88 208 92 170 Z', { fill: SKIN.lungDeep, opacity: 0.16 }));
  face.appendChild(path('M300 184 C302 226 290 262 268 284 C280 244 284 208 280 170 Z', { fill: SKIN.lungDeep, opacity: 0.2 }));
  /* the cleft — top third only */
  face.appendChild(path('M186 150 C184 164 183 176 184 190', {
    fill: 'none', stroke: SKIN.lungDeep, 'stroke-width': 3.4, 'stroke-linecap': 'round', opacity: 0.3
  }));
  face.appendChild(path('M187 148 C190 162 191 174 190 188', {
    fill: 'none', stroke: '#FFEDE5', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0.5
  }));
  /* the shadow the chin casts down onto the hoodie */
  face.appendChild(el('ellipse', { cx: 186, cy: 324, rx: 116, ry: 24, fill: SKIN.lungDeep, opacity: 0.22 }));

  /* bronchial tree, clipped to the head so it cannot spill past the edge */
  const tree = el('g', { fill: 'none', stroke: SKIN.vein, 'stroke-linecap': 'round', opacity: 0.62 });
  const trunk = el('g', { 'stroke-width': 4.6 });
  for (const v of VEINS_TRUNK) trunk.appendChild(path(v));
  const twig = el('g', { 'stroke-width': 2.4 });
  for (const v of VEINS_TWIG) twig.appendChild(path(v));
  tree.appendChild(trunk);
  tree.appendChild(twig);
  face.appendChild(tree);
  head.appendChild(face);

  /* cheeks */
  head.appendChild(el('ellipse', { cx: 108, cy: 258, rx: 26, ry: 16, fill: 'url(#' + id + '-blush)' }));
  head.appendChild(el('ellipse', { cx: 264, cy: 258, rx: 26, ry: 16, fill: 'url(#' + id + '-blush)' }));

  /* brows — thick, dark and arched, as in the reference */
  head.appendChild(el('g', { 'data-part': 'brow-left', style: 'transform-box:fill-box;transform-origin:center;will-change:transform' }, [
    path('M114 166 C122 146 148 138 174 148 C177 149 178 153 175 155 C170 152 158 150 147 152 C133 155 123 162 118 172 C116 176 112 173 114 166 Z', { fill: SKIN.brow })
  ]));
  head.appendChild(el('g', { 'data-part': 'brow-right', style: 'transform-box:fill-box;transform-origin:center;will-change:transform' }, [
    path('M258 166 C250 146 224 138 198 148 C195 149 194 153 197 155 C202 152 214 150 225 152 C239 155 249 162 254 172 C256 176 260 173 258 166 Z', { fill: SKIN.brow })
  ]));

  /* eyes */
  head.appendChild(eye(146, 214, id));
  head.appendChild(eye(226, 214, id));

  /*
   * The mouth shapes are all drawn around (160, 256) — the anchor every viseme
   * in MOUTHS shares. Placing the group rather than redrawing fifteen paths is
   * what keeps the viseme set and its tests intact while the face moves and
   * grows: translate so that anchor lands at (186, 264), scaled up 1.18 to the
   * reference's mouth size.
   */
  const mouth = el('g', {
    'data-part': 'mouth',
    style: 'transform-box:fill-box;transform-origin:center;will-change:transform'
  });
  mouth.appendChild(path(MOUTHS.smile.mouth, { 'data-part': 'mouth-shape', fill: 'url(#' + id + '-mouthDepth)' }));
  mouth.appendChild(path(MOUTHS.smile.tongue, { 'data-part': 'mouth-tongue', fill: SKIN.tongue }));
  mouth.appendChild(path(MOUTHS.smile.teeth, { 'data-part': 'mouth-teeth', fill: SKIN.teeth }));
  head.appendChild(el('g', { transform: 'translate(-2.8 -38.1) scale(1.18)' }, [mouth]));

  svg.appendChild(head);

  /* Both arms sit in front of the torso and the head. The far arm used to be
     drawn behind the body, which meant the thinking pose — a hand raised to the
     chin — was completely hidden by the head it was supposed to be resting on. */
  svg.appendChild(arm(-1, ['hip', 'rest', 'chin'], id));
  svg.appendChild(arm(1, ['rest', 'wave', 'hip', 'point', 'phone'], id));

  return svg;
}
/* ---------------------------------------------------------------------------
   The interface everything above this file uses
   ---------------------------------------------------------------------------
   states.js drives these by name the way it would drive Rive state-machine
   inputs. Nothing above this file touches the SVG. */

export class UppiAvatar {
  constructor(host) {
    this.svg = build();
    host.appendChild(this.svg);
    const q = (name) => this.svg.querySelector('[data-part="' + name + '"]');
    const qa = (name) => Array.from(this.svg.querySelectorAll('[data-part="' + name + '"]'));

    this.parts = {
      svg: this.svg,
      head: q('head'),
      body: q('body'),
      legs: q('legs'),
      legLeft: q('leg-left'),
      legRight: q('leg-right'),
      armLeft: q('arm-left'),
      armRight: q('arm-right'),
      shadow: q('shadow'),
      eyes: qa('eye'),
      looks: qa('look'),
      lids: qa('lid'),
      browLeft: q('brow-left'),
      browRight: q('brow-right'),
      mouthGroup: q('mouth'),
      mouth: q('mouth-shape'),
      tongue: q('mouth-tongue'),
      teeth: q('mouth-teeth')
    };

    this._mouth = 'smile';
    this._blinking = false;
    this._lid = 0;
    this._pose = { left: 'hip', right: 'rest' };
    this.setMouth('smile');
  }

  /* ---------------- mouth ---------------- */

  /** Swaps the mouth to a named shape from MOUTHS. */
  setMouth(name) {
    const m = MOUTHS[name] || MOUTHS.neutral;
    this._mouth = name;
    this.parts.mouth.setAttribute('d', m.mouth);
    this.parts.tongue.setAttribute('d', m.tongue || '');
    this.parts.teeth.setAttribute('d', m.teeth || '');
    /* rounding and widening are done with a transform rather than more paths:
       it is what makes "oo" and "ee" tell apart at 110px on a phone */
    this.parts.mouthGroup.style.transform = 'scale(' + (m.lipWide == null ? 1 : m.lipWide) + ',' + (m.lipRound == null ? 1 : m.lipRound) + ')';
  }

  /** Speech-driven shape. Identical to setMouth, named for what drives it. */
  setViseme(name) { this.setMouth(name); }

  get mouth() { return this._mouth; }

  /* ---------------- eyes ---------------- */

  /** Eyes wide, normal or narrowed. Used by the listening and thinking states. */
  setEyes(mode) {
    const scale = mode === 'wide' ? 1.08 : mode === 'narrow' ? 0.86 : 1;
    for (const e of this.parts.eyes) e.style.transform = 'scaleY(' + scale + ')';
  }

  /**
   * How far the lids are lowered, 0 (open) … 1 (shut). This is what makes the
   * difference between alert, heavy-lidded and asleep — three states §8 needs
   * and which squashing the whole eye could never express.
   */
  setLids(amount, ms) {
    const a = Math.max(0, Math.min(1, amount));
    this._lid = a;
    for (const l of this.parts.lids) {
      l.style.transition = ms ? 'transform ' + ms + 'ms ease' : '';
      l.style.transform = 'scaleY(' + a + ')';
    }
  }

  get lids() { return this._lid; }

  /** One blink. Resolves when the eye is open again. */
  blink() {
    if (this._blinking) return Promise.resolve();
    this._blinking = true;
    const resting = this._lid;
    const lids = this.parts.lids;
    for (const l of lids) l.style.transition = 'transform 70ms ease-in';
    for (const l of lids) l.style.transform = 'scaleY(1)';
    return new Promise((resolve) => {
      setTimeout(() => {
        for (const l of lids) l.style.transform = 'scaleY(' + resting + ')';
        setTimeout(() => {
          for (const l of lids) l.style.transition = '';
          this._blinking = false;
          resolve();
        }, 100);
      }, 85);
    });
  }

  /** Moves the pupils. x and y are −1…1; (0,0) is looking straight at you. */
  look(x, y) {
    const dx = Math.max(-1, Math.min(1, x)) * 5;
    const dy = Math.max(-1, Math.min(1, y)) * 4;
    for (const l of this.parts.looks) l.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  }

  /** Brow angle in degrees; positive raises the inner ends (worry). */
  setBrows(deg, lift) {
    const y = lift || 0;
    this.parts.browLeft.style.transform = 'translateY(' + y + 'px) rotate(' + deg + 'deg)';
    this.parts.browRight.style.transform = 'translateY(' + y + 'px) rotate(' + -deg + 'deg)';
  }

  /* ---------------- body ---------------- */

  /**
   * Switches an arm to one of its built poses (§6).
   *
   * left:  hip | rest | chin
   * right: rest | wave | hip | point
   */
  setPose(side, name) {
    const arm = side === 'left' ? this.parts.armLeft : this.parts.armRight;
    if (!arm) return;
    let found = false;
    for (const child of arm.children) {
      const match = child.getAttribute('data-pose') === name;
      if (match) found = true;
      child.style.display = match ? '' : 'none';
    }
    /* an unknown pose would otherwise leave him with no arm at all */
    if (!found && arm.firstElementChild) arm.firstElementChild.style.display = '';
    this._pose[side] = found ? name : this._pose[side];
  }

  get pose() { return { left: this._pose.left, right: this._pose.right }; }

  /**
   * The named faces the behaviour layer switches between. Kept here rather than
   * in the state controller so a swapped-in rigged asset can implement the same
   * names however its own rig prefers.
   */
  setExpression(name) {
    switch (name) {
      case 'happy':
        this.setMouth('smile'); this.setEyes('wide'); this.setBrows(-4, -2); this.setLids(0, 180); this.look(0, 0); break;
      case 'listening':
        this.setMouth('soft'); this.setEyes('wide'); this.setBrows(-2, -1); this.setLids(0, 180); break;
      case 'thinking':
        this.setMouth('small'); this.setEyes('narrow'); this.setBrows(6, 0); this.setLids(0.12, 200); this.look(0.6, -0.8); break;
      case 'curious':
        this.setMouth('soft'); this.setEyes('wide'); this.setBrows(-6, -2); this.setLids(0, 180); break;
      case 'concerned':
        this.setMouth('concerned'); this.setEyes('normal'); this.setBrows(11, -1); this.setLids(0, 180); this.look(0, 0.1); break;
      case 'caring':
        this.setMouth('soft'); this.setEyes('normal'); this.setBrows(5, -1); this.setLids(0, 180); this.look(0, 0); break;
      case 'tired':
        this.setMouth('soft'); this.setEyes('normal'); this.setBrows(3, 2); this.setLids(0.45, 420); this.look(0, 0.35); break;
      case 'asleep':
        this.setMouth('neutral'); this.setEyes('normal'); this.setBrows(2, 3); this.setLids(1, 620); break;
      case 'speaking':
        this.setEyes('normal'); this.setBrows(-1, 0); this.setLids(0, 160); this.look(0, 0); break;
      case 'neutral':
        this.setMouth('soft'); this.setEyes('normal'); this.setBrows(0, 0); this.setLids(0, 180); this.look(0, 0); break;
      default:
        this.setMouth('smile'); this.setEyes('normal'); this.setBrows(-2, 0); this.setLids(0, 180); this.look(0, 0);
    }
  }

  destroy() {
    if (this.svg && this.svg.parentNode) this.svg.parentNode.removeChild(this.svg);
  }
}
