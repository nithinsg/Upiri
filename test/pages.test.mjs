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
 *   - the branch selector actually filters the specialists, on a condition page
 *     and on a procedure page alike;
 *   - no consultant is credited with a procedure their own profile never claims,
 *     and no procedure page is a tag that matches the whole department;
 *   - nothing is handed to the speech engine before the browser will allow it,
 *     and no line is ever read out after its moment has passed;
 *   - LungScan is served as its own page, its expertise layer changes with the
 *     finding, and no unverified figure reaches a patient;
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

/* ------------------------------------------- who performs a procedure */

/*
 * The procedure pages' specialists block, which had two independent faults.
 *
 * It rendered `.slice(0, 3)` of an alphabetical array, so fourteen consultants
 * who perform a bronchoscopy became the same first three names — and those
 * three led six of the nine pages. And two of the mappings matched on a tag so
 * broad it caught nearly the whole department, which is the same thing as not
 * mapping at all.
 *
 * Underneath both is one rule worth pinning permanently: a consultant may only
 * be credited with a capability their OWN Yashoda profile states. One was
 * listed for airway stenting on the strength of nothing at all.
 */

describe('Procedures: who performs it, and why they are on that page');

{
  const { ctx, page } = await open(1280, 950);
  await page.addInitScript(() => { window.__UPIRI_NO_UPPI = 1; });
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__dc && window.__dc.app, null, { timeout: 20000 });

  const data = await page.evaluate(() => {
    const app = window.__dc.app;
    return {
      doctors: app.DOCTORS.map((d) => ({
        name: d.name, procs: d.procs,
        /* the transcribed profile, and nothing derived from it */
        profile: [d.expertise, d.services, d.about].join(' ')
      })),
      procs: app.PROCEDURES.map((p) => ({ id: p.id, n: p.n, dp: p.dp }))
    };
  });

  /*
   * What counts as evidence for each capability, in the profiles' own words.
   * Deliberately generous — Yashoda's pages write the same procedure five ways
   * ("Cryobiopsy", "Cryo Biopsy", "cryo-lung biopsy") — because the failure this
   * guards against is not a loose match, it is a tag with NO basis at all.
   */
  const EVIDENCE = {
    Bronchoscopy: /bronchoscop|endoscopy service|thoracic endoscopy/i,
    EBUS: /\bebus\b|endobronchial ultraso/i,
    Cryobiopsy: /cryo\s*-?\s*(lung\s*)?biops/i,
    Thoracoscopy: /thoracoscop|pleurosc/i,
    /* \b matters: "persistent" ends in "stent", and without the boundary this
       rule quietly passed a consultant whose profile never mentions stenting */
    'Airway stenting': /\bstent/i,
    'Bronchial thermoplasty': /thermoplasty/i,
    'Pulmonary function testing': /pulmonary function|spirometry/i,
    /* a sleep SERVICE, not sleep-related conditions: "Pediatric Sleep Breathing
       Disorders" is something a consultant manages, not a lab they run */
    'Sleep study': /sleep (stud|diagnostic|lab|medicine)|polysomnograph/i,
    'Pleural procedures': /pleurodesis|pleural (biops|catheter)|thoracostomy|pleurosc/i,
    'Allergy testing': /allergy (testing|management)|skin prick|skin allergy/i,
    'Critical care': /critical (care|respiratory)|\bards\b|intensive care|\bicu\b/i
  };

  const claimed = new Set();
  data.doctors.forEach((d) => d.procs.forEach((c) => claimed.add(c)));
  for (const cap of [...claimed].sort()) {
    const re = EVIDENCE[cap];
    ok(re, 'the capability "' + cap + '" has a rule for what counts as evidence');
    if (!re) continue;
    const unsourced = data.doctors
      .filter((d) => d.procs.includes(cap) && !re.test(d.profile))
      .map((d) => d.name);
    ok(unsourced.length === 0,
      '"' + cap + '" is only claimed where the profile says so'
      + (unsourced.length ? ' — not for ' + unsourced.join(', ') : ''));
  }

  /*
   * And the other direction, which is the one that actually hid people.
   *
   * The department's Director of Interventional Pulmonology was missing the
   * Bronchoscopy tag and therefore absent from the busiest procedure page in the
   * site, while two consultants whose profiles say "Advanced Sleep Diagnostics"
   * in as many words were missing from the sleep study. Nothing errored; they
   * were simply not there.
   */
  for (const cap of Object.keys(EVIDENCE)) {
    const re = EVIDENCE[cap];
    const untagged = data.doctors
      .filter((d) => re.test(d.profile) && !d.procs.includes(cap))
      .map((d) => d.name);
    ok(untagged.length === 0,
      'everyone whose profile evidences "' + cap + '" is credited with it'
      + (untagged.length ? ' — missing for ' + untagged.join(', ') : ''));
  }

  /* Every procedure must reach someone, and no procedure may be a tag that
     matches the whole department. */
  const roster = {};
  for (const pr of data.procs) {
    const who = data.doctors.filter((d) => d.procs.some((c) => pr.dp.includes(c)));
    roster[pr.id] = who.map((d) => d.name);
    ok(who.length > 0, pr.id + ' names someone who performs it');
  }
  const distinct = new Set(Object.values(roster).map((r) => [...r].sort().join('|')));
  ok(distinct.size >= 4,
    'the procedure pages do not all show the same roster (' + distinct.size + ' distinct lists)');
  ok(roster['airway-procedures'].length < roster.bronchoscopy.length - 2,
    'the airway page is the interventional list, not everyone who owns a bronchoscope ('
    + roster['airway-procedures'].length + ' of ' + roster.bronchoscopy.length + ')');
  ok(roster.cpet.length < roster.bronchoscopy.length,
    'an exercise test is not mapped through critical care (' + roster.cpet.length + ')');

  /* ---- and what the page actually renders ---- */
  const shown = {};
  for (const pr of data.procs) {
    await page.goto(base + '/tests-and-procedures/' + pr.id, { waitUntil: 'load' });
    await page.waitForSelector('[data-rail="proc-docs"]', { timeout: 20000 });
    const seen = await page.evaluate(() =>
      [...document.querySelectorAll('[data-rail="proc-docs"] > *')].map((el) => ({
        name: el.querySelector('h3').textContent.trim(),
        caps: [...el.querySelectorAll('li')].map((li) => li.textContent.trim())
      })));
    shown[pr.id] = seen;
    eq(seen.length, roster[pr.id].length,
      pr.id + ' shows every consultant who performs it, not the first three');
    ok(seen.every((c) => c.caps.length > 0),
      pr.id + ': every card carries the capability that put them there');
  }
  ok(shown.bronchoscopy.length > 3,
    'the bronchoscopy page is no longer capped at three (' + shown.bronchoscopy.length + ')');
  ok(shown['lung-nodule-biopsy'][0].caps.length >= 2,
    'the nodule page leads with someone who lists more than one route to it');

  /* ---- the rail: it has somewhere to go, and it goes there by itself ---- */
  await page.goto(base + '/tests-and-procedures/bronchoscopy', { waitUntil: 'load' });
  await page.waitForSelector('[data-rail="proc-docs"]', { timeout: 20000 });
  await page.evaluate(() => document.querySelector('[data-rail="proc-docs"]')
    .scrollIntoView({ block: 'center' }));
  /* park the pointer away from the rail — a rail under the cursor holds still,
     which is the behaviour the video rail's own test pins */
  await page.mouse.move(4, 4);
  const over = await page.evaluate(() => {
    const el = document.querySelector('[data-rail="proc-docs"]');
    return el.scrollWidth - el.clientWidth;
  });
  ok(over > 100, 'the specialists overflow the rail, so there is something to scroll (' + over + 'px)');
  const advanced = await page
    .waitForFunction(() => document.querySelector('[data-rail="proc-docs"]').scrollLeft > 20,
      null, { timeout: 9000 })
    .then(() => true).catch(() => false);
  ok(advanced, 'the specialists rail advances on its own');

  const branches = await page.locator('#pc-branch option').allTextContents();
  ok(branches.length >= 4, 'the branch selector lists the branches (' + branches.join(', ') + ')');
  eq(branches[0], 'All branches', 'the selector opens on all branches');
  await page.selectOption('#pc-branch', branches[1]);
  await page.waitForTimeout(400);
  const atBranch = await page.evaluate(() =>
    [...document.querySelectorAll('[data-rail="proc-docs"] > *')].map((el) => el.textContent));
  ok(atBranch.length > 0 && atBranch.length < shown.bronchoscopy.length,
    'choosing a branch narrows the list');
  ok(atBranch.every((t) => t.includes(branches[1])),
    'every consultant shown is at the chosen branch');

  /* ---- and it speaks Telugu, count line included ---- */
  await page.goto(base + '/tests-and-procedures/cryobiopsy?lang=te', { waitUntil: 'load' });
  await page.waitForSelector('[data-rail="proc-docs"]', { timeout: 20000 });
  const te = await page.evaluate(() => {
    const head = document.querySelector('[data-rail="proc-docs"]').closest('section');
    return {
      count: head.querySelector('p').textContent.trim(),
      label: head.querySelector('label').textContent.trim(),
      all: head.querySelector('#pc-branch option').textContent.trim()
    };
  });
  const telugu = (s) => /[ఀ-౿]/.test(s);
  ok(telugu(te.count), 'the count line is assembled in Telugu, not left in English (' + te.count + ')');
  ok(telugu(te.label), 'the branch control is in Telugu');
  ok(telugu(te.all), 'and so is "All branches"');

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

/* ------------------------------------------------------ voice, and its timing */

describe('The voice starts with the text, not seconds after it');

{
  /*
   * The desktop symptom was "text instantly, voice much later". Three separate
   * causes, each of which is pinned below:
   *
   *   1. `utterance.voice = <stale object>` THREW before speechSynthesis.speak()
   *      was reached. Chrome repopulates its voice list asynchronously and an
   *      object from the previous list is rejected — so nothing was spoken, and
   *      nothing reported an error. Recovery came only from the watchdog, four
   *      to twenty seconds later.
   *   2. the hosted-voice probe (a GET to a serverless function) was awaited
   *      outright, so a cold start held the greeting with the text on screen.
   *   3. voice scoring PREFERRED network-backed voices, which fetch their audio
   *      before saying a word.
   */
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx2.addInitScript(() => {
    /* plain objects, exactly like the stale ones Chrome rejects */
    const V = [
      { name: 'Google UK English Male', lang: 'en-GB', localService: false },
      { name: 'Microsoft Ravi - English (India)', lang: 'en-IN', localService: true },
      { name: 'Microsoft Heera - English (India)', lang: 'en-IN', localService: true }
    ];
    const ss = window.speechSynthesis;
    ss.getVoices = () => V;
    ss.cancel = () => {}; ss.resume = () => {}; ss.pause = () => {};
    window.__spokeAt = null;
    window.__spokeCount = 0;
    ss.speak = (u) => {
      window.__spokeAt = performance.now();
      window.__spokeCount++;
      setTimeout(() => u.onend && u.onend({}), 150);
    };
  });
  const page2 = await ctx2.newPage();
  await page2.route('**/*', (r) => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
  await page2.goto(base + '/', { waitUntil: 'load' });
  await page2.waitForFunction(() => !!window.__uppi, null, { timeout: 25000 });
  await page2.waitForTimeout(4500);

  eq(await page2.evaluate(() => window.__uppi.tts.voice && window.__uppi.tts.voice.name),
    'Microsoft Ravi - English (India)',
    'a local male voice is chosen over a network one that merely sounds better');

  ok(await page2.evaluate(() => window.__spokeCount > 0),
    'the greeting is actually spoken — a voice object it cannot use is not a reason to say nothing');

  /* a hosted-voice probe that never answers must not hold the browser voice */
  const hung = await page2.evaluate(async () => {
    const u = window.__uppi;
    u.tts._serverReady = new Promise(() => {});
    u.tts.mode = 'browser';
    window.__spokeAt = null;
    const t0 = performance.now();
    u.tts.speak('A reply that should be heard promptly.', {}).catch(() => {});
    for (let i = 0; i < 300; i++) {
      if (window.__spokeAt !== null) return Math.round(window.__spokeAt - t0);
      await new Promise((r) => setTimeout(r, 10));
    }
    return -1;
  });
  ok(hung >= 0 && hung < 1200,
    'a cold-starting speech endpoint cannot stall the voice (' + hung + 'ms)');

  /* and end to end: the voice starts with the reply, not seconds behind it */
  await page2.evaluate(() => { window.__uppi.dismissBubble(); window.__uppi.openPanel(); });
  await page2.waitForTimeout(400);
  const gaps = [];
  for (const msg of ["I'm having trouble breathing", 'About two weeks', "It's getting worse"]) {
    const gap = await page2.evaluate(async (m) => {
      const u = window.__uppi;
      window.__spokeAt = null;
      let textAt = null;
      const before = document.querySelectorAll('.uppi-msg--uppi').length;
      u.submit(m, 'test');
      for (let i = 0; i < 600; i++) {
        if (textAt === null && document.querySelectorAll('.uppi-msg--uppi').length > before) textAt = performance.now();
        if (textAt !== null && window.__spokeAt !== null) break;
        await new Promise((r) => setTimeout(r, 10));
      }
      return (textAt !== null && window.__spokeAt !== null) ? Math.round(window.__spokeAt - textAt) : null;
    }, msg);
    gaps.push(gap);
    await page2.waitForTimeout(300);
  }
  eq(gaps.filter((g) => g === null).length, 0, 'every reply is spoken, not just written');
  ok(gaps.every((g) => g !== null && g < 600),
    'the voice starts with the reply rather than seconds later (' + gaps.join('ms, ') + 'ms)');

  await ctx2.close();
}

/* -------------------------------------- the browser's own gate on speaking */

/*
 * Why Uppi arrived silent, and then spoke far too late.
 *
 * Chrome gates speech synthesis behind user activation and does not say so:
 * `speak()` returns, no error fires, and the engine HOLDS the utterance until
 * the visitor clicks something — then plays it, however stale. So the greeting
 * was never heard on arrival, and turned up minutes later over the top of a
 * live answer.
 *
 * The suite could not see any of this, because the stub above answers `speak()`
 * immediately and Playwright's Chromium reports activation from the first
 * frame. This section models the real policy instead: no voice until a gesture,
 * and a queue that holds and then floods. Every assertion here failed before the
 * fix.
 */

describe('Speaking waits for the browser to allow it, and never says a stale line');

/* the policy, as an init script: activation, and an engine that holds */
const POLICY = () => {
  let active = false;
  const held = [];
  window.__spoken = [];
  window.__queued = [];
  Object.defineProperty(navigator, 'userActivation', {
    configurable: true,
    get: () => ({ get hasBeenActive() { return active; }, get isActive() { return active; } })
  });
  const ss = window.speechSynthesis;
  ss.getVoices = () => [{ name: 'Microsoft Ravi - English (India)', lang: 'en-IN', localService: true }];
  const play = (u) => {
    window.__spoken.push({ text: u.text, at: performance.now() });
    setTimeout(() => { if (u.onstart) u.onstart(new Event('start')); }, 0);
    setTimeout(() => { if (u.onend) u.onend(new Event('end')); }, 30);
  };
  ss.speak = (u) => {
    window.__queued.push({ text: u.text, activation: active });
    if (!active) { held.push(u); return; }        /* Chrome holds it */
    play(u);
  };
  ss.cancel = () => { held.length = 0; };
  ss.pause = () => {}; ss.resume = () => {};
  const wake = () => { if (active) return; active = true; while (held.length) play(held.shift()); };
  for (const e of ['pointerup', 'touchend', 'click', 'keydown']) addEventListener(e, wake, true);
};

async function arrive() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(POLICY);
  const page = await ctx.newPage();
  await page.route('**/*', (r) => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__uppi, null, { timeout: 25000 });
  await page.waitForTimeout(4000);
  return { ctx, page };
}
/* the priming utterance is empty and silent; only real lines count */
const heard = (page) => page.evaluate(() => window.__spoken.map((s) => s.text).filter(Boolean));

{
  const { ctx, page } = await arrive();
  eq(await page.evaluate(() => window.__queued.length), 0,
    'nothing is handed to the engine before the visitor has interacted — a queued line is a time bomb, not a delayed one');
  eq((await heard(page)).length, 0, 'and so nothing is voiced yet');
  ok(await page.evaluate(() => !window.__uppi.states.inputs.isTalking),
    'his mouth is not miming a voice nobody can hear');

  /* the first gesture is the moment it becomes legal */
  await page.mouse.click(640, 760);
  await page.waitForTimeout(900);
  const after = await heard(page);
  eq(after.length, 1, 'at the first gesture he says the greeting, once');
  ok(/Uppi/.test(after[0]), 'and it is the greeting (' + after[0].slice(0, 40) + '…)');
  await ctx.close();
}

{
  /*
   * The desktop reader, which is the case that was still broken.
   *
   * Scrolling is not a gesture. Chrome grants activation on click, key,
   * pointerup and touchend and on NOTHING else, so someone who arrives, scrolls
   * and reads has given no permission at all — and by the time they click, the
   * greeting bubble has dismissed itself. Requiring the bubble to still be on
   * screen meant he never spoke a word on a desktop, while a phone (where the
   * first tap lands early) worked fine.
   */
  const { ctx, page } = await arrive();
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 420); await page.waitForTimeout(400); }
  eq(await page.evaluate(() => navigator.userActivation.hasBeenActive), false,
    'scrolling grants no activation, so the browser still will not let him speak');
  eq((await heard(page)).length, 0, 'and he has still said nothing');

  await page.evaluate(() => window.__uppi.dismissBubble());
  await page.waitForTimeout(500);                 /* the fade-out is 260ms */
  await page.mouse.click(640, 760);
  await page.waitForTimeout(1200);
  const late = await heard(page);
  eq(late.length, 1, 'at their first click he finally speaks, rather than never');
  ok(await page.evaluate(() => {
    const b = document.querySelector('.uppi-bubble');
    return !b.hidden && b.classList.contains('is-in');
  }), 'and the words are back on screen beside him, so the voice is not alone');
  await ctx.close();
}

{
  /* turned away by hand means "not now" — for the voice as well as the bubble */
  const { ctx, page } = await arrive();
  await page.click('.uppi-bubble-dismiss');
  await page.waitForTimeout(1200);
  eq((await heard(page)).length, 0,
    'a visitor who dismissed the bubble is not read to anyway');
  await ctx.close();
}

{
  /* when the first gesture is the one that opens the panel, the greeting
     belongs to the panel — said once, not once per surface */
  const { ctx, page } = await arrive();
  await page.click('.uppi-launcher');
  await page.waitForTimeout(900);
  eq((await heard(page)).length, 1, 'opening the panel greets him aloud, exactly once');

  /* and from here on activation exists, so a reply must land with its text */
  await page.evaluate(() => { window.__spoken.length = 0; });
  await page.fill('.uppi-field', 'I have had a dry cough for three weeks');
  const gap = await page.evaluate(async () => {
    const log = document.querySelector('.uppi-log');
    const before = log.children.length;
    document.querySelector('.uppi-send').click();
    let textAt = null;
    for (let i = 0; i < 600; i++) {
      if (textAt === null && log.children.length > before + 1) textAt = performance.now();
      if (textAt !== null && window.__spoken.length) return Math.round(window.__spoken[0].at - textAt);
      await new Promise((r) => setTimeout(r, 20));
    }
    return null;
  });
  ok(gap !== null, 'the reply is spoken');
  ok(gap !== null && gap < 400,
    'and the voice arrives with the text rather than seconds after it (' + gap + 'ms)');
  await ctx.close();
}

/* ------------------------------------------------------------- LungScan */

/*
 * The LungScan subpage.
 *
 * It is a real file under `public/lungscan/`, not a dc route, so Vercel serves
 * it from the filesystem before the SPA rewrite runs. That distinction is the
 * first thing pinned here: if the fallback ever swallows it, every assertion
 * below fails rather than the page quietly becoming the homepage.
 */

describe('LungScan: its own page, and an expertise layer that changes with the finding');

{
  const { ctx, page } = await open(1280, 950);
  const res = await page.goto(base + '/lungscan', { waitUntil: 'load' });
  eq(res.status(), 200, '/lungscan responds');
  eq(await page.title(), 'ŪPIRI LungScan', 'it is served as its own page, not the SPA fallback');
  eq(await page.locator('x-dc').count(), 0, 'and the dc runtime is not involved in it at all');
  eq(await page.locator('link[rel=canonical]').getAttribute('href'),
    'https://upiri.vercel.app/lungscan', 'it declares its own canonical');
  eq(await page.locator('#s-home .entry').count(), 4, 'the four entry points are there');
  ok(await page.locator('.why .claim').count() === 1, 'and the positioning section that separates Uppi from a general chatbot');

  /* the module has to be different per condition — one generic hospital block
     for every disease is exactly what this replaces */
  const seen = [];
  for (const nth of [0, 2, 5, 9]) {
    await page.goto(base + '/lungscan', { waitUntil: 'load' });
    await page.locator('.entry[data-go="finding"]').click();
    await page.locator('#finding-opts .opt').nth(nth).click();
    await page.locator('#up-sample').click();
    await page.locator('#up-go').click();
    await page.waitForSelector('#rev-out .exp', { timeout: 20000 });
    seen.push({
      headline: await page.locator('.exp .cond').textContent(),
      team: (await page.locator('.exp .team b').allTextContents()).join('|'),
      cta: (await page.locator('.exp .foot .btn-primary').textContent()).trim(),
      ask: await page.locator('.screen.on .convert h2').textContent()
    });
  }
  eq(new Set(seen.map((x) => x.headline)).size, seen.length, 'every finding gets its own headline');
  eq(new Set(seen.map((x) => x.team)).size, seen.length, 'and its own set of relevant disciplines');
  eq(new Set(seen.map((x) => x.cta)).size, seen.length, 'and its own call to action');
  eq(new Set(seen.map((x) => x.ask)).size, seen.length, 'the booking question continues Uppi answer rather than repeating one line');

  /* the layer sits between the explanation and the booking options (§1) */
  const order = await page.evaluate(() =>
    [...document.querySelector('#rev-out').children].map((n) => n.className));
  eq(order.join(' '), 'says result exp convert',
    'the expertise layer sits between the answer and the booking options');

  /*
   * No unverified figure may reach a patient. The proof block is wired for
   * hospital data and switched off until Yashoda supplies it, so a placeholder
   * must never render — "[N]+ cases reviewed" on a hospital page reads either
   * as a broken build or as a number nobody checked.
   */
  const body = await page.locator('body').innerText();
  ok(!/\[N\]/.test(body), 'no placeholder metric is ever shown to a patient');
  ok(!/\b\d+\s*%|success rate|No\.\s*1|world[- ]class/i.test(body),
    'and no outcome rate, ranking or superlative is claimed');

  /* a potentially urgent situation still stops the funnel */
  await page.goto(base + '/lungscan', { waitUntil: 'load' });
  await page.locator('.entry[data-go="symptoms"]').click();
  await page.locator('#sym-opts .opt').first().click();
  await page.locator('#q-why').fill('sudden severe breathlessness since last night');
  await page.locator('#sym-next').click();
  await page.locator('#up-sample').click();
  await page.locator('#up-go').click();
  await page.waitForSelector('#rev-out .urgent', { timeout: 20000 });
  eq(await page.locator('.screen.on .convert').count(), 0,
    'an urgent finding is never routed into the booking funnel');
  eq(await page.locator('.screen.on .exp').count(), 0, 'nor into the expertise pitch');

  /* and the site has to lead there, or nobody arrives */
  await page.goto(base + '/tests-and-procedures', { waitUntil: 'load' });
  await page.waitForSelector('a[href="/lungscan"]', { timeout: 20000 });
  ok(await page.locator('a[href="/lungscan"]').count() >= 2,
    'the site links to LungScan from the tests page and the footer');

  await ctx.close();
}

eq(errors.length, 0, 'no console or page errors anywhere' + (errors.length ? ': ' + errors.join(' | ') : ''));

await browser.close();
app.close();
report('pages');
