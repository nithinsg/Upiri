/*
 * `npm test` — every suite, one exit code.
 *
 * Each suite is a separate process so a crash in one cannot take the others
 * down with it, and so the browser suite's Playwright instance never sits in
 * memory while the unit suites run.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SUITES = ['core.test.mjs', 'conversation.test.mjs', 'rig.test.mjs', 'browser.test.mjs', 'pages.test.mjs'];
const only = process.argv[2];
const dir = fileURLToPath(new URL('.', import.meta.url));

let failed = 0;
for (const suite of SUITES) {
  if (only && suite.indexOf(only) === -1) continue;
  const code = await new Promise((resolve) => {
    spawn(process.execPath, [dir + suite], { stdio: 'inherit' }).on('close', resolve);
  });
  if (code !== 0) failed++;
}

process.stdout.write('\n' + (failed ? '✗ ' + failed + ' suite(s) failed\n' : '✓ all suites passed\n'));
process.exit(failed ? 1 : 0);
