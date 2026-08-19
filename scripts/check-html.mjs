/*
 * Cheap structural check for public/index.html.
 *
 * The site is one 6,000-line file with no build step, so the two ways to break
 * it are a syntax error in the component script and an unbalanced tag in the
 * markup. Both are silent: the page simply comes up blank, or one route does.
 * A careless line-range edit has already taken out every non-homepage route
 * once, which is why this exists and why it runs before the test suite.
 *
 *   node scripts/check-html.mjs
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const path = fileURLToPath(new URL('../public/index.html', import.meta.url));
const html = await readFile(path, 'utf8');
const problems = [];

/* ---- 1. the component script must parse ---- */
const script = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
if (!script) problems.push('no <script type="text/x-dc"> block found');
else {
  try {
    /* compiled the same way support.js compiles it, so a syntax error here is a
       syntax error there */
    new vm.Script('(function (DCLogic) {\n' + script[1] + '\nreturn Component;\n})');
  } catch (err) {
    problems.push('component script does not parse: ' + err.message);
  }
}

/* ---- 1b. no view-model key may be defined twice ---- */
/*
 * `renderVals()` returns one enormous object literal. A key defined twice in it
 * is legal JavaScript and completely silent: the later one wins and the earlier
 * feature simply stops working. That is not hypothetical — `isCase` was defined
 * once for the teaching-case reader and once for the Case of the Month route,
 * and the reader's clinical disclaimer stopped rendering with no error
 * anywhere. Cheap to detect, expensive to find by hand.
 */
if (script) {
  const body = script[1];
  const start = body.indexOf('renderVals()');
  if (start !== -1) {
    /* The FIRST `return {` after renderVals() belongs to a nested helper
       (videoVm's, as it happens). The method's own return is the one at the
       method's indentation - four spaces - so anchor on that. */
    const at = body.indexOf('\n    return {', start);
    const open = at === -1 ? -1 : at + 1;
    if (open !== -1) {
      let depth = 0, i = open + 7, end = -1;
      /* walk to the matching brace, skipping strings, template literals and comments */
      let str = null, line = false, block = false;
      for (; i < body.length; i++) {
        const c = body[i], n = body[i + 1];
        if (line) { if (c === '\n') line = false; continue; }
        if (block) { if (c === '*' && n === '/') { block = false; i++; } continue; }
        if (str) { if (c === '\\') i++; else if (c === str) str = null; continue; }
        if (c === '/' && n === '/') { line = true; i++; continue; }
        if (c === '/' && n === '*') { block = true; i++; continue; }
        if (c === '"' || c === "'" || c === '`') { str = c; continue; }
        if (c === '{' || c === '(' || c === '[') depth++;
        else if (c === '}' || c === ')' || c === ']') { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end !== -1) {
        /* only depth-1 keys are this object's own; anything deeper belongs to a
           nested literal and may legitimately repeat a name */
        const slice = body.slice(open + 8, end);   /* past the '{', so this object's own keys sit at depth 0 */
        const seen = new Map();
        const dupes = [];
        depth = 0; str = null; line = false; block = false;
        let atKeyStart = true;
        for (let j = 0; j < slice.length; j++) {
          const c = slice[j], n = slice[j + 1];
          if (line) { if (c === '\n') line = false; continue; }
          if (block) { if (c === '*' && n === '/') { block = false; j++; } continue; }
          if (str) { if (c === '\\') j++; else if (c === str) str = null; continue; }
          if (c === '/' && n === '/') { line = true; j++; continue; }
          if (c === '/' && n === '*') { block = true; j++; continue; }
          if (c === '"' || c === "'" || c === '`') { str = c; atKeyStart = false; continue; }
          if (c === '{' || c === '(' || c === '[') { depth++; atKeyStart = false; continue; }
          if (c === '}' || c === ')' || c === ']') { depth--; continue; }
          if (depth === 0 && (c === ',' || c === '\n')) { atKeyStart = true; continue; }
          if (depth === 0 && atKeyStart && /[A-Za-z_$]/.test(c)) {
            const m2 = /^([A-Za-z_$][\w$]*)\s*:/.exec(slice.slice(j));
            if (m2) {
              const key = m2[1];
              if (seen.has(key)) dupes.push(key);
              else seen.set(key, j);
            }
            atKeyStart = false;
            continue;
          }
          if (!/\s/.test(c)) atKeyStart = false;
        }
        if (dupes.length) {
          problems.push('renderVals() defines these keys twice — the later one silently wins: ' + [...new Set(dupes)].join(', '));
        }
      }
    }
  }
}

/* ---- 2. the runtime's template must still be present ---- */
if (!/<template data-dc-template>/.test(html)) {
  problems.push('the <template data-dc-template> wrapper is missing — the browser would parse {{ }} as SVG geometry');
}

/* ---- 3. balanced tags in the markup ---- */
/* Only the elements that have actually caused an outage here: nesting a
   <section> inside a <section> silently swallowed the whole care hub. */
const markup = html.slice(0, html.indexOf('<script type="text/x-dc"'));
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr', 'path', 'circle', 'rect',
  'line', 'polygon', 'polyline', 'ellipse', 'stop', 'use']);
const WATCH = new Set(['section', 'article', 'div', 'sc-if', 'sc-for', 'template', 'x-dc', 'ul', 'ol', 'li', 'select', 'option']);
const stack = [];
const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
let m;
while ((m = tag.exec(markup))) {
  const [, close, name, attrs] = m;
  const lower = name.toLowerCase();
  if (!WATCH.has(lower)) continue;
  if (VOID.has(lower) || /\/\s*$/.test(attrs)) continue;
  if (close) {
    const top = stack.pop();
    if (!top) problems.push('closing </' + lower + '> with nothing open (offset ' + m.index + ')');
    else if (top.name !== lower) {
      problems.push('</' + lower + '> closes <' + top.name + '> opened at offset ' + top.at);
      break;
    }
  } else stack.push({ name: lower, at: m.index });
}
if (stack.length) {
  problems.push('unclosed: ' + stack.map((x) => '<' + x.name + '> at offset ' + x.at).join(', '));
}

if (problems.length) {
  for (const p of problems) process.stderr.write('FAIL  ' + p + '\n');
  process.exit(1);
}
process.stdout.write('index.html: script parses, template present, watched tags balanced\n');
