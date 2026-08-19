/*
 * Prerender (§16).
 *
 * The site is a single design-context page rendered client-side, which means a
 * crawler that does not execute JavaScript sees an empty shell. This script
 * loads the page once per route in a real browser, lets the runtime render, then
 * writes the resulting HTML to disk so every route ships its content, its
 * <title>, its meta description, its canonical and its JSON-LD in the initial
 * response.
 *
 * The written files keep the original scripts, so the page still hydrates and
 * behaves exactly as before — the prerendered markup is replaced by the runtime
 * on load. Crawlers get the text; users get the app.
 *
 * Usage: node scripts/prerender.mjs [outDir]   (default: dist)
 */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile, stat, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';

const PUBLIC = new URL('../public/', import.meta.url).pathname;
const OUT = process.argv[2] || new URL('../dist/', import.meta.url).pathname;
const PORT = 8199;
const TYPES = {
  '.html': 'text/html', '.js': 'application/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain', '.css': 'text/css',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = normalize(join(PUBLIC, decodeURIComponent(url.pathname)));
  if (!p.startsWith(PUBLIC)) { res.writeHead(403).end(); return; }
  try { const st = await stat(p); if (st.isDirectory()) p = join(p, 'index.html'); }
  catch { p = join(PUBLIC, 'index.html'); }
  try {
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

/* The prerendered HTML depends only on the page's own markup and script, so every
   request that is not to this server is dropped. That keeps the build hermetic —
   no webfont, thumbnail or third-party outage can slow it down or fail it. */
const localOnly = (route) =>
  route.request().url().startsWith(`http://127.0.0.1:${PORT}`) ? route.continue() : route.abort();

/* Uppi is a runtime companion, not page content: he greets a visitor and holds
   a conversation. Baking a frozen mid-wave character into every route's HTML
   would ship dead markup to crawlers and make the prerendered file heavier for
   nothing, so the boot script is told to stand down here. */
const noUppi = () => { window.__UPIRI_NO_UPPI = 1; };

/* Routes come from the page's own data, so the list cannot drift from it. */
const browser = await chromium.launch();
const probe = await browser.newPage();
await probe.addInitScript(noUppi);
await probe.route('**/*', localOnly);
await probe.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
await probe.waitForFunction(() => window.__dc && window.__dc.app, null, { timeout: 15000 });
const routes = await probe.evaluate(() => {
  const app = window.__dc.app;
  const base = Object.values(app.ROUTES);
  return [
    ...base,
    ...app.KH_TOPICS.map((t) => '/knowledge-hub/' + t.id),
    ...app.KH_ARTICLES.map((a) => '/knowledge-hub/guide/' + a.id),
    ...app.KH_CASES.map((c) => '/knowledge-hub/case/' + c.id),
    ...app.DOCTORS.map((d) => '/doctors/' + d.id),
    ...app.PROCEDURES.map((p) => '/tests-and-procedures/' + p.id),
  ];
});
await probe.close();

/* The runtime consumes the inert <template> on boot, so the rendered DOM alone
   would leave nothing for it to hydrate from — it would compile the prerendered
   markup as its template and the page would come up inert. Keep the original
   template and re-insert it into every written file. */
const source = await readFile(join(PUBLIC, 'index.html'), 'utf8');
const tplMatch = source.match(/<template data-dc-template>[\s\S]*?<\/template>/);
if (!tplMatch) { console.error('could not find the source template'); process.exit(1); }
const TEMPLATE = tplMatch[0];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(PUBLIC, OUT, { recursive: true });

const page = await browser.newPage();
await page.addInitScript(noUppi);
await page.route('**/*', localOnly);
let written = 0;
const problems = [];
for (const route of routes) {
  await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForFunction(() => {
      const root = document.querySelector('x-dc');
      return root && root.querySelectorAll('*').length > 40 && !document.querySelector('template[data-dc-template]');
    }, null, { timeout: 15000 });
  } catch { problems.push(`${route}: never rendered`); continue; }
  await page.waitForTimeout(120);

  let html = await page.evaluate(() => '<!DOCTYPE html>\n' + document.documentElement.outerHTML);
  if (!html.includes('</x-dc>')) { problems.push(`${route}: no x-dc root to hydrate`); continue; }
  html = html.replace('</x-dc>', TEMPLATE + '</x-dc>');
  const words = await page.evaluate(() => (document.querySelector('x-dc')?.innerText || '').trim().split(/\s+/).length);
  if (words < 40) problems.push(`${route}: only ${words} words of text`);

  const file = route === '/' ? join(OUT, 'index.html') : join(OUT, route.replace(/^\//, ''), 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html, 'utf8');
  written++;
}

await browser.close();
server.close();

await writeFile(join(OUT, 'prerender-manifest.json'),
  JSON.stringify({ generated: new Date().toISOString(), routes: routes.length, written }, null, 2));

/*
 * The sitemap, from the same list that was just rendered.
 *
 * It used to be maintained by hand and had fallen 29 routes behind — every
 * guide, every teaching case and the air ambulance page were missing, which
 * means the pages nobody had linked to yet were also the pages nobody could
 * find. Writing it here makes drift impossible: a route that is not prerendered
 * is not in the sitemap, and a route that is, is.
 */
const ORIGIN = 'https://upiri.vercel.app';
const today = new Date().toISOString().slice(0, 10);
const priority = (r) =>
  r === '/' ? '1.0'
    : /^\/(knowledge-hub|doctors|tests-and-procedures|symptom-checker|ecmo-and-air-ambulance)$/.test(r) ? '0.9'
      : r.split('/').length > 2 ? '0.6' : '0.7';
await writeFile(join(OUT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + [...new Set(routes)].map((r) =>
    '  <url>\n'
    + `    <loc>${ORIGIN}${r === '/' ? '/' : r}</loc>\n`
    + `    <lastmod>${today}</lastmod>\n`
    + `    <changefreq>${r === '/' ? 'weekly' : 'monthly'}</changefreq>\n`
    + `    <priority>${priority(r)}</priority>\n`
    + '  </url>').join('\n')
  + '\n</urlset>\n', 'utf8');

console.log(`prerendered ${written}/${routes.length} routes into ${OUT}`);
if (problems.length) {
  console.error('problems:\n  ' + problems.join('\n  '));
  process.exit(1);
}
