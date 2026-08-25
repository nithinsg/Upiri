/*
 * One page, two shapes.
 *
 * `public/lungscan/index.html` is the real subpage and the single source of
 * truth. The Artifact preview needs the same page WITHOUT a document skeleton —
 * the publisher supplies its own <!doctype>/<head>/<body> — so rather than keep
 * two copies in step by hand, this lifts the marked regions out of the live
 * page and writes the preview copy.
 *
 *   node scripts/lungscan-artifact.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../public/lungscan/index.html', import.meta.url));
const out = fileURLToPath(new URL('../prototypes/lungscan.html', import.meta.url));
const page = await readFile(src, 'utf8');

const grab = (name) => {
  const open = `<!--ARTIFACT-${name}-->`;
  const close = `<!--/ARTIFACT-${name}-->`;
  const a = page.indexOf(open);
  const b = page.indexOf(close);
  if (a === -1 || b === -1) throw new Error(`missing ${name} markers in public/lungscan/index.html`);
  return page.slice(a + open.length, b).trim();
};

/* Site-absolute paths do not resolve inside an artifact, and the artifact is a
   preview rather than a page on the site — so its links point at production. */
const body = grab('BODY')
  .replace(/href="\/(?!\/)/g, 'href="https://upiri.vercel.app/')
  .replace(/<link rel="icon"[^>]*>\n?/g, '');

await writeFile(out, grab('HEAD').replace(/<link rel="icon"[^>]*>\n?/g, '') + '\n\n' + body + '\n');
process.stdout.write('prototypes/lungscan.html regenerated from the live subpage\n');
