/*
 * Contact points, in one place.
 *
 * Every CTA Uppi can surface resolves through this module, so the call-centre
 * number and the booking destination are changed in exactly one file rather
 * than hunted through markup. The module is imported by both the browser bundle
 * and the serverless functions, so a number can never drift between what the
 * server recommends and what the button dials.
 */

/* Yashoda call centre, as supplied for the Uppi build. Displayed in the local
   format and dialled in E.164 — a tel: link with spaces is unreliable on some
   Android dialers. */
export const CALL_CENTRE_DISPLAY = '080 6590 6165';
export const CALL_CENTRE_TEL = '+918065906165';

/* Emergency services in India. Uppi never replaces a hospital — when the
   red-flag layer fires, this is the number it puts on screen. */
export const EMERGENCY_DISPLAY = '108';
export const EMERGENCY_TEL = '108';

/* Booking. The site's own appointment route is used rather than a third-party
   widget, so the CTA works offline-of-WhatsApp and keeps the visitor on ŪPIRI.
   TODO(yashoda): swap to the live appointment booking URL when it exists. */
export const BOOK_PATH = '/doctors';
export const BOOK_LABEL = 'Book a Pulmonology Appointment';

/*
 * The call-back request. Uppi offers to have the Yashoda team ring the visitor
 * rather than making them dial — which is the difference between a website that
 * lists a number and one that takes the next step for you.
 *
 * Offered only when the assessment says someone should be seen, and only when
 * `/api/uppi/callback` reports a destination is configured: a form that takes a
 * worried patient's phone number and drops it is worse than no form.
 */
export const CALLBACK_LABEL = 'Ask Yashoda to call me';
export const CALLBACK_PATH = '/api/uppi/callback';

/* Where Uppi sends someone who wants to understand rather than book. */
export const ROUTES = {
  doctors: '/doctors',
  symptomChecker: '/symptom-checker',
  knowledge: '/knowledge-hub',
  procedures: '/tests-and-procedures',
  act: '/asthma-control-test',
  cat: '/copd-assessment-test',
  riskCheck: '/risk-check',
  lungAge: '/lung-age',
  quit: '/rendo-upiri'
};
