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
   --------------------------------------------------------------------------- */

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

/* The lung-pair head: two rounded lobes meeting in a cleft where the trachea
   enters. Reused for the silhouette, the clip path and the shading overlays so
   they can never drift apart. */
const HEAD_D = 'M160 128 C150 88 124 54 94 57 C56 63 38 106 38 168 C38 222 53 270 84 298 C108 318 134 324 160 324 C186 324 212 318 236 298 C267 270 282 222 282 168 C282 102 266 57 226 57 C196 54 170 88 160 128 Z';

/* The bronchial tree. Two symmetric halves branching down and outward from the
   carina, routed around where the eyes sit so the face stays clean. Written out
   rather than generated so it renders identically every time and matches the
   branching in the reference. */
const VEINS_TRUNK = [
  'M160 132 L160 162',
  'M160 158 C138 162 118 170 102 184',
  'M160 158 C182 162 202 170 218 184'
];
const VEINS_TWIG = [
  'M102 184 C88 196 78 210 74 228',
  'M102 184 C96 170 88 160 76 154',
  'M218 184 C232 196 242 210 246 228',
  'M218 184 C224 170 232 160 244 154',
  'M74 228 C70 242 68 256 70 272',
  'M74 228 C82 240 86 252 86 266',
  'M246 228 C250 242 252 256 250 272',
  'M246 228 C238 240 234 252 234 266',
  'M120 168 C116 156 110 146 100 138',
  'M200 168 C204 156 210 146 220 138',
  'M70 272 C68 282 68 290 70 296',
  'M250 272 C252 282 252 290 250 296'
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
  const g = (suffix, stops, attrs) => el('linearGradient', Object.assign({ id: id + '-' + suffix }, attrs || { x1: '0', y1: '0', x2: '0', y2: '1' }),
    stops.map(([offset, color, opacity]) => el('stop', { offset, 'stop-color': color, 'stop-opacity': opacity == null ? 1 : opacity })));
  const r = (suffix, stops, attrs) => el('radialGradient', Object.assign({ id: id + '-' + suffix }, attrs),
    stops.map(([offset, color, opacity]) => el('stop', { offset, 'stop-color': color, 'stop-opacity': opacity == null ? 1 : opacity })));

  return el('defs', {}, [
    /* the head: light falls from the upper left, as it does in the reference */
    r('head', [[0, SKIN.lungLight], [0.5, SKIN.lung], [1, SKIN.lungDark]], { cx: '0.36', cy: '0.26', r: '0.9' }),
    g('hood', [[0, SKIN.navyLight], [0.55, SKIN.navy], [1, SKIN.navyDark]]),
    g('sleeve', [[0, SKIN.navyLight], [1, SKIN.navyDark]], { x1: '0', y1: '0', x2: '1', y2: '1' }),
    g('trouser', [[0, SKIN.khakiLight], [0.45, SKIN.khaki], [1, SKIN.khakiDark]]),
    g('shoe', [[0, SKIN.navyLight], [1, SKIN.navyDeep]]),
    r('iris', [[0, SKIN.irisLight], [1, SKIN.iris]], { cx: '0.4', cy: '0.35', r: '0.75' }),
    r('blush', [[0, SKIN.blush, 0.5], [1, SKIN.blush, 0]], { cx: '0.5', cy: '0.5', r: '0.5' }),
    r('shadow', [[0, '#1D1B4B', 0.32], [0.65, '#1D1B4B', 0.14], [1, '#1D1B4B', 0]], { cx: '0.5', cy: '0.5', r: '0.5' }),
    r('mouthDepth', [[0, SKIN.mouthDeep], [1, SKIN.mouth]], { cx: '0.5', cy: '0.28', r: '0.8' }),
    el('clipPath', { id: id + '-head' }, [path(HEAD_D)]),
    el('clipPath', { id: id + '-torso' }, [path('M160 312 C198 312 230 326 238 352 C244 372 244 414 240 440 C238 450 230 456 220 456 H100 C90 456 82 450 80 440 C76 414 76 372 82 352 C90 326 122 312 160 312 Z')])
  ]);
}

function tracheaRings() {
  /* Ten cartilage rings, tapering very slightly towards the top, seated so the
     lowest ring meets the cleft between the lobes rather than floating above it. */
  const rings = [];
  for (let i = 0; i < 10; i++) {
    const y = 32 + i * 9.6;
    const inset = (9 - i) * 0.5;
    rings.push(el('rect', {
      x: 144 + inset, y, width: 32 - inset * 2, height: 7.4, rx: 3.7,
      fill: SKIN.trachea, stroke: SKIN.tracheaDark, 'stroke-width': 1.5
    }));
    /* a highlight down the left of each ring gives the tube a cylinder's
       roundness instead of reading as a stack of flat bars */
    rings.push(el('rect', { x: 146 + inset, y: y + 1.4, width: 5, height: 4.6, rx: 2.3, fill: SKIN.lungPale, opacity: 0.55 }));
  }
  return rings;
}

function petals(cx, cy, r, fill) {
  /* The Yashoda marigold: eight petals, the same mark the site's brand logo
     uses. Drawn rather than imported so it scales with the character. */
  const g = el('g', { fill });
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 * Math.PI) / 180;
    const px = cx + Math.cos(a) * r * 0.52;
    const py = cy + Math.sin(a) * r * 0.52;
    g.appendChild(el('ellipse', {
      cx: px, cy: py, rx: r * 0.5, ry: r * 0.26,
      transform: 'rotate(' + i * 45 + ' ' + px + ' ' + py + ')'
    }));
  }
  g.appendChild(el('circle', { cx, cy, r: r * 0.19, fill: '#fff', opacity: 0.9 }));
  return g;
}

function eye(cx, id) {
  /*
   * One eye, in four layers: sclera, iris group that translates to look around,
   * a lid that lowers over the top, and the highlights.
   *
   * The lid is the addition that makes tired, sleepy and concerned readable.
   * Blinking used to squash the whole eye vertically, which at small sizes read
   * as the eye shrinking rather than closing.
   */
  const look = el('g', { 'data-part': 'look' }, [
    el('circle', { cx, cy: 212, r: 16.5, fill: 'url(#' + id + '-iris)' }),
    el('circle', { cx, cy: 212, r: 8.6, fill: SKIN.pupil }),
    el('circle', { cx: cx - 5.5, cy: 204, r: 5.8, fill: '#fff' }),
    el('circle', { cx: cx + 6, cy: 219, r: 2.6, fill: '#fff', opacity: 0.75 })
  ]);

  const lid = el('g', {
    'data-part': 'lid',
    style: 'transform-box:fill-box;transform-origin:top;will-change:transform;transform:scaleY(0)'
  }, [
    /* drawn full height and scaled down to nothing when the eye is open, so one
       scaleY drives blink, droop and sleep from the same part */
    el('ellipse', { cx, cy: 207, rx: 26.6, ry: 32.4, fill: SKIN.lung }),
    el('ellipse', { cx, cy: 200, rx: 26.6, ry: 24, fill: SKIN.lungDark, opacity: 0.35 }),
    path('M' + (cx - 21) + ' 233 q21 11 42 0', { fill: 'none', stroke: SKIN.brow, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.85 })
  ]);

  return el('g', {
    'data-part': 'eye',
    style: 'transform-box:fill-box;transform-origin:center;will-change:transform'
  }, [
    el('ellipse', { cx, cy: 207, rx: 26, ry: 32, fill: SKIN.eyeWhite }),
    /* contact shadow where the lid meets the sclera — stops the eye reading as
       a flat white hole */
    el('ellipse', { cx, cy: 188, rx: 24, ry: 12, fill: SKIN.eyeShade, opacity: 0.45 }),
    look,
    lid
  ]);
}

/* ---------------------------------------------------------------------------
   Hands
   --------------------------------------------------------------------------- */

/*
 * Three hands, because a character reads through its hands almost as much as
 * through its face. Each is drawn around its own origin and then placed, so the
 * same generator serves either arm at any angle.
 */
function handOpen() {
  /* the waving palm: four fingers, a thumb, and creases */
  const g = el('g', {});
  const fingers = [[-20, -30, 12.5, 38, -14], [-6.5, -40, 12.5, 48, -5], [7, -37, 12.5, 45, 4], [19.5, -25, 11.5, 35, 13]];
  for (const [x, y, w, h, rot] of fingers) {
    g.appendChild(el('rect', {
      x, y, width: w, height: h, rx: w / 2, fill: SKIN.lung,
      transform: 'rotate(' + rot + ' ' + (x + w / 2) + ' ' + (y + h) + ')'
    }));
  }
  g.appendChild(path('M-24 24 C-35 21 -44 29 -43 40 C-42 51 -32 57 -23 52 Z', { fill: SKIN.lungDark }));
  g.appendChild(path('M-25 36 C-27 21 -23 6 -16 0 L18 0 C25 6 28 21 26 36 C23 55 12 65 0 65 C-12 65 -22 55 -25 36 Z', { fill: SKIN.lung }));
  g.appendChild(path('M-14 3 v11 M-0.5 -1 v13 M13 2 v12', {
    fill: 'none', stroke: SKIN.lungDark, 'stroke-width': 1.7, 'stroke-linecap': 'round', opacity: 0.4
  }));
  return g;
}

function handRelaxed() {
  /* hanging at the side: a soft, slightly curled fist */
  const g = el('g', {});
  g.appendChild(path('M-17 -12 C-6 -20 8 -20 17 -12 C24 -6 25 10 20 20 C14 31 -12 31 -18 20 C-23 10 -23 -6 -17 -12 Z', { fill: SKIN.lung }));
  g.appendChild(path('M-14 -4 C-4 -9 6 -9 15 -4', { fill: 'none', stroke: SKIN.lungDark, 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.45 }));
  g.appendChild(path('M-12 6 h24 M-10 15 h20', { fill: 'none', stroke: SKIN.lungDark, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.32 }));
  g.appendChild(el('ellipse', { cx: -4, cy: -8, rx: 10, ry: 6, fill: SKIN.lungLight, opacity: 0.4 }));
  return g;
}

function handHip() {
  /* on the hip: the thumb forward, fingers wrapping back — the pose that turns
     a standing figure into a relaxed one (§6) */
  const g = el('g', {});
  g.appendChild(path('M-18 -14 C-4 -22 12 -20 20 -10 C26 -2 25 12 18 19 C8 29 -12 28 -18 18 C-24 8 -24 -6 -18 -14 Z', { fill: SKIN.lung }));
  g.appendChild(path('M-14 -12 C-18 -2 -18 10 -13 19', { fill: 'none', stroke: SKIN.lungDark, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.5 }));
  g.appendChild(path('M-2 -18 C6 -12 9 -2 7 8', { fill: 'none', stroke: SKIN.lungDark, 'stroke-width': 1.7, 'stroke-linecap': 'round', opacity: 0.35 }));
  g.appendChild(el('ellipse', { cx: 0, cy: -10, rx: 11, ry: 6, fill: SKIN.lungLight, opacity: 0.38 }));
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
 * Sleeve is a thick round-capped stroke; the cuff and the hand ride at its end.
 */
function armPose(side, name, id) {
  const g = el('g', { 'data-pose': name, style: 'will-change:transform' });
  const sleeve = (d, w) => path(d, { fill: 'none', stroke: 'url(#' + id + '-sleeve)', 'stroke-width': w, 'stroke-linecap': 'round' });

  if (side > 0) {
    if (name === 'wave') {
      g.appendChild(sleeve('M232 348 C266 340 292 312 302 268', 37));
      g.appendChild(el('rect', { x: 295, y: 236, width: 37, height: 15, rx: 7.5, fill: SKIN.navyLight, transform: 'rotate(-14 313.5 243)' }));
      g.appendChild(place(handOpen(), 313, 196, 6));
    } else if (name === 'hip') {
      g.appendChild(sleeve('M230 348 C254 368 258 400 232 424', 36));
      g.appendChild(el('rect', { x: 216, y: 408, width: 34, height: 14, rx: 7, fill: SKIN.navyLight, transform: 'rotate(24 233 415)' }));
      g.appendChild(place(handHip(), 230, 432, -18, -1));
    } else if (name === 'point') {
      g.appendChild(sleeve('M232 348 C262 348 286 336 300 318', 36));
      g.appendChild(el('rect', { x: 288, y: 306, width: 34, height: 14, rx: 7, fill: SKIN.navyLight, transform: 'rotate(-32 305 313)' }));
      g.appendChild(place(handOpen(), 310, 296, 38, 0.94));
    } else {
      /* rest: hanging naturally, elbow very slightly out */
      g.appendChild(sleeve('M232 348 C244 374 248 404 244 430', 36));
      g.appendChild(el('rect', { x: 227, y: 424, width: 34, height: 14, rx: 7, fill: SKIN.navyLight }));
      g.appendChild(place(handRelaxed(), 244, 452, 4));
    }
  } else if (name === 'hip') {
    g.appendChild(sleeve('M90 346 C66 366 62 400 88 424', 36));
    g.appendChild(el('rect', { x: 71, y: 408, width: 34, height: 14, rx: 7, fill: SKIN.navyLight, transform: 'rotate(-24 88 415)' }));
    g.appendChild(place(handHip(), 90, 432, 18));
  } else if (name === 'chin') {
    /* the thinking pose — hand up under the chin */
    /* elbow tucked in, hand under the chin rather than across the face */
    g.appendChild(sleeve('M90 346 C84 332 100 320 124 318', 34));
    g.appendChild(el('rect', { x: 112, y: 311, width: 30, height: 13, rx: 6.5, fill: SKIN.navyLight, transform: 'rotate(-4 127 317)' }));
    g.appendChild(place(handRelaxed(), 140, 316, -14, 0.9));
  } else {
    g.appendChild(sleeve('M90 346 C78 374 76 404 80 430', 35));
    g.appendChild(el('rect', { x: 63, y: 424, width: 34, height: 14, rx: 7, fill: SKIN.navyLight }));
    g.appendChild(place(handRelaxed(), 80, 452, -4));
  }
  return g;
}

function arm(side, poses, id) {
  const g = el('g', {
    'data-part': side > 0 ? 'arm-right' : 'arm-left',
    /* pivot at the shoulder, in viewBox user units */
    style: 'transform-origin:' + (side > 0 ? '232px 348px' : '94px 346px') + ';will-change:transform'
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
  const x = side > 0 ? 172 : 102;
  const cx = x + 23;
  const g = el('g', {
    'data-part': side > 0 ? 'leg-right' : 'leg-left',
    /* pivot at the hip */
    style: 'transform-origin:' + cx + 'px 428px;will-change:transform'
  });
  /* cargo trouser leg */
  g.appendChild(path('M' + x + ' 428 h46 v92 a9 9 0 0 1 -9 9 h-28 a9 9 0 0 1 -9 -9 Z', { fill: 'url(#' + id + '-trouser)' }));
  g.appendChild(el('rect', { x: x + 6, y: 458, width: 34, height: 30, rx: 5, fill: SKIN.khakiDark, opacity: 0.5 }));
  g.appendChild(el('rect', { x: x + 6, y: 456, width: 34, height: 8, rx: 4, fill: SKIN.khakiDark }));
  /* a fold at the knee, so the leg has a front and a side */
  g.appendChild(path('M' + (x + 3) + ' 500 q23 6 40 0', { fill: 'none', stroke: SKIN.khakiDark, 'stroke-width': 2, opacity: 0.35, 'stroke-linecap': 'round' }));
  /* sneaker: navy upper, cream sole, marigold flash */
  g.appendChild(path('M' + (cx - 29) + ' 517 h50 c10 0 17 8 17 17 v8 h-72 v-8 c0 -9 3 -17 5 -17 Z', { fill: 'url(#' + id + '-shoe)' }));
  g.appendChild(el('rect', { x: cx - 34, y: 538, width: 68, height: 23, rx: 11, fill: SKIN.sole }));
  g.appendChild(el('rect', { x: cx - 34, y: 546, width: 68, height: 8, rx: 4, fill: '#DFCFB8', opacity: 0.55 }));
  g.appendChild(el('rect', { x: cx - 22, y: 523, width: 32, height: 5.5, rx: 2.75, fill: SKIN.marigold }));
  g.appendChild(path('M' + (cx - 18) + ' 531 h22 M' + (cx - 15) + ' 536 h17', { stroke: SKIN.sole, 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0.75 }));
  return g;
}

/* ---------------------------------------------------------------------------
   Assembly
   --------------------------------------------------------------------------- */

export function build() {
  const id = 'uppi-' + (++uid);
  const svg = el('svg', {
    viewBox: '0 0 372 572',
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
  svg.appendChild(el('ellipse', { 'data-part': 'shadow', cx: 160, cy: 562, rx: 104, ry: 15, fill: 'url(#' + id + '-shadow)' }));

  /* legs sit behind the body, so the hoodie hem overlaps the waistband */
  svg.appendChild(el('g', { 'data-part': 'legs' }, [leg(-1, id), leg(1, id)]));

  const body = el('g', { 'data-part': 'body', style: 'transform-origin:160px 456px;will-change:transform' });
  /* hood, bunched behind the neck */
  body.appendChild(path('M106 330 C110 306 134 296 160 296 C186 296 210 306 214 330 C198 342 122 342 106 330 Z', { fill: SKIN.navyDeep }));
  /* torso */
  body.appendChild(path('M160 312 C198 312 230 326 238 352 C244 372 244 414 240 440 C238 450 230 456 220 456 H100 C90 456 82 450 80 440 C76 414 76 372 82 352 C90 326 122 312 160 312 Z', { fill: 'url(#' + id + '-hood)' }));

  /* everything below is clipped to the torso, so no shading can spill */
  const shade = el('g', { 'clip-path': 'url(#' + id + '-torso)' });
  /* the shadow the head casts on the chest — the single biggest depth cue */
  shade.appendChild(el('ellipse', { cx: 160, cy: 318, rx: 84, ry: 30, fill: SKIN.navyDeep, opacity: 0.55 }));
  /* light down the left edge, shadow down the right */
  shade.appendChild(path('M80 352 C88 326 118 312 160 312 L160 456 H100 C90 456 82 450 80 440 Z', { fill: SKIN.navyLight, opacity: 0.18 }));
  shade.appendChild(path('M238 352 C230 326 200 312 160 312 L160 456 H220 C230 456 238 450 240 440 Z', { fill: SKIN.navyDeep, opacity: 0.22 }));
  /* hem */
  shade.appendChild(el('rect', { x: 76, y: 442, width: 168, height: 16, fill: SKIN.navyDeep, opacity: 0.4 }));
  body.appendChild(shade);

  /* collar */
  body.appendChild(path('M131 312 C140 330 180 330 189 312 C180 305 140 305 131 312 Z', { fill: SKIN.navyLight }));
  /* drawstrings */
  body.appendChild(path('M142 320 C140 338 139 354 140 368 M178 320 C180 338 181 354 180 368', {
    fill: 'none', stroke: SKIN.marigold, 'stroke-width': 4.2, 'stroke-linecap': 'round'
  }));
  body.appendChild(el('circle', { cx: 140, cy: 372, r: 3.8, fill: SKIN.marigoldDark }));
  body.appendChild(el('circle', { cx: 180, cy: 372, r: 3.8, fill: SKIN.marigoldDark }));
  /* kangaroo pocket */
  body.appendChild(path('M96 414 C118 408 202 408 224 414 L219 450 H101 Z', { fill: SKIN.navyLight, opacity: 0.45 }));
  body.appendChild(path('M96 414 C118 408 202 408 224 414', { fill: 'none', stroke: SKIN.navyDeep, 'stroke-width': 2.2, opacity: 0.5 }));
  /* the Yashoda marigold on the chest */
  body.appendChild(petals(160, 388, 22, SKIN.marigold));
  svg.appendChild(body);

  /* neck, tucked under the collar */
  svg.appendChild(el('rect', { x: 140, y: 292, width: 40, height: 28, rx: 13, fill: SKIN.lungDark }));

  /* ---- head ---- */
  const head = el('g', { 'data-part': 'head', style: 'transform-origin:160px 322px;will-change:transform' });

  head.appendChild(el('g', {}, tracheaRings()));

  head.appendChild(path(HEAD_D, { fill: 'url(#' + id + '-head)' }));

  const face = el('g', { 'clip-path': 'url(#' + id + '-head)' });
  /* rim light down the left, shadow down the right and along the lower edge */
  face.appendChild(path('M94 57 C56 63 38 106 38 168 C38 210 46 252 64 280 C56 244 54 202 60 164 C68 120 80 84 96 60 Z', { fill: SKIN.lungLight, opacity: 0.55 }));
  face.appendChild(path('M226 57 C266 57 282 102 282 168 C282 214 271 258 249 288 C263 252 268 208 263 168 C257 122 244 84 224 60 Z', { fill: SKIN.lungDark, opacity: 0.3 }));
  face.appendChild(el('ellipse', { cx: 160, cy: 332, rx: 120, ry: 30, fill: SKIN.lungDark, opacity: 0.22 }));
  /* the cleft between the lobes, visible only in the upper third as in the
     reference — lower down the two lobes read as one mass */
  face.appendChild(path('M160 130 C158 146 158 158 159 170', {
    fill: 'none', stroke: SKIN.lungDeep, 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0.4
  }));
  face.appendChild(path('M160 128 C152 140 150 156 151 172', {
    fill: 'none', stroke: SKIN.lungLight, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.5
  }));

  /* bronchial tree, clipped to the head so it cannot spill past the edge */
  const tree = el('g', { fill: 'none', stroke: SKIN.vein, 'stroke-linecap': 'round', opacity: 0.62 });
  const trunk = el('g', { 'stroke-width': 4.6 });
  for (const v of VEINS_TRUNK) trunk.appendChild(path(v));
  const twig = el('g', { 'stroke-width': 2.5 });
  for (const v of VEINS_TWIG) twig.appendChild(path(v));
  tree.appendChild(trunk);
  tree.appendChild(twig);
  face.appendChild(tree);
  head.appendChild(face);

  /* cheeks */
  head.appendChild(el('ellipse', { cx: 90, cy: 252, rx: 22, ry: 14, fill: 'url(#' + id + '-blush)' }));
  head.appendChild(el('ellipse', { cx: 230, cy: 252, rx: 22, ry: 14, fill: 'url(#' + id + '-blush)' }));

  /* brows */
  head.appendChild(el('g', { 'data-part': 'brow-left', style: 'transform-box:fill-box;transform-origin:center;will-change:transform' }, [
    path('M99 168 C109 156 130 154 143 161 C131 161 113 165 102 174 Z', { fill: SKIN.brow })
  ]));
  head.appendChild(el('g', { 'data-part': 'brow-right', style: 'transform-box:fill-box;transform-origin:center;will-change:transform' }, [
    path('M221 168 C211 156 190 154 177 161 C189 161 207 165 218 174 Z', { fill: SKIN.brow })
  ]));

  /* eyes */
  head.appendChild(eye(123, id));
  head.appendChild(eye(197, id));

  /* mouth: dark interior, tongue, teeth. The group scales to round or widen the
     lips without redrawing the shape. */
  const mouth = el('g', {
    'data-part': 'mouth',
    style: 'transform-box:fill-box;transform-origin:center;will-change:transform'
  });
  mouth.appendChild(path(MOUTHS.smile.mouth, { 'data-part': 'mouth-shape', fill: 'url(#' + id + '-mouthDepth)' }));
  mouth.appendChild(path(MOUTHS.smile.tongue, { 'data-part': 'mouth-tongue', fill: SKIN.tongue }));
  mouth.appendChild(path(MOUTHS.smile.teeth, { 'data-part': 'mouth-teeth', fill: SKIN.teeth }));
  head.appendChild(mouth);

  svg.appendChild(head);

  /* Both arms sit in front of the torso and the head. The far arm used to be
     drawn behind the body, which meant the thinking pose — a hand raised to the
     chin — was completely hidden by the head it was supposed to be resting on. */
  svg.appendChild(arm(-1, ['hip', 'rest', 'chin'], id));
  svg.appendChild(arm(1, ['rest', 'wave', 'hip', 'point'], id));

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
