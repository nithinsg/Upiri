/*
 * A local stand-in for the Vercel deployment, so the browser suite exercises
 * the real page and the real serverless handlers rather than mocks.
 *
 * Serves `public/` and mounts `api/uppi/*` at their deployed paths, with the
 * same SPA rewrite `vercel.json` applies. Nothing here is used in production.
 */

import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon'
};

function vercelish(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); return res; };
  res.send = (b) => { res.end(b); return res; };
  return res;
}

export async function startServer(port) {
  const routes = {
    '/api/uppi/chat': (await import('../api/uppi/chat.js')).default,
    '/api/uppi/speak': (await import('../api/uppi/speak.js')).default,
    '/api/uppi/transcribe': (await import('../api/uppi/transcribe.js')).default,
    '/api/uppi/callback': (await import('../api/uppi/callback.js')).default
  };

  const server = http.createServer(async (req, res) => {
    vercelish(res);
    const path = new URL(req.url, 'http://localhost').pathname;
    const handler = routes[path];
    if (handler) {
      try { await handler(req, res); }
      catch (err) { res.statusCode = 500; res.end(JSON.stringify({ error: 'handler_failed', detail: String(err) })); }
      return;
    }
    let file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) { res.statusCode = 403; res.end(); return; }
    /* the SPA rewrite, minus /api/ — the same rule vercel.json applies */
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(ROOT, 'index.html');
    res.setHeader('content-type', MIME[extname(file)] || 'application/octet-stream');
    createReadStream(file).pipe(res);
  });

  await new Promise((resolve) => server.listen(port, resolve));
  return { server, url: 'http://localhost:' + port, close: () => new Promise((r) => server.close(r)) };
}
