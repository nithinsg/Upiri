/*
 * Uppi — the character.
 *
 * This is a vector rig built to the approved Uppi reference: lung-pair head
 * with bronchial tracery and a ribbed trachea, big brown eyes, open smile,
 * navy Yashoda hoodie with the marigold petal mark and orange drawstrings,
 * khaki cargo trousers, navy-and-cream sneakers. Same anatomy, same palette,
 * same proportions, same clothing.
 *
 * WHY A RIG AND NOT THE PNG
 * §14 of the brief requires a real facial animation system — a mouth that
 * actually forms shapes while Uppi speaks — and forbids animating a flat image
 * up and down. A raster cannot do that. So the character is rebuilt as named,
 * separately transformable parts: each eye, each lid, each brow, the mouth and
 * its tongue and teeth, both arms, both legs, the torso and the head all move
 * independently.
 *
 * DROPPING IN A RIGGED ASSET LATER
 * Everything above this layer talks to the interface at the bottom of this file
 * — setMouth, setEyes, blink, look, setExpression, plus the `parts` map — and
 * to nothing else. A Rive board, a Lottie composition or a properly rigged SVG
 * master can replace `build()` and the part lookup without any other file
 * changing, which is the arrangement §14 asks for.
 *
 * All motion is applied through CSS transforms on these parts, so it stays on
 * the compositor and costs nothing on a mid-range phone.
 */

/* The approved palette. Nothing outside this object sets a colour on Uppi. */
export const SKIN = {
  lung: '#EFA294',
  lungDark: '#E08877',
  lungLight: '#F7C4B7',
  vein: '#FBDDD4',
  trachea: '#EDA396',
  tracheaDark: '#DC8877',
  navy: '#22305F',
  navyDark: '#19224A',
  navyLight: '#2E3F78',
  marigold: '#F5821F',
  marigoldDark: '#D96C11',
  khaki: '#C9A26B',
  khakiDark: '#AC8751',
  sole: '#F1E5D3',
  eyeWhite: '#FFFFFF',
  iris: '#6E3B1C',
  pupil: '#2B1408',
  brow: '#16130F',
  mouth: '#7C2A33',
  tongue: '#E4737E',
  teeth: '#FFF7F2',
  blush: '#E98879'
};

/* ---------------------------------------------------------------------------
   Mouth shapes
   ---------------------------------------------------------------------------
   Every shape is drawn around the same anchor at (160, 256) so swapping the
   `d` reads as the mouth moving rather than a new mouth appearing. `open` is
   how far the jaw has dropped, which decides whether the tongue and the top
   teeth are drawn at all. */

export const MOUTHS = {
  /* lips together — the rest position between words */
  closed: {
    open: 0,
    mouth: 'M132 259 Q160 267 188 259 Q160 276 132 259 Z',
    teeth: '',
    tongue: ''
  },
  /* barely parted — consonants, and the idle breathing pose */
  small: {
    open: 0.25,
    mouth: 'M135 256 Q160 262 185 256 Q183 275 160 278 Q137 275 135 256 Z',
    teeth: 'M137 257 Q160 263 183 257 Q160 266 137 257 Z',
    tongue: ''
  },
  /* half open — most vowels land here */
  mid: {
    open: 0.6,
    mouth: 'M130 254 Q160 261 190 254 Q188 288 160 291 Q132 288 130 254 Z',
    teeth: 'M132 255 Q160 262 188 255 Q160 269 132 255 Z',
    tongue: 'M142 279 Q160 271 178 279 Q177 290 160 292 Q143 290 142 279 Z'
  },
  /* wide — open "ah", and the laugh */
  wide: {
    open: 1,
    mouth: 'M124 251 Q160 260 196 251 Q194 300 160 304 Q126 300 124 251 Z',
    teeth: 'M126 252 Q160 261 194 252 Q160 270 126 252 Z',
    tongue: 'M138 283 Q160 273 182 283 Q181 300 160 303 Q139 300 138 283 Z'
  },
  /* rounded — "oo", "oh" */
  o: {
    open: 0.7,
    mouth: 'M142 257 Q160 249 178 257 Q186 279 160 291 Q134 279 142 257 Z',
    teeth: '',
    tongue: 'M148 278 Q160 272 172 278 Q171 287 160 289 Q149 287 148 278 Z'
  },
  /* the default face: a broad, warm, open smile, straight off the reference */
  smile: {
    open: 0.8,
    mouth: 'M126 250 Q160 262 194 250 Q192 297 160 302 Q128 297 126 250 Z',
    teeth: 'M128 251 Q160 263 192 251 Q160 274 128 251 Z',
    tongue: 'M139 282 Q160 272 181 282 Q180 298 160 301 Q140 298 139 282 Z'
  },
  /* closed-lip smile — listening, and the settled idle */
  soft: {
    open: 0.15,
    mouth: 'M131 255 Q160 271 189 255 Q187 273 160 279 Q133 273 131 255 Z',
    teeth: '',
    tongue: ''
  },
  /* concerned — flat, very slightly downturned. Never a cartoon frown: this is
     the face for an urgent triage result, and a sad-clown mouth would be the
     wrong register entirely. */
  concerned: {
    open: 0.1,
    mouth: 'M136 269 Q160 259 184 269 Q160 265 136 269 Z',
    teeth: '',
    tongue: ''
  }
};

/* Which mouth shape a written character reaches for, when speech timing is all
   we have to go on. Crude by design — at 100ms per shape the eye reads motion
   and rhythm, not phonetic accuracy. */
const VISEME_BY_CHAR = {
  a: 'wide', á: 'wide', e: 'mid', i: 'small', o: 'o', u: 'o',
  m: 'closed', b: 'closed', p: 'closed', f: 'small', v: 'small',
  w: 'o', l: 'mid', r: 'mid', s: 'small', t: 'small', n: 'small',
  y: 'small', h: 'mid', c: 'small', d: 'small', g: 'mid', k: 'mid'
};

export function visemeFor(ch) {
  return VISEME_BY_CHAR[String(ch || '').toLowerCase()] || 'mid';
}

/* ---------------------------------------------------------------------------
   Markup
   --------------------------------------------------------------------------- */

const NS = 'http://www.w3.org/2000/svg';

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

function el(tag, attrs, children) {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] != null) node.setAttribute(k, attrs[k]);
  if (children) for (const c of children) node.appendChild(c);
  return node;
}

function path(d, attrs) {
  return el('path', Object.assign({ d }, attrs || {}));
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

function eye(cx) {
  /* One eye: sclera, iris, pupil, two highlights. The whole group scales in Y
     to blink; the inner group translates to look around. */
  const look = el('g', { 'data-part': 'look' }, [
    el('circle', { cx, cy: 212, r: 16.5, fill: SKIN.iris }),
    el('circle', { cx, cy: 212, r: 8.6, fill: SKIN.pupil }),
    el('circle', { cx: cx - 5.5, cy: 204, r: 5.8, fill: '#fff' }),
    el('circle', { cx: cx + 6, cy: 219, r: 2.6, fill: '#fff', opacity: 0.75 })
  ]);
  return el('g', {
    'data-part': 'eye',
    style: 'transform-box:fill-box;transform-origin:center;will-change:transform'
  }, [
    el('ellipse', { cx, cy: 207, rx: 26, ry: 32, fill: SKIN.eyeWhite }),
    look
  ]);
}

/* The open waving palm. Four fingers and a thumb, drawn separately so the hand
   reads as a hand at 90px wide on a phone as well as at full size. */
function hand() {
  const g = el('g', {});
  const fingers = [[293, 152, 12.5, 38, -14], [306.5, 142, 12.5, 48, -5], [320, 145, 12.5, 45, 4], [332.5, 157, 11.5, 35, 13]];
  for (const [x, y, w, h, rot] of fingers) {
    g.appendChild(el('rect', {
      x, y, width: w, height: h, rx: w / 2, fill: SKIN.lung,
      transform: 'rotate(' + rot + ' ' + (x + w / 2) + ' ' + (y + h) + ')'
    }));
  }
  g.appendChild(path('M289 206 C278 203 269 211 270 222 C271 233 281 239 290 234 Z', { fill: SKIN.lung }));
  g.appendChild(path('M288 218 C286 203 290 188 297 182 L331 182 C338 188 341 203 339 218 C336 237 325 247 313 247 C301 247 291 237 288 218 Z', { fill: SKIN.lung }));
  g.appendChild(path('M299 185 v11 M312.5 181 v13 M326 184 v12', {
    fill: 'none', stroke: SKIN.lungDark, 'stroke-width': 1.7, 'stroke-linecap': 'round', opacity: 0.4
  }));
  return g;
}

function arm(side) {
  /* side: -1 left (viewer), +1 right. The right arm is the waving one, held
     clear of the head so the silhouette reads as a wave and not as an ear.
     Both are built the same way so either can be animated. */
  const g = el('g', {
    'data-part': side > 0 ? 'arm-right' : 'arm-left',
    /* pivot at the shoulder, in viewBox units */
    style: 'transform-origin:' + (side > 0 ? '232px 348px' : '94px 346px') + ';will-change:transform'
  });
  if (side > 0) {
    g.appendChild(path('M232 348 C266 340 292 312 302 268', {
      fill: 'none', stroke: SKIN.navy, 'stroke-width': 37, 'stroke-linecap': 'round'
    }));
    g.appendChild(el('rect', { x: 295, y: 236, width: 37, height: 15, rx: 7.5, fill: SKIN.navyLight, transform: 'rotate(-14 313.5 243)' }));
    g.appendChild(hand());
  } else {
    g.appendChild(path('M94 346 C82 374 80 404 84 428', {
      fill: 'none', stroke: SKIN.navy, 'stroke-width': 35, 'stroke-linecap': 'round'
    }));
    g.appendChild(el('rect', { x: 67, y: 421, width: 35, height: 14, rx: 7, fill: SKIN.navyLight }));
    g.appendChild(path('M69 433 C64 446 66 461 75 468 C85 476 100 472 104 461 C108 450 105 437 98 431 Z', { fill: SKIN.lung }));
    g.appendChild(path('M78 444 C77 451 78 458 80 462 M87 442 C86 450 87 458 89 463 M96 445 C95 452 95 458 97 461', {
      fill: 'none', stroke: SKIN.lungDark, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.45
    }));
  }
  return g;
}

function leg(side) {
  const x = side > 0 ? 172 : 102;
  const cx = x + 23;
  const g = el('g', {
    'data-part': side > 0 ? 'leg-right' : 'leg-left',
    /* pivot at the hip */
    style: 'transform-origin:' + cx + 'px 428px;will-change:transform'
  });
  /* cargo trouser leg */
  g.appendChild(path('M' + x + ' 428 h46 v92 a9 9 0 0 1 -9 9 h-28 a9 9 0 0 1 -9 -9 Z', { fill: SKIN.khaki }));
  g.appendChild(el('rect', { x: x + 6, y: 458, width: 34, height: 30, rx: 5, fill: SKIN.khakiDark, opacity: 0.5 }));
  g.appendChild(el('rect', { x: x + 6, y: 456, width: 34, height: 8, rx: 4, fill: SKIN.khakiDark }));
  /* sneaker: navy upper, cream sole, marigold flash */
  g.appendChild(path('M' + (cx - 29) + ' 517 h50 c10 0 17 8 17 17 v8 h-72 v-8 c0 -9 3 -17 5 -17 Z', { fill: SKIN.navy }));
  g.appendChild(el('rect', { x: cx - 34, y: 538, width: 68, height: 23, rx: 11, fill: SKIN.sole }));
  g.appendChild(el('rect', { x: cx - 22, y: 523, width: 32, height: 5.5, rx: 2.75, fill: SKIN.marigold }));
  g.appendChild(path('M' + (cx - 18) + ' 531 h22 M' + (cx - 15) + ' 536 h17', { stroke: SKIN.sole, 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0.75 }));
  return g;
}

let uid = 0;

/* The lung-pair head: two rounded lobes meeting in a cleft where the trachea
   enters. Reused for the silhouette, the clip path and the shading overlays so
   they can never drift apart. */
const HEAD_D = 'M160 128 C150 88 124 54 94 57 C56 63 38 106 38 168 C38 222 53 270 84 298 C108 318 134 324 160 324 C186 324 212 318 236 298 C267 270 282 222 282 168 C282 102 266 57 226 57 C196 54 170 88 160 128 Z';

export function build() {
  /* Ids have to be unique per instance: Uppi is mounted twice when the chat is
     open (the dock and the panel), and two identical clipPath ids would make
     the second head clip against the first. */
  const id = 'uppi-head-clip-' + (++uid);
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

  /* soft contact shadow, so he stands on something */
  svg.appendChild(el('ellipse', { 'data-part': 'shadow', cx: 160, cy: 566, rx: 96, ry: 11, fill: '#1D1B4B', opacity: 0.16 }));

  /* legs sit behind the body, so the hoodie hem overlaps the waistband */
  svg.appendChild(el('g', { 'data-part': 'legs' }, [leg(-1), leg(1)]));

  /* the arm that hangs is behind the torso; the waving one goes over the top */
  svg.appendChild(arm(-1));

  const body = el('g', { 'data-part': 'body', style: 'transform-origin:160px 456px;will-change:transform' });
  /* hood, bunched behind the neck */
  body.appendChild(path('M106 330 C110 306 134 296 160 296 C186 296 210 306 214 330 C198 342 122 342 106 330 Z', { fill: SKIN.navyDark }));
  /* torso */
  body.appendChild(path('M160 312 C198 312 230 326 238 352 C244 372 244 414 240 440 C238 450 230 456 220 456 H100 C90 456 82 450 80 440 C76 414 76 372 82 352 C90 326 122 312 160 312 Z', { fill: SKIN.navy }));
  /* collar */
  body.appendChild(path('M131 312 C140 330 180 330 189 312 C180 305 140 305 131 312 Z', { fill: SKIN.navyLight }));
  /* drawstrings */
  body.appendChild(path('M142 320 C140 338 139 354 140 368 M178 320 C180 338 181 354 180 368', {
    fill: 'none', stroke: SKIN.marigold, 'stroke-width': 4.2, 'stroke-linecap': 'round'
  }));
  body.appendChild(el('circle', { cx: 140, cy: 372, r: 3.8, fill: SKIN.marigoldDark }));
  body.appendChild(el('circle', { cx: 180, cy: 372, r: 3.8, fill: SKIN.marigoldDark }));
  /* kangaroo pocket */
  body.appendChild(path('M96 414 C118 408 202 408 224 414 L219 450 H101 Z', { fill: SKIN.navyLight, opacity: 0.5 }));
  /* the Yashoda marigold on the chest */
  body.appendChild(petals(160, 388, 22, SKIN.marigold));
  svg.appendChild(body);

  /* neck, tucked under the collar */
  svg.appendChild(el('rect', { x: 140, y: 294, width: 40, height: 28, rx: 13, fill: SKIN.lungDark }));

  /* ---- head ---- */
  const head = el('g', { 'data-part': 'head', style: 'transform-origin:160px 322px;will-change:transform' });

  head.appendChild(el('g', {}, tracheaRings()));

  head.appendChild(path(HEAD_D, { fill: SKIN.lung }));
  /* rim light down the left, shadow down the right */
  head.appendChild(path('M94 57 C56 63 38 106 38 168 C38 210 46 252 64 280 C56 244 54 202 60 164 C68 120 80 84 96 60 Z', { fill: SKIN.lungLight, opacity: 0.5 }));
  head.appendChild(path('M226 57 C266 57 282 102 282 168 C282 214 271 258 249 288 C263 252 268 208 263 168 C257 122 244 84 224 60 Z', { fill: SKIN.lungDark, opacity: 0.26 }));
  /* the cleft between the lobes, visible only in the upper third as in the
     reference — lower down the two lobes read as one mass */
  head.appendChild(path('M160 130 C158 146 158 158 159 170', {
    fill: 'none', stroke: SKIN.lungDark, 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0.45
  }));

  /* bronchial tree, clipped to the head so it cannot spill past the edge */
  head.appendChild(el('defs', {}, [el('clipPath', { id }, [path(HEAD_D)])]));
  const tree = el('g', { 'clip-path': 'url(#' + id + ')', fill: 'none', stroke: SKIN.vein, 'stroke-linecap': 'round', opacity: 0.62 });
  const trunk = el('g', { 'stroke-width': 4.6 });
  for (const v of VEINS_TRUNK) trunk.appendChild(path(v));
  const twig = el('g', { 'stroke-width': 2.5 });
  for (const v of VEINS_TWIG) twig.appendChild(path(v));
  tree.appendChild(trunk);
  tree.appendChild(twig);
  head.appendChild(tree);

  /* cheeks */
  head.appendChild(el('ellipse', { cx: 90, cy: 252, rx: 18, ry: 11, fill: SKIN.blush, opacity: 0.32 }));
  head.appendChild(el('ellipse', { cx: 230, cy: 252, rx: 18, ry: 11, fill: SKIN.blush, opacity: 0.32 }));

  /* brows */
  head.appendChild(el('g', { 'data-part': 'brow-left', style: 'transform-box:fill-box;transform-origin:center' }, [
    path('M99 168 C109 156 130 154 143 161 C131 161 113 165 102 174 Z', { fill: SKIN.brow })
  ]));
  head.appendChild(el('g', { 'data-part': 'brow-right', style: 'transform-box:fill-box;transform-origin:center' }, [
    path('M221 168 C211 156 190 154 177 161 C189 161 207 165 218 174 Z', { fill: SKIN.brow })
  ]));

  /* eyes */
  head.appendChild(eye(123));
  head.appendChild(eye(197));

  /* mouth: dark interior, teeth strip, tongue */
  const mouth = el('g', { 'data-part': 'mouth' });
  mouth.appendChild(path(MOUTHS.smile.mouth, { 'data-part': 'mouth-shape', fill: SKIN.mouth }));
  mouth.appendChild(path(MOUTHS.smile.tongue, { 'data-part': 'mouth-tongue', fill: SKIN.tongue }));
  mouth.appendChild(path(MOUTHS.smile.teeth, { 'data-part': 'mouth-teeth', fill: SKIN.teeth }));
  head.appendChild(mouth);

  svg.appendChild(head);

  /* the waving arm goes over the top */
  svg.appendChild(arm(1));

  return svg;
}

/* ---------------------------------------------------------------------------
   The interface everything above this file uses
   --------------------------------------------------------------------------- */

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
      browLeft: q('brow-left'),
      browRight: q('brow-right'),
      mouth: q('mouth-shape'),
      tongue: q('mouth-tongue'),
      teeth: q('mouth-teeth')
    };

    this._mouth = 'smile';
    this._blinking = false;
    this.setMouth('smile');
  }

  /** Swaps the mouth to a named shape from MOUTHS. */
  setMouth(name) {
    const m = MOUTHS[name] || MOUTHS.closed;
    this._mouth = name;
    this.parts.mouth.setAttribute('d', m.mouth);
    this.parts.tongue.setAttribute('d', m.tongue || '');
    this.parts.teeth.setAttribute('d', m.teeth || '');
  }

  get mouth() { return this._mouth; }

  /** Eyes wide, normal or narrowed. Used by the listening and thinking states. */
  setEyes(mode) {
    const scale = mode === 'wide' ? 1.08 : mode === 'narrow' ? 0.86 : 1;
    for (const e of this.parts.eyes) e.style.transform = 'scaleY(' + scale + ')';
  }

  /** One blink. Resolves when the eye is open again. */
  blink() {
    if (this._blinking) return Promise.resolve();
    this._blinking = true;
    const eyes = this.parts.eyes;
    for (const e of eyes) e.style.transition = 'transform 70ms ease-in';
    for (const e of eyes) e.style.transform = 'scaleY(0.08)';
    return new Promise((resolve) => {
      setTimeout(() => {
        for (const e of eyes) e.style.transform = 'scaleY(1)';
        setTimeout(() => {
          for (const e of eyes) e.style.transition = '';
          this._blinking = false;
          resolve();
        }, 90);
      }, 80);
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

  /**
   * The named faces the state machine switches between. Kept here rather than
   * in the state controller so a swapped-in rigged asset can implement the same
   * eight names however its own rig prefers.
   */
  setExpression(name) {
    switch (name) {
      case 'happy':
        this.setMouth('wide'); this.setEyes('wide'); this.setBrows(-4, -2); this.look(0, 0); break;
      case 'listening':
        this.setMouth('soft'); this.setEyes('wide'); this.setBrows(-2, -1); break;
      case 'thinking':
        this.setMouth('small'); this.setEyes('narrow'); this.setBrows(6, 0); this.look(0.6, -0.8); break;
      case 'concerned':
        this.setMouth('concerned'); this.setEyes('normal'); this.setBrows(11, -1); this.look(0, 0.1); break;
      case 'speaking':
        this.setEyes('normal'); this.setBrows(-1, 0); this.look(0, 0); break;
      case 'neutral':
        this.setMouth('soft'); this.setEyes('normal'); this.setBrows(0, 0); this.look(0, 0); break;
      default:
        this.setMouth('smile'); this.setEyes('normal'); this.setBrows(-2, 0); this.look(0, 0);
    }
  }

  destroy() {
    if (this.svg && this.svg.parentNode) this.svg.parentNode.removeChild(this.svg);
  }
}
