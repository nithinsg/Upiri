/*
 * The character rig and the viseme set, without a browser.
 *
 * avatar.js only touches the DOM inside its builders, so the shape tables and
 * the viseme mapping can be tested in Node — which means the part of §18 that
 * is easiest to break silently is also the cheapest to check.
 */

import { describe, ok, eq, report } from './_harness.mjs';
import { MOUTHS, SKIN, visemeFor, visemeSchedule } from '../public/uppi/avatar.js';

describe('The viseme set (§18)');
for (const name of ['neutral', 'ai', 'o', 'u', 'mbp', 'fv', 'l', 'sh', 'th', 'aa']) {
  ok(!!MOUTHS[name], 'the ' + name + ' shape exists');
  ok(typeof MOUTHS[name].mouth === 'string' && MOUTHS[name].mouth.length > 10, name + ' has a real path');
}
const paths = new Set(Object.values(MOUTHS).map((m) => m.mouth));
ok(paths.size >= 10, 'the shapes are actually distinct (' + paths.size + ' unique paths)');

describe('Character → viseme mapping');
eq(visemeFor('m'), 'mbp', 'm closes the lips');
eq(visemeFor('b'), 'mbp', 'b closes the lips');
eq(visemeFor('p'), 'mbp', 'p closes the lips');
eq(visemeFor('f'), 'fv', 'f draws the lip under the teeth');
eq(visemeFor('o'), 'o', 'o rounds');
eq(visemeFor('u'), 'u', 'u rounds tighter');
eq(visemeFor('l'), 'l', 'l shows the tongue');
eq(visemeFor('s', 'h'), 'sh', 'sh is read as a digraph, not as an s');
eq(visemeFor('t', 'h'), 'th', 'th is read as a digraph, not as a t');
eq(visemeFor('c', 'h'), 'sh', 'ch is read as a digraph');
eq(visemeFor(' '), 'neutral', 'a space closes the mouth');

describe('Speech → schedule');
const schedule = visemeSchedule('Hello there, how are you?');
ok(schedule.length >= 6, 'a sentence produces a sequence of shapes (' + schedule.length + ')');
ok(new Set(schedule.map((s) => s.viseme)).size >= 4, 'and uses several distinct shapes');
ok(schedule.some((s) => s.viseme === 'neutral'), 'the mouth closes between words rather than hanging open');
let ordered = true;
for (let i = 1; i < schedule.length; i++) if (schedule[i].at < schedule[i - 1].at) ordered = false;
ok(ordered, 'the schedule is in time order');
let consecutive = false;
for (let i = 1; i < schedule.length; i++) if (schedule[i].viseme === schedule[i - 1].viseme) consecutive = true;
ok(!consecutive, 'the same shape never appears twice in a row (a held pose reads as stuck)');

describe('The approved palette is intact');
eq(SKIN.navy, '#22305F', 'the Yashoda navy of the hoodie');
eq(SKIN.marigold, '#F5821F', 'the marigold of the petal mark and drawstrings');
eq(SKIN.khaki, '#C9A26B', 'the khaki of the cargo trousers');
eq(SKIN.iris, '#6E3B1C', 'the brown of the eyes');
ok(SKIN.lung.toUpperCase() === '#EFA294', 'the coral of the lungs');

report('rig');
