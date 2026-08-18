/*
 * Deterministic response composition.
 *
 * Uppi's answer is assembled here from the triage decision and the curated
 * knowledge entries. When a model is configured it rewrites this in Uppi's
 * voice; when one is not — no key, an outage, a rate limit, or a response that
 * failed safety validation — this text ships as-is.
 *
 * So this is not a placeholder. It is the floor: the worst answer Uppi can
 * give is still a real, sourced, correctly-triaged one. That is the only
 * arrangement in which a health assistant should be allowed to depend on a
 * remote model at all.
 *
 * Structure of every composed reply, in order:
 *   1. an acknowledgement, when there is an emotion to acknowledge (§18)
 *   2. what is actually known about the symptom, from the knowledge layer
 *   3. what the triage decision means, in plain instruction form
 *   4. one question — never a list of them (§17)
 */

import { normalise } from './redflags.js';
import { retrieve } from './knowledge.js';
import { present } from './safety.js';
import { CALL_CENTRE_DISPLAY } from './contact.js';

/* ---------------------------------------------------------------------------
   Empathy
   --------------------------------------------------------------------------- */

const FEELINGS = [
  {
    id: 'frightened',
    re: /\b(?:scared|frightened|afraid|terrified|panic\w*|anxious|anxiety|worried sick|freaking out)\b/,
    line: 'I understand why that would worry you. Let\'s take this one step at a time.'
  },
  {
    id: 'worried',
    re: /\b(?:worried|worry|concerned|nervous|stressed)\b/,
    line: 'That\'s a reasonable thing to be worried about, and it\'s worth working through properly.'
  },
  {
    id: 'exhausted',
    re: /\b(?:exhausted|tired of|fed up|sick of|frustrat\w*|can not cope|cannot cope|had enough)\b/,
    line: 'That sounds wearing — dealing with it day after day takes something out of you.'
  },
  {
    id: 'guilt',
    /* Someone volunteering a smoking history is trusting you with it. §18: never
       judge, and say so without making a speech about it. */
    re: /\b(?:i smoke|i have been smoking|been smoking|i used to smoke|my fault|i know i should|guilty|ashamed)\b/,
    line: 'Thank you for being open about that — it genuinely helps me understand the bigger picture, and it\'s not something to be judged for.'
  },
  {
    id: 'parent',
    re: /\bmy (?:son|daughter|child|kid|baby|boy|girl)\b/,
    line: 'Watching your child struggle to breathe is frightening — let\'s work out what it needs.'
  },
  {
    id: 'sleepless',
    re: /\b(?:not slept|can not sleep|cannot sleep|up all night|awake all night|no sleep)\b/,
    line: 'Losing sleep to it makes everything harder. Let\'s see what\'s going on.'
  }
];

function acknowledgement(text) {
  const hit = FEELINGS.find((f) => f.re.test(text));
  return hit ? hit.line : '';
}

/* ---------------------------------------------------------------------------
   What the decision means, said plainly
   --------------------------------------------------------------------------- */

function reasonPhrase(reasons) {
  if (!reasons || !reasons.length) return '';
  if (reasons.length === 1) return reasons[0];
  return reasons.slice(0, -1).join(', ') + ' and ' + reasons[reasons.length - 1];
}

function verdict(decision) {
  const because = reasonPhrase(decision.reasons);
  switch (decision.urgency) {
    case 'urgent':
      return because
        ? 'Because of ' + because + ', I would not leave this for next week — please arrange to be seen today or tomorrow morning at the latest.'
        : 'I would not leave this for next week — please arrange to be seen today or tomorrow morning at the latest.';
    case 'doctor':
      return because
        ? 'Because of ' + because + ', I think it would be a good idea to speak with a pulmonologist. If you\'d like, I can help you take the next step.'
        : 'I think it would be a good idea to speak with a pulmonologist. If you\'d like, I can help you take the next step.';
    case 'routine':
      return 'Nothing you\'ve described so far points to something that needs urgent attention. Keep an eye on how it changes over the next week — if it isn\'t settling, or anything new starts, that changes the answer.';
    default:
      return '';
  }
}

/* ---------------------------------------------------------------------------
   Composition
   --------------------------------------------------------------------------- */

/**
 * @param {object} args
 * @param {string} args.message the visitor's latest message
 * @param {object} args.extraction merged extraction
 * @param {object} args.decision triage result
 * @param {Array}  args.entries retrieved knowledge entries
 * @returns {string}
 */
export function compose({ message, extraction, decision, entries }) {
  const text = normalise(message);
  const parts = [];

  const ack = acknowledgement(text);
  if (ack) parts.push(ack);

  /* The knowledge entry carries the substance. One paragraph of it for a short
     exchange, two when the visitor has given enough that a fuller answer is
     warranted — never the whole entry, which would be an essay (§17). */
  const source = (entries && entries.length) ? entries[0] : (retrieve(text, extraction.symptoms, 1)[0] || null);
  if (source) {
    const depth = extraction.symptoms.length > 1 || (extraction.durationDays != null) ? 2 : 1;
    parts.push(source.plain.slice(0, depth).join(' '));
  }

  /* A reassuring verdict only makes sense once there is something to reassure
     about. "Nothing you've described needs urgent attention" in reply to "hi"
     is the kind of line that makes a companion sound like a form. */
  const v = (decision.urgency === 'routine' && !extraction.symptoms.length) ? '' : verdict(decision);
  if (v) parts.push(v);

  /* Nothing matched at all — a greeting, an off-topic message, or something the
     extraction could not read. Say what Uppi is for and ask, rather than
     answering a question nobody asked. */
  if (!source && !extraction.symptoms.length) {
    parts.push("I'm here for anything to do with breathing and lungs — a cough, a wheeze, breathlessness, allergies, sleep, smoking, or a test you've been asked to have.");
    parts.push('What have you been noticing?');
    return present(parts.join('\n\n'));
  }

  if (decision.followUp) parts.push(decision.followUp);

  return present(parts.join('\n\n'));
}

/**
 * The urgent state. Composed separately because it must not be structured like
 * a normal answer: the instruction comes first, and nothing is stacked on top
 * of it (§7).
 */
export function composeUrgent(opening, crisis) {
  if (crisis) return present(opening);
  return present(
    opening + '\n\n' +
    'Go to the nearest emergency department now, or call 108 for an ambulance. If you are struggling to breathe, do not drive yourself — ask someone to take you.\n\n' +
    'The Yashoda call centre is ' + CALL_CENTRE_DISPLAY + ' if you need help getting there. I\'ll stay here, but please make the call first.'
  );
}

/**
 * Uppi's opening line. Fixed wording from §2 of the brief — not generated, not
 * varied, because it is the character's introduction.
 */
export const GREETING = "Hi, I'm Uppi, your lung partner. Tell me what's bothering you, and we'll figure out what to do next.";
