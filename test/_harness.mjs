/*
 * A test harness with no dependencies.
 *
 * ŪPIRI ships no framework and no build step, and a test suite that needed one
 * would be the first thing to rot. Node's own runner would do, but this keeps
 * the output readable on a phone-sized terminal and lets the browser suite and
 * the unit suites report identically.
 */

let failures = [];
let count = 0;
let group = '';

export function describe(name) { group = name; process.stdout.write('\n' + name + '\n'); }

export function ok(condition, message) {
  count++;
  if (condition) { process.stdout.write('  ✓ ' + message + '\n'); return true; }
  failures.push(group + ' — ' + message);
  process.stdout.write('  ✗ ' + message + '\n');
  return false;
}

export function eq(actual, expected, message) {
  return ok(actual === expected, message + '  (expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual) + ')');
}

export function includes(haystack, needle, message) {
  const has = Array.isArray(haystack) ? haystack.indexOf(needle) !== -1 : String(haystack).indexOf(needle) !== -1;
  return ok(has, message);
}

export function excludes(haystack, needle, message) {
  const has = Array.isArray(haystack) ? haystack.indexOf(needle) !== -1 : String(haystack).indexOf(needle) !== -1;
  return ok(!has, message);
}

export function report(label) {
  process.stdout.write('\n' + (failures.length ? '✗ ' : '✓ ') + label + ': ' + (count - failures.length) + '/' + count + ' passed\n');
  if (failures.length) {
    for (const f of failures) process.stdout.write('  FAILED: ' + f + '\n');
    process.exitCode = 1;
  }
  return failures.length === 0;
}

export function results() { return { count, failures: failures.slice() }; }
