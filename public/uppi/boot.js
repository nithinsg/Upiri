/*
 * Uppi's entry point.
 *
 * Deliberately tiny and deliberately late. §24 is explicit that the site must
 * stay fast whether or not Uppi has loaded, so nothing here is imported
 * statically: the character, the motion layer, the voice layer and the whole
 * knowledge core arrive through one dynamic import, after the page has settled
 * or the moment the visitor touches anything — whichever comes first. The
 * stylesheet is fetched at the same time and never blocks first paint.
 *
 * It also declines to run at all in three cases:
 *   - during prerendering, so no route ships a frozen Uppi in its HTML;
 *   - when the page opts out via window.__UPIRI_NO_UPPI;
 *   - on a browser without dynamic import or Web Animations, where the rig
 *     could not move anyway.
 */

(function () {
  'use strict';

  if (window.__UPIRI_NO_UPPI) return;
  if (window.__uppiBooted) return;
  window.__uppiBooted = true;

  /* The rig is transform-driven and the entrance is a WAAPI timeline; without
     Element.animate there is nothing to degrade to, so Uppi stays away rather
     than appearing as a static sticker in the corner. */
  if (typeof Element === 'undefined' || !Element.prototype.animate) return;

  var started = false;

  function styles() {
    if (document.querySelector('link[data-uppi-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/uppi/uppi.css';
    link.setAttribute('data-uppi-css', '');
    document.head.appendChild(link);
  }

  function start() {
    if (started) return;
    started = true;
    off();
    styles();
    import('./chat.js')
      .then(function (mod) {
        var chat = new mod.UppiChat();
        chat.mount(document.body);
        /* exposed so the site — and the acceptance tests — can reach the
           character without reaching through the DOM */
        window.__uppi = chat;
        return chat.enter();
      })
      .catch(function (err) {
        /* Uppi failing to load must never take the page with him. */
        console.error('[uppi] could not start:', err && err.message);
      });
  }

  var EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'];

  function off() {
    for (var i = 0; i < EVENTS.length; i++) window.removeEventListener(EVENTS[i], start);
  }

  for (var i = 0; i < EVENTS.length; i++) window.addEventListener(EVENTS[i], start, { passive: true, once: true });

  /* Otherwise: once the page has finished loading and the main thread is free.
     The timeout is the floor for browsers without requestIdleCallback and the
     ceiling for ones whose idle never comes. */
  function schedule() {
    if (window.requestIdleCallback) window.requestIdleCallback(start, { timeout: 1800 });
    else setTimeout(start, 1000);
  }

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();
