/*
 * Renders the Knowledge Hub artwork to real image files.
 *
 *   npm run artwork
 *
 * Each scene in `scripts/artwork.mjs` is drawn in a real browser and written to
 * `public/kh/<key>.webp` at 2× for retina. They are committed, so a deploy never
 * depends on this script having been run — it exists to regenerate them when a
 * scene changes or a subject is added.
 *
 * WebP rather than SVG because the point of the exercise was to stop the hub
 * looking like line art: these are pictures the page loads, with alt text and
 * `loading="lazy"`, not glyphs it draws.
 *
 * The encoding is done by Chromium itself, through a canvas — there is no image
 * tool in this build environment, and adding a native dependency to squeeze
 * twenty-five illustrations would be a poor trade. As 24-bit PNG these came to
 * 4.9 MB, which is not a weight to put on a phone in a hospital lobby; the same
 * pictures as WebP are a fraction of that with no visible difference at the
 * size they are shown.
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { SCENES, document_, W, H } from './artwork.mjs';

const OUT = fileURLToPath(new URL('../public/kh/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const keys = Object.keys(SCENES);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });

let written = 0;
for (const key of keys) {
  const svg = document_(key);
  await page.setContent('<!doctype html><meta charset="utf-8"><body>', { waitUntil: 'load' });
  /* draw the SVG into a canvas at 2× and let Chromium encode it */
  const data = await page.evaluate(async ({ w, h, markup }) => {
    const blob = new Blob([markup], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = w * 2;
    canvas.height = h * 2;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/webp', 0.9);
  }, { w: W, h: H, markup: svg });

  if (!data.startsWith('data:image/webp')) throw new Error('this Chromium did not encode WebP');
  writeFileSync(join(OUT, key + '.webp'), Buffer.from(data.split(',')[1], 'base64'));
  written++;
}

await browser.close();

/* clear out any earlier PNG run so the directory only holds what ships */
for (const f of readdirSync(OUT)) if (f.endsWith('.png')) rmSync(join(OUT, f));

const total = readdirSync(OUT).filter((f) => f.endsWith('.webp'))
  .reduce((n, f) => n + statSync(join(OUT, f)).size, 0);
process.stdout.write('wrote ' + written + ' images into public/kh (' + Math.round(total / 1024) + ' KB total)\n');
