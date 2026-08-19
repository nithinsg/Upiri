/*
 * The character in a real browser: the entrance, the behaviour ladder, the
 * panel, and the seven widths §27 names.
 *
 * Everything asserted here is something a visitor sees. The two that matter
 * most, because they were the actual complaints:
 *
 *   - after the greeting Uppi must NOT still be waving;
 *   - leaving him alone must produce curiosity, then tiredness, then sleep,
 *     and touching the page must wake him instantly.
 */

import http from 'node:http';
import { chromium } from 'playwright';
import { describe, ok, eq, includes, report } from './_harness.mjs';
import { startServer } from './_server.mjs';

/*
 * A stand-in for whatever CRM or webhook the hospital points call-back requests
 * at, so the test can assert on what actually leaves the building — which is
 * the part of this feature worth guarding.
 */
const received = [];
const sink = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { received.push(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { received.push(null); }
  res.statusCode = 200;
  res.end('{"ok":true}');
});
await new Promise((r) => sink.listen(4181, r));
process.env.UPPI_CALLBACK_URL = 'http://localhost:4181/hook';

const PORT = 4179;
const app = await startServer(PORT);
const browser = await chromium.launch();

const snapshot = (page) => page.evaluate(() => ({
  state: window.__uppi.states.state,
  pose: window.__uppi.avatar.pose,
  lids: window.__uppi.avatar.lids,
  mouth: window.__uppi.avatar.mouth,
  inputs: {
    energy: window.__uppi.states.inputs.energy,
    scrolling: window.__uppi.states.inputs.scrolling,
    userInactive: window.__uppi.states.inputs.userInactive
  }
}));

async function open(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: width < 900, isMobile: width < 900 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    /* the sandbox has no outbound network, so webfont fetches fail here and
       only here — they are not the page's errors */
    if (m.type() === 'error' && !/ERR_(CONNECTION|TUNNEL|NAME)/.test(m.text())) errors.push('console: ' + m.text());
  });
  await page.goto(app.url + '/');
  await page.waitForSelector('.uppi-launcher', { timeout: 20000 });
  return { ctx, page, errors };
}

/* ---------------- entrance and idle ---------------- */

const { ctx, page, errors } = await open(1440, 900);

describe('The entrance (§5)');
await page.waitForTimeout(700);
const during = await snapshot(page);
ok(['ENTRY', 'WALKING', 'LANDING'].indexOf(during.state) !== -1, 'he is running in, not standing still (' + during.state + ')');
await page.waitForTimeout(4200);
const greeted = await snapshot(page);
includes(['GREETING', 'IDLE', 'WAVE'], greeted.state, 'he arrives and greets (' + greeted.state + ')');
const bubble = await page.evaluate(() => document.querySelector('.uppi-bubble p')?.textContent || '');
includes(bubble, "I'm Uppi, your lung partner", 'and introduces himself in the approved words');

describe('After the greeting he STOPS waving (§6)');
await page.evaluate(() => window.__uppi.dismissBubble());
await page.waitForTimeout(1400);
const idle = await snapshot(page);
eq(idle.state, 'IDLE', 'he settles into idle');
eq(idle.pose.right, 'rest', 'the waving arm is down');
eq(idle.pose.left, 'hip', 'and the other hand is on his hip');
ok(idle.lids === 0, 'his eyes are open');
const anims = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
ok(anims > 0, 'he is still breathing rather than frozen (' + anims + ' running animations)');

describe('He blinks');
const blinked = await page.evaluate(async () => {
  const before = window.__uppi.avatar.lids;
  await window.__uppi.avatar.blink();
  return { before, after: window.__uppi.avatar.lids };
});
eq(blinked.after, blinked.before, 'a blink returns the lids to where they were');

describe('He reacts to scrolling (§7)');
await page.mouse.wheel(0, 1500);
await page.waitForTimeout(150);
const scrolling = await snapshot(page);
ok(scrolling.inputs.scrolling, 'the scrolling input is set while the page moves');
eq(scrolling.state, 'IDLE', 'but he stays calm rather than interrupting');
await page.waitForTimeout(700);

describe('The inactivity ladder (§8)');
await page.evaluate(() => window.__uppi.states.setAll({ userInactive: true, attention: 1 }));
await page.waitForTimeout(300);
eq((await snapshot(page)).state, 'CURIOUS', 'left alone, he becomes curious');
await page.evaluate(() => window.__uppi.states.setAll({ energy: 0.2, attention: 0.2 }));
await page.waitForTimeout(600);
const tired = await snapshot(page);
eq(tired.state, 'TIRED', 'then tired');
ok(tired.lids > 0.3, 'with heavy eyelids (' + tired.lids + ')');
await page.evaluate(() => window.__uppi.states.setAll({ energy: 0 }));
await page.waitForTimeout(800);
const asleep = await snapshot(page);
eq(asleep.state, 'SLEEPING', 'and eventually dozes off');
eq(asleep.lids, 1, 'with his eyes closed');

describe('He wakes the moment the visitor is there (§8)');
const anchor = await page.evaluate(() => {
  const b = document.querySelector('.uppi-launcher').getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
});
await page.mouse.move(anchor.x, anchor.y, { steps: 10 });
await page.waitForTimeout(600);
const awake = await snapshot(page);
ok(awake.state !== 'SLEEPING', 'the pointer coming near wakes him (' + awake.state + ')');
eq(awake.lids, 0, 'his eyes are open again');
eq(awake.inputs.energy, 1, 'and his energy is restored');

describe('The offer of help is rare and capped (§7)');
const nudged = await page.evaluate(() => window.__uppi.presence.nudge('scrolling'));
ok(nudged, 'a nudge can be shown');
includes(await page.evaluate(() => document.querySelector('.uppi-bubble p')?.textContent || ''), 'Need a hand', 'and says something useful');
ok(!await page.evaluate(() => window.__uppi.presence.nudge('idle')), 'a second nudge inside the cooldown is refused');

describe('A conversation, in the panel');
await page.evaluate(() => window.__uppi.dismissBubble());
await page.waitForTimeout(300);
await page.evaluate(() => window.__uppi.openPanel());
await page.waitForTimeout(600);
ok(await page.isVisible('.uppi-panel'), 'the panel opens');
await page.fill('.uppi-field', "I've been coughing");
await page.keyboard.press('Enter');
await page.waitForTimeout(2200);
await page.fill('.uppi-field', 'Three weeks');
await page.keyboard.press('Enter');
await page.waitForTimeout(2400);
const conversation = await page.evaluate(() => Array.from(document.querySelectorAll('.uppi-msg--uppi')).map((n) => n.textContent));
ok(conversation.length >= 2, 'both turns are answered (' + conversation.length + ' replies)');
const askedTwice = conversation.filter((t) => /how long/i.test(t)).length;
ok(askedTwice <= 1, 'the duration is asked at most once (§10)');
includes(conversation.join(' '), 'weeks', 'and the answer is used');
const after = await snapshot(page);
includes(['APPOINTMENT', 'SPEAKING', 'IDLE'], after.state, 'he ends in a state that matches the advice (' + after.state + ')');
ok(await page.isVisible('text=Book a Pulmonology Appointment'), 'the booking CTA is shown');
/* scoped to the panel: the site's own footer also carries a tel: link */
const tel = await page.getAttribute('.uppi-panel a[href^="tel:"]', 'href');
eq(tel, 'tel:+918065906165', 'the call button dials the Yashoda call centre');

describe('An emergency, with the network unplugged');
await ctx.setOffline(true);
await page.fill('.uppi-field', "I'm coughing up blood");
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
const emergency = await page.evaluate(() => document.querySelectorAll('.uppi-msg--uppi')[document.querySelectorAll('.uppi-msg--uppi').length - 1].textContent);
includes(emergency, '108', 'the ambulance number is shown with no network at all');
includes(emergency, 'emergency', 'and the instruction is unambiguous');
eq((await snapshot(page)).state, 'URGENT', 'and Uppi is in the urgent state');
await ctx.setOffline(false);

describe('No console errors anywhere in that run');
eq(errors.length, 0, 'zero errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await ctx.close();

/* ---------------- the popup, on real timers ---------------- */

/*
 * Driven by the clock, not by poking the state machine. The first version of
 * the scroll nudge passed every input-level check and still never fired for a
 * real visitor, because it demanded unbroken scrolling and everyone pauses to
 * read. Only elapsed time catches that.
 */
describe('Uppi offers help when someone is idle (§7, §8)');
{
  const w = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await w.newPage();
  await p.addInitScript(() => { window.__UPPI_PRESENCE_TIMING = { glanceAfter: 900, curiousAfter: 2200, tiredAfter: 60000, sleepAfter: 90000 }; });
  await p.goto(app.url + '/');
  await p.waitForSelector('.uppi-launcher', { timeout: 20000 });
  await p.waitForTimeout(4200);
  await p.evaluate(() => window.__uppi.dismissBubble());
  await p.waitForTimeout(3200);
  const bubble = await p.evaluate(() => {
    const b = document.querySelector('.uppi-bubble');
    return b && !b.hidden ? (b.querySelector('p')?.textContent || '') : '';
  });
  ok(bubble.length > 0, 'a popup appears for a visitor who does nothing');
  includes(bubble.toLowerCase(), 'help', 'and it offers help (' + JSON.stringify(bubble) + ')');
  eq(await p.evaluate(() => window.__uppi.states.state), 'CURIOUS', 'and Uppi looks curious while asking');
  await w.close();
}

describe('Uppi offers help when someone only scrolls (§7)');
{
  const w = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await w.newPage();
  await p.addInitScript(() => { window.__UPPI_PRESENCE_TIMING = { readingTime: 1200, readingDistance: 1, glanceAfter: 60000, curiousAfter: 90000 }; });
  await p.goto(app.url + '/');
  await p.waitForSelector('.uppi-launcher', { timeout: 20000 });
  await p.waitForTimeout(4200);
  await p.evaluate(() => window.__uppi.dismissBubble());
  await p.waitForTimeout(500);

  /* bursts with reading pauses — how a person actually reads a page */
  let shown = '';
  for (let i = 0; i < 12 && !shown; i++) {
    await p.mouse.wheel(0, 420);
    await p.waitForTimeout(700);
    shown = await p.evaluate(() => {
      const b = document.querySelector('.uppi-bubble');
      return b && !b.hidden ? (b.querySelector('p')?.textContent || '') : '';
    });
  }
  ok(shown.length > 0, 'a popup appears for someone reading, pauses and all');
  includes(shown.toLowerCase(), 'find', 'and it offers to help them find something (' + JSON.stringify(shown) + ')');
  await w.close();
}

/* ---------------- the call-back request ---------------- */

describe('Asking Yashoda to call back (§15)');
{
  const w = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const p = await w.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(app.url + '/');
  await p.waitForSelector('.uppi-launcher', { timeout: 20000 });
  await p.waitForTimeout(4200);
  await p.evaluate(() => window.__uppi.dismissBubble());
  await p.evaluate(() => window.__uppi.openPanel());
  await p.waitForTimeout(800);
  ok(await p.evaluate(() => window.__uppi.callbackReady), 'the offer is enabled when a destination is configured');

  await p.fill('.uppi-field', "I've been coughing for three weeks and it's getting worse");
  await p.keyboard.press('Enter');
  await p.waitForTimeout(2600);
  eq(await p.evaluate(() => window.__uppi.conversation.lastResult.urgency), 'doctor', 'the conversation reaches an appointment recommendation');
  eq(await p.evaluate(() => window.__uppi.avatar.pose.right), 'phone', 'and Uppi has the phone in his hand while he offers');
  ok(await p.isVisible('.uppi-act--callback'), 'the call-back CTA is shown');
  const reply = await p.evaluate(() => [...document.querySelectorAll('.uppi-msg--uppi')].pop().textContent);
  ok(/call you/i.test(reply), 'and he says the offer out loud rather than leaving it to a button');

  await p.click('.uppi-act--callback');
  await p.waitForTimeout(500);
  ok(await p.isVisible('.uppi-callback'), 'the form opens');
  includes(await p.textContent('.uppi-callback-fine'), 'Nothing else from this conversation is sent', 'and says exactly what leaves');

  /* it must not send half a request */
  await p.fill('.uppi-callback input[name=name]', 'R');
  await p.fill('.uppi-callback input[name=phone]', '12345');
  await p.click('.uppi-callback button[type=submit]');
  await p.waitForTimeout(300);
  ok((await p.textContent('.uppi-callback-status')).length > 0, 'a one-letter name is refused');
  await p.fill('.uppi-callback input[name=name]', 'Ravi Kumar');
  await p.click('.uppi-callback button[type=submit]');
  await p.waitForTimeout(300);
  includes(await p.textContent('.uppi-callback-status'), 'short', 'a five-digit number is refused');
  eq(received.length, 0, 'and nothing has been sent while the form is invalid');

  await p.fill('.uppi-callback input[name=phone]', '98765 43210');
  await p.fill('.uppi-callback input[name=preferredTime]', 'after 6pm');
  await p.click('.uppi-callback button[type=submit]');
  await p.waitForTimeout(1600);
  ok(!(await p.$('.uppi-callback')), 'the form closes once it is sent');
  ok(/passed your details/i.test(await p.evaluate(() => [...document.querySelectorAll('.uppi-msg--uppi')].pop().textContent)), 'and Uppi confirms it himself');

  eq(received.length, 1, 'exactly one request reached the destination');
  const got = received[0] || {};
  eq(got.name, 'Ravi Kumar', 'the name is passed on');
  eq(got.phone, '+919876543210', 'the number is normalised to E.164');
  eq(got.preferredTime, 'after 6pm', 'the preferred time is passed on');
  eq(got.urgency, 'doctor', 'and how soon they should be seen, which is what makes the call useful');
  /* the part that matters most */
  const leaked = JSON.stringify(got).toLowerCase();
  ok(leaked.indexOf('cough') === -1, 'the symptoms do NOT leave with it');
  ok(leaked.indexOf('worse') === -1, 'nor anything else they typed');
  eq(Object.keys(got).sort().join(','), 'name,phone,preferredTime,requestedAt,source,urgency,urgencyLabel', 'and nothing beyond the agreed fields is sent');
  eq(errs.length, 0, 'no page errors through the whole flow');
  await w.close();
}

describe('With no destination configured, the offer does not exist');
{
  const saved = process.env.UPPI_CALLBACK_URL;
  delete process.env.UPPI_CALLBACK_URL;
  const w = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const p = await w.newPage();
  await p.goto(app.url + '/');
  await p.waitForSelector('.uppi-launcher', { timeout: 20000 });
  await p.waitForTimeout(4200);
  await p.evaluate(() => window.__uppi.dismissBubble());
  await p.evaluate(() => window.__uppi.openPanel());
  await p.waitForTimeout(900);
  eq(await p.evaluate(() => window.__uppi.callbackReady), false, 'the client is told there is nowhere to send it');
  await p.fill('.uppi-field', "I've been coughing for three weeks and it's getting worse");
  await p.keyboard.press('Enter');
  await p.waitForTimeout(2600);
  ok(!(await p.$('.uppi-act--callback')), 'so no form is offered — a dropped phone number is worse than no form');
  ok(await p.isVisible('.uppi-act--book'), 'and the working CTAs are still there');
  await w.close();
  process.env.UPPI_CALLBACK_URL = saved;
}

/* ---------------- widths ---------------- */

describe('Every width in §27');
for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  const w = await open(width, 720);
  await w.page.waitForTimeout(4200);
  await w.page.evaluate(() => window.__uppi.dismissBubble());
  await w.page.waitForTimeout(300);
  await w.page.evaluate(() => window.__uppi.openPanel());
  await w.page.waitForTimeout(600);
  await w.page.fill('.uppi-field', 'I get breathless on stairs');
  await w.page.keyboard.press('Enter');
  await w.page.waitForTimeout(2000);
  const m = await w.page.evaluate(() => {
    const panel = document.querySelector('.uppi-panel').getBoundingClientRect();
    const field = document.querySelector('.uppi-field').getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      inView: panel.left >= -1 && panel.right <= window.innerWidth + 1 && panel.bottom <= window.innerHeight + 1,
      fieldUsable: field.width > 40 && field.bottom <= window.innerHeight + 1,
      replies: document.querySelectorAll('.uppi-msg--uppi').length
    };
  });
  eq(m.overflow, 0, width + 'px — no horizontal overflow');
  ok(m.inView, width + 'px — the panel fits on screen');
  ok(m.fieldUsable, width + 'px — the character never covers the input');
  ok(m.replies >= 1, width + 'px — the conversation works');
  eq(w.errors.length, 0, width + 'px — no console errors' + (w.errors.length ? ': ' + w.errors.join(' | ') : ''));
  await w.ctx.close();
}

describe('Reduced motion is respected (§25)');
const rm = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
const rmPage = await rm.newPage();
await rmPage.goto(app.url + '/');
await rmPage.waitForSelector('.uppi-launcher', { timeout: 20000 });

await rmPage.waitForTimeout(3000);
ok(await rmPage.evaluate(() => !!window.__uppi), 'Uppi still loads');
const infinite = await rmPage.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity && a.effect.target && a.effect.target.closest && a.effect.target.closest('.uppi-root')).length);
eq(infinite, 0, 'and runs no infinite loops on the character');
await rm.close();

await browser.close();
await app.close();
await new Promise((r) => sink.close(r));
report('browser');
