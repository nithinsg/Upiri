/*
 * The pages, in a real browser.
 *
 * This suite exists because the failures it guards against are all silent. A
 * broken route in a single 6,000-line file does not throw — the page just comes
 * up empty. A card that opens nothing looks identical to one that opens
 * something. A rail that has stopped advancing looks like a rail. And the
 * airlift touches Uppi from outside his own module, which is exactly the kind
 * of seam that rots without a test sitting on it.
 *
 * What is pinned here:
 *
 *   - every route renders real content, with its own title and canonical;
 *   - every guide and every teaching case has a body, sources and a page;
 *   - a teaching case says on its face that it is not a real patient;
 *   - the video rail advances on its own, holds still under a resting pointer,
 *     and wraps rather than sticking at the end;
 *   - the branch selector actually filters the specialists;
 *   - every "Relevant Yashoda services" chip resolves to a page;
 *   - the airlift runs the full choreography and puts Uppi back;
 *   - the console stays clean throughout.
 */

import { chromium } from 'playwright';
import { describe, ok, eq, includes, report } from './_harness.mjs';
import { startServer } from './_server.mjs';

const PORT = 4183;
const app = await startServer(PORT);
const browser = await chromium.launch();
const base = 'http://127.0.0.1:' + PORT;

const errors = [];
async function open(width, height, opts) {
  const ctx = await browser.newContext({ viewport: { width, height }, ...(opts || {}) });
  const page = await ctx.newPage();
  /*
   * Hermetic: nothing but this server answers.
   *
   * The pages pull YouTube thumbnails and Google webfonts, and in this sandbox
   * those fail against the proxy's certificate. Filtering the resulting console
   * text was the first attempt and it is the wrong shape — the message is just
   * "Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID" with no URL in
   * it, so the filter has to be widened until it would swallow a real error
   * too. Dropping the requests instead keeps "no console errors" a strict
   * assertion about OUR pages, which is the only thing this suite can speak to.
   */
  await page.route('**/*', (route) =>
    route.request().url().startsWith(base) ? route.continue() : route.abort());
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    /* an aborted request still logs; that abort is this harness, not the page */
    if (m.type() === 'error' && !/ERR_(FAILED|ABORTED|CONNECTION|TUNNEL|NAME|CERT)/.test(m.text())) {
      errors.push('console: ' + m.text());
    }
  });
  return { ctx, page };
}

/* ------------------------------------------------------------------ content */

describe('The written content is real, not a list of titles');

{
  const { ctx, page } = await open(1280, 900);
  await page.addInitScript(() => { window.__UPIRI_NO_UPPI = 1; });
  await page.goto(base + '/knowledge-hub', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__dc && window.__dc.app, null, { timeout: 20000 });

  const data = await page.evaluate(() => {
    const app2 = window.__dc.app;
    return {
      articles: app2.KH_ARTICLES.map((a) => ({
        id: a.id, topic: a.topic, cat: a.cat,
        sections: (a.body || []).length,
        paras: (a.body || []).reduce((n, s) => n + (s.p || []).length, 0),
        /* Count what the reader actually reads. An earlier version counted only
           <p> and called a guide a stub because its substance was a checklist —
           a list item is written prose that lands on the page like any other. */
        words: (a.body || []).reduce(
          (n, s) => n + [...(s.p || []), ...(s.list || [])].join(' ').trim().split(/\s+/).filter(Boolean).length, 0),
        src: (a.src || []).length, placeholder: !!a.placeholder
      })),
      cases: app2.KH_CASES.map((c) => ({
        id: c.id, steps: (c.steps || []).length, points: (c.points || []).length,
        present: (c.present || '').length, src: (c.src || []).length, placeholder: !!c.placeholder
      })),
      topics: app2.KH_TOPICS.map((t) => t.id),
      services: [...new Set(app2.KH_TOPICS.flatMap((t) => t.svc))],
      unlinked: [...new Set(app2.KH_TOPICS.flatMap((t) => t.svc))].filter((n) => !app2.SERVICE_LINKS[n]),
      videoIds: app2.KH_VIDEOS.filter((v) => v.yt).map((v) => v.yt)
    };
  });

  ok(data.articles.length >= 18, 'at least 18 guides and articles are written (' + data.articles.length + ')');
  ok(data.cases.length >= 6, 'at least 6 teaching cases are written (' + data.cases.length + ')');
  eq(data.articles.filter((a) => a.placeholder).length, 0, 'no article is still a placeholder');
  eq(data.cases.filter((c) => c.placeholder).length, 0, 'no teaching case is still a placeholder');
  eq(data.articles.filter((a) => !a.id || a.sections < 3).length, 0, 'every article has an id and at least three sections');
  eq(data.articles.filter((a) => a.words < 260).length, 0, 'every article carries real prose, not a stub');
  eq(data.articles.filter((a) => a.paras < 4).length, 0, 'and every article is written in prose, not only in bullets');
  eq(data.articles.filter((a) => a.src < 1).length, 0, 'every article names where its material came from');
  eq(data.cases.filter((c) => c.steps < 3 || c.points < 3 || c.present < 80 || c.src < 1).length, 0,
    'every case has a presentation, working, teaching points and sources');

  /* the categories the hub advertises must each actually have something in them */
  for (const cat of ['Patient Guides', 'Expert Insights', 'Articles']) {
    ok(data.articles.some((a) => a.cat === cat), 'the "' + cat + '" tab has written material behind it');
  }

  /* ids must be unique, or two pieces would share a URL */
  eq(new Set(data.articles.map((a) => a.id)).size, data.articles.length, 'article slugs are unique');
  eq(new Set(data.cases.map((c) => c.id)).size, data.cases.length, 'case slugs are unique');

  /* nothing may point at a topic that does not exist */
  const orphans = [...data.articles, ...data.cases].filter((x) => x.topic && !data.topics.includes(x.topic));
  eq(orphans.length, 0, 'no piece is filed under a topic that does not exist');

  eq(data.unlinked.length, 0,
    'every "Relevant Yashoda services" chip resolves to a page' + (data.unlinked.length ? ' — missing: ' + data.unlinked.join(', ') : ''));

  /* a wrong YouTube id is a wrong video on a hospital page, so at least assert
     the shape: 11 characters of the id alphabet, and no duplicates within a topic */
  const badIds = data.videoIds.filter((y) => !/^[\w-]{11}$/.test(y));
  eq(badIds.length, 0, 'every video id is a well-formed YouTube id' + (badIds.length ? ' — bad: ' + badIds.join(', ') : ''));

  await ctx.close();
}

/* ------------------------------------------------------------------- routes */

describe('Every route renders, including the ones added for the reads');

{
  const { ctx, page } = await open(1280, 900);
  await page.addInitScript(() => { window.__UPIRI_NO_UPPI = 1; });
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__dc && window.__dc.app, null, { timeout: 20000 });

  const routes = await page.evaluate(() => {
    const app2 = window.__dc.app;
    return [
      '/', '/knowledge-hub', '/doctors', '/tests-and-procedures', '/ecmo-and-air-ambulance',
      '/knowledge-hub/' + app2.KH_TOPICS[0].id,
      '/knowledge-hub/guide/' + app2.KH_ARTICLES[0].id,
      '/knowledge-hub/guide/' + app2.KH_ARTICLES[app2.KH_ARTICLES.length - 1].id,
      '/knowledge-hub/case/' + app2.KH_CASES[0].id,
      '/knowledge-hub/case/' + app2.KH_CASES[app2.KH_CASES.length - 1].id
    ];
  });

  for (const r of routes) {
    await page.goto(base + r, { waitUntil: 'load' });
    await page.waitForTimeout(450);
    const m = await page.evaluate(() => ({
      text: (document.body.innerText || '').trim().length,
      title: document.title,
      canonical: (document.querySelector('link[rel=canonical]') || {}).href || '',
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      hasLd: !!document.querySelector('script[type="application/ld+json"]')
    }));
    ok(m.text > 900, r + ' renders real content (' + m.text + ' chars)');
    ok(m.canonical.endsWith(r === '/' ? '/' : r), r + ' declares its own canonical');
    ok(m.title.length > 12 && m.title !== 'ŪPIRI', r + ' has its own title');
    eq(m.overflow, 0, r + ' does not scroll sideways');
    ok(m.hasLd, r + ' ships structured data');
  }

  /* an unknown slug must land somewhere sensible rather than on a blank screen */
  await page.goto(base + '/knowledge-hub/guide/does-not-exist', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const missing = await page.evaluate(() => (document.body.innerText || '').trim().length);
  ok(missing > 900, 'an unknown guide slug still renders a page rather than a blank screen');

  await ctx.close();
}

/* -------------------------------------------------------------- the reading */

describe('A guide and a case open, read, and lead somewhere');

{
  const { ctx, page } = await open(1280, 900);
  await page.addInitScript(() => { window.__UPIRI_NO_UPPI = 1; });
  await page.goto(base + '/knowledge-hub/asthma', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__dc && window.__dc.app, null, { timeout: 20000 });
  await page.waitForTimeout(500);

  /* the topic page's "Related articles" card must actually open the article */
  const before = page.url();
  await page.locator('text=Using your inhaler correctly').first().click();
  await page.waitForTimeout(600);
  ok(page.url() !== before && page.url().includes('/knowledge-hub/guide/'),
    'a Related articles card opens the guide rather than sitting there');

  const guide = await page.evaluate(() => ({
    h1: (document.querySelector('h1') || {}).textContent || '',
    paras: document.querySelectorAll('article p').length,
    drawn: (document.body.innerText || '').includes('Drawn from'),
    next: (document.body.innerText || '').includes('Read next'),
    book: !!document.querySelector('a[href*="wa.me"]')
  }));
  includes(guide.h1, 'inhaler', 'the guide page is the guide that was clicked');
  ok(guide.paras >= 6, 'the guide has a real body (' + guide.paras + ' paragraphs)');
  ok(guide.drawn, 'the guide prints the guidance it was drawn from');
  ok(guide.next, 'the guide offers somewhere to go next');
  ok(guide.book, 'the guide reaches a way to book');

  /* back to the topic, then into a case */
  await page.goto(base + '/knowledge-hub/case/persistent-wheeze-young-adult', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const kase = await page.evaluate(() => document.body.innerText || '');
  includes(kase, 'Presentation', 'a teaching case leads with the presentation');
  includes(kase, 'Teaching points', 'a teaching case closes with the teaching points');
  includes(kase, 'not a record of a real patient',
    'a teaching case states plainly that it is illustrative, not a patient record');

  await ctx.close();
}

/* --------------------------------------------------------------- the rails */

describe('The video rail moves itself, and stops when someone is using it');

{
  const { ctx, page } = await open(1280, 950);
  await page.addInitScript(() => { window.__UPIRI_NO_UPPI = 1; });
  await page.goto(base + '/knowledge-hub/asthma', { waitUntil: 'load' });
  await page.waitForSelector('[data-rail="topic-videos"]', { timeout: 20000 });

  const rail = '[data-rail="topic-videos"]';
  const at = () => page.evaluate((sel) => document.querySelector(sel).scrollLeft, rail);
  const cards = await page.locator(rail + ' > *').count();
  ok(cards >= 4, 'the topic offers four or more videos (' + cards + ')');

  await page.mouse.move(4, 4);
  await page.evaluate((sel) => { const r = document.querySelector(sel); r.scrollLeft = 0; r.dataset.railHold = '0'; }, rail);
  await page.waitForTimeout(2500);
  const moved = await at();
  ok(moved > 0, 'the rail advances on its own within about two seconds (' + moved + 'px)');

  /* a pointer resting on it must hold it — this is the bug the first version
     had: `pointermove` stops firing when the pointer stops, so the card being
     read scrolled away underneath it */
  /* the rail sits well down the page, so it has to be brought into view before
     the pointer can be put on it — a mouse moved below the fold hovers nothing */
  await page.locator(rail).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = await page.locator(rail).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(1200);                 /* let any in-flight scroll land */
  const held0 = await at();
  await page.waitForTimeout(3000);                 /* a resting pointer: no new events */
  const held1 = await at();
  eq(held1, held0, 'a resting pointer holds the rail still');
  await page.mouse.move(4, 4);

  /* and it wraps rather than sticking at the end */
  await page.mouse.move(4, 4);
  await page.evaluate((sel) => {
    const r = document.querySelector(sel);
    r.dataset.railHold = '0';
    r.scrollLeft = r.scrollWidth - r.clientWidth;
  }, rail);
  /* Poll rather than sample once. The rail advances every 2s, so a single read
     at a fixed delay can land AFTER the wrap and after the next step — which
     looks like a failure to wrap when it is really a race with the timer. */
  let wrapped = false;
  for (let i = 0; i < 30 && !wrapped; i++) {
    if ((await at()) < 60) wrapped = true;
    else await page.waitForTimeout(120);
  }
  ok(wrapped, 'from the end the rail wraps back to the start');

  await ctx.close();
}

describe('Meet the specialists: every consultant, filtered by branch');

{
  const { ctx, page } = await open(1280, 950);
  await page.addInitScript(() => { window.__UPIRI_NO_UPPI = 1; });
  await page.goto(base + '/knowledge-hub/asthma', { waitUntil: 'load' });
  await page.waitForSelector('[data-rail="topic-docs"]', { timeout: 20000 });

  const all = await page.locator('[data-rail="topic-docs"] > *').count();
  ok(all > 3, 'the rail shows every matching consultant, not the first three (' + all + ')');

  const branches = await page.locator('#tp-branch option').allTextContents();
  ok(branches.length >= 3, 'the branch selector lists the branches (' + branches.join(', ') + ')');
  eq(branches[0], 'All branches', 'the selector opens on all branches');

  await page.selectOption('#tp-branch', branches[1]);
  await page.waitForTimeout(400);
  const units = await page.evaluate(() =>
    [...document.querySelectorAll('[data-rail="topic-docs"] > *')].map((el) => el.textContent));
  ok(units.length > 0 && units.length < all, 'choosing a branch narrows the list');
  ok(units.every((t) => t.includes(branches[1])), 'every consultant shown is at the chosen branch');

  await ctx.close();
}

/* ------------------------------------------------------------- the airlift */

describe('ECMO and the air ambulance: findable, then the page and the airlift');

/*
 * Reachability first.
 *
 * The page shipped correct and unfindable: it sat below all nine procedure
 * cards at the bottom of Tests & Procedures, with no link anywhere else, and
 * the only way to it was the URL. A page nobody can navigate to is not a page.
 */
{
  const { ctx, page } = await open(1280, 900);
  await page.addInitScript(() => { window.__UPIRI_NO_UPPI = 1; });
  await page.goto(base + '/tests-and-procedures', { waitUntil: 'load' });
  await page.waitForSelector('a[href="/ecmo-and-air-ambulance"]', { timeout: 20000 });

  const link = page.locator('a[href="/ecmo-and-air-ambulance"]').first();
  const box = await link.boundingBox();
  const firstCard = await page.locator('article').first().boundingBox();
  ok(box.y < firstCard.y, 'the ECMO card leads the page rather than trailing the nine procedures');

  await link.click();
  await page.waitForTimeout(700);
  eq(new URL(page.url()).pathname, '/ecmo-and-air-ambulance', 'and clicking it goes there');

  /* and it is reachable from anywhere, not only from that one page */
  await page.goto(base + '/knowledge-hub', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  eq(await page.locator('a[href="/ecmo-and-air-ambulance"]').count() > 0, true,
    'the footer links to it from every page');
  await ctx.close();
}

{
  const { ctx, page } = await open(1280, 900);
  await page.goto(base + '/ecmo-and-air-ambulance', { waitUntil: 'load' });
  await page.waitForSelector('[data-r="heli"]', { timeout: 20000 });

  const body = await page.evaluate(() => document.body.innerText || '');
  includes(body, '105910', 'the emergency and air-support number is on the page');
  includes(body, 'Awake ECMO', 'the page covers Awake ECMO');
  includes(body, 'yashodahospitals.com', 'the page prints the Yashoda sources it is drawn from');

  await page.waitForFunction(() => !!window.__uppi, null, { timeout: 25000 });
  await page.waitForTimeout(4200);                            /* his entrance */

  const heliX = () => page.evaluate(() => Math.round(document.querySelector('[data-r="heli"]').getBoundingClientRect().x));
  const look = () => page.evaluate(() => ({
    appt: window.__uppi.states.inputs.isAppointment,
    dock: window.__uppi.dock.style.opacity || '1',
    rider: (document.querySelector('[data-r="heli-rider"]') || { style: {} }).style.opacity || '0',
    popup: !!document.querySelector('[data-r="heli-pop"]')
  }));

  const start = await look();
  eq(start.popup, false, 'the 24×7 message waits until the visitor is actually reading');
  eq(start.appt, false, 'Uppi has not reached for his phone yet');

  /*
   * Record the flight instead of sampling it.
   *
   * Polling every 800ms from the test side looked fine and was not: each round
   * trip adds its own latency, so the grid drifts, and the ~1s window in which
   * the helicopter is actually off to the left fell between two samples. A
   * recorder inside the page sees every frame, so what follows is an assertion
   * about the choreography rather than about how fast this machine happens to
   * be today.
   */
  await page.evaluate(() => {
    const w = window;
    w.__flight = { minX: 1e9, maxX: -1e9, rider: false, boarded: false, gone: false, returned: false, landed: false };
    const heli = document.querySelector('[data-r="heli"]');
    const rider = document.querySelector('[data-r="heli-rider"]');
    const tick = () => {
      const x = heli.getBoundingClientRect().x;
      const f = w.__flight;
      if (x < f.minX) f.minX = x;
      if (x > f.maxX) f.maxX = x;
      if (rider && rider.style.opacity === '1') f.rider = true;
      if (w.__uppi.dock.style.opacity === '0') f.boarded = true;
      /* "gone to the left" and "back from the right" are ordered states, not two
         readings of x — record them in sequence so the return cannot be
         satisfied by the original arrival */
      if (f.boarded && x < -60) f.gone = true;
      if (f.gone && x > 1200) f.returned = true;
      if (f.boarded && (w.__uppi.dock.style.opacity || '1') === '1'
        && w.__uppi.states.inputs.isAppointment === false) f.landed = true;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.evaluate(() => document.querySelector('[data-r="heli-mark"]').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(900);

  const called = await look();
  eq(called.appt, true, 'Uppi takes out his phone and makes the call');
  eq(called.popup, true, 'the 24×7 Air Ambulance message appears');
  includes(await page.evaluate(() => document.querySelector('[data-r="heli-pop"]').innerText),
    '24×7 Air Ambulance Support', 'the message says 24×7 Air Ambulance Support');
  ok((await heliX()) < 260, 'the helicopter is coming in from the left');

  /* the whole choreography is ~12s; wait it out, then read what was recorded */
  await page.waitForTimeout(14000);
  const flight = await page.evaluate(() => window.__flight);

  ok(flight.maxX > 800, 'the helicopter reaches the right-hand end where Uppi stands (' + Math.round(flight.maxX) + 'px)');
  ok(flight.rider, 'a passenger appears under the rotor');
  ok(flight.boarded, 'the dock steps aside so the passenger reads as Uppi');
  ok(flight.gone && flight.minX < -60, 'it carries him off to the left and disappears (' + Math.round(flight.minX) + 'px)');
  ok(flight.returned, 'it comes back in from the right-hand end');
  ok(flight.landed, 'Uppi is put back down, and his phone goes away');

  const end = await look();
  eq(end.dock, '1', 'Uppi is visible again when it is over');
  eq(end.appt, false, 'the appointment input is released rather than left set');

  await ctx.close();
}

describe('Reduced motion, and the console');

{
  const { ctx, page } = await open(1280, 900, { reducedMotion: 'reduce' });
  await page.goto(base + '/ecmo-and-air-ambulance', { waitUntil: 'load' });
  await page.waitForSelector('[data-r="heli"]', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__uppi, null, { timeout: 25000 });
  await page.evaluate(() => document.querySelector('[data-r="heli-mark"]').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1500);
  const red = await page.evaluate(() => ({
    popup: !!document.querySelector('[data-r="heli-pop"]'),
    number: (document.body.innerText || '').includes('105910')
  }));
  ok(red.popup, 'under reduced motion the 24×7 message still arrives');
  ok(red.number, 'and the number is still reachable');

  /* the rail must not move itself either, but must still be scrollable by hand */
  await page.goto(base + '/knowledge-hub/asthma', { waitUntil: 'load' });
  await page.waitForSelector('[data-rail="topic-videos"]', { timeout: 20000 });
  await page.mouse.move(4, 4);
  await page.evaluate(() => { document.querySelector('[data-rail="topic-videos"]').scrollLeft = 0; });
  await page.waitForTimeout(3000);
  eq(await page.evaluate(() => document.querySelector('[data-rail="topic-videos"]').scrollLeft), 0,
    'under reduced motion the rail does not move itself');
  await page.evaluate(() => { document.querySelector('[data-rail="topic-videos"]').scrollLeft = 200; });
  ok(await page.evaluate(() => document.querySelector('[data-rail="topic-videos"]').scrollLeft > 0),
    'but it can still be scrolled by hand');

  await ctx.close();
}

/* ------------------------------------------------- Uppi's voice and language */

describe('Uppi speaks the reader\'s language, in a young man\'s voice');

{
  /*
   * A stubbed voice list, because the headless browser ships none at all and
   * "no voices" would make every assertion below vacuously pass. The names are
   * real ones from Windows and Android, including a female voice FIRST for the
   * same locale — if the male preference is not working, Heera wins.
   */
  const withVoices = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(() => {
      const V = [
        { name: 'Microsoft Heera - English (India)', lang: 'en-IN', localService: true },
        { name: 'Microsoft Ravi - English (India)', lang: 'en-IN', localService: true },
        { name: 'Google UK English Female', lang: 'en-GB', localService: false },
        { name: 'Telugu India', lang: 'te-IN', localService: true }
      ];
      window.speechSynthesis.getVoices = () => V;
    });
    const page = await ctx.newPage();
    await page.route('**/*', (r) => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
    return { ctx, page };
  };

  const settle = async (page, url) => {
    await page.goto(base + url, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__uppi, null, { timeout: 25000 });
    await page.waitForTimeout(4200);
    return page.evaluate(() => {
      const u = window.__uppi;
      u.tts._pickVoice();
      const G = "Hi, I'm Uppi, your lung partner. Tell me what's bothering you, and we'll figure out what to do next.";
      return {
        lang: u.lang(), voice: u.tts.voice && u.tts.voice.name,
        voiceLang: u.tts.voice && u.tts.voice.lang, stt: u.speech && u.speech.locale,
        greeting: u.local(G), bubble: (document.querySelector('.uppi-bubble p') || {}).textContent || ''
      };
    });
  };

  const { ctx, page } = await withVoices();

  const en = await settle(page, '/');
  eq(en.voice, 'Microsoft Ravi - English (India)',
    'in English he takes the male voice, not the female one listed before it');
  eq(en.stt, 'en-IN', 'and listens in Indian English');

  const te = await settle(page, '/?lang=te');
  eq(te.lang, 'te', 'a Telugu reader is recognised as one');
  eq(te.voiceLang, 'te-IN', 'and he switches to a Telugu voice');
  eq(te.stt, 'te-IN', 'and listens in Telugu too');
  ok(/[\u0C00-\u0C7F]/.test(te.greeting), 'his greeting is in Telugu script');
  ok(/[\u0C00-\u0C7F]/.test(te.bubble), 'and that is what is actually on screen');

  /* the lines he says most often must all be covered, not just the greeting */
  const covered = await page.evaluate(() => {
    const u = window.__uppi;
    const lines = [
      'Need a hand finding something?',
      'Is the cough dry, or are you bringing up phlegm?',
      'Book a Pulmonology Appointment',
      'Call 108 — emergency ambulance',
      'This needs urgent attention'
    ];
    return lines.filter((l) => /[\u0C00-\u0C7F]/.test(u.t(l))).length;
  });
  eq(covered, 5, 'his offers, questions, actions and the emergency line are all translated');

  /*
   * Drill every option: real conversations, end to end, in Telugu.
   *
   * The first pass translated his questions and stopped there, and the result
   * looked bilingual — a Telugu question above English chips, an English
   * verdict and an English Book button. Counting the leftovers is the only
   * check that catches that, because each individual piece looks fine.
   *
   * ACT and CAT are excluded on purpose: they are validated instruments and
   * CLAUDE.md forbids translating them.
   */
  const flows = [
    ["I've been coughing", 'Three weeks or more', "It's dry", 'Worse at night', 'I smoke'],
    ['I hear a wheeze', 'About two weeks', 'Yes, this has happened before', 'Dust'],
    ['I cough up blood sometimes'],
    ['breathless even sitting still', 'Even when I sit still', 'I struggle around the house'],
    ['my child wheezes at night', 'Under 5', 'A few days']
  ];
  await page.goto(base + '/?lang=te', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__uppi, null, { timeout: 25000 });
  await page.waitForTimeout(4200);
  await page.evaluate(() => { window.__uppi.dismissBubble(); window.__uppi.openPanel(); });
  await page.waitForTimeout(500);

  const leftovers = [];
  for (const flow of flows) {
    await page.evaluate(() => window.__uppi.clearConversation && window.__uppi.clearConversation());
    await page.waitForTimeout(200);
    for (const msg of flow) {
      await page.evaluate((m) => window.__uppi.submit(m, 'test'), msg);
      await page.waitForTimeout(1100);
    }
    const seen = await page.evaluate(() => [...document.querySelectorAll(
      '.uppi-msg--uppi p, .uppi-msg--uppi li, .uppi-chip, .uppi-act span, .uppi-alert-head span, .uppi-band')]
      .map((e) => (e.textContent || '').trim()).filter(Boolean));
    for (const t of seen) {
      if (!/[\u0C00-\u0C7F]/.test(t) && /[a-zA-Z]{4}/.test(t) && !/\((ACT|CAT)\)/.test(t)) leftovers.push(t);
    }
  }
  eq([...new Set(leftovers)].length, 0,
    'nothing he shows a Telugu reader is left in English'
    + (leftovers.length ? ' — ' + [...new Set(leftovers)].slice(0, 3).join(' | ') : ''));

  /* and a mid-session switch is picked up without a reload */
  const back = await page.evaluate(async () => {
    document.documentElement.lang = 'en';
    window.__dcSetTranslator(null);
    await new Promise((r) => setTimeout(r, 400));
    const u = window.__uppi;
    return { lang: u.lang(), stt: u.speech && u.speech.locale };
  });
  eq(back.lang, 'en', 'switching language mid-session is picked up live');
  eq(back.stt, 'en-IN', 'and the microphone follows it back');

  await ctx.close();
}

eq(errors.length, 0, 'no console or page errors anywhere' + (errors.length ? ': ' + errors.join(' | ') : ''));

await browser.close();
app.close();
report('pages');
