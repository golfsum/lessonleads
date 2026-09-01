import { isCourseLike } from "@/lib/domain/organization";
import type { OrganizationType } from "@/lib/domain/types";

export type VisitorIntent =
  | "greeting"
  | "tee_time_search"
  | "membership"
  | "tournament"
  | "lesson"
  | "swing_upload"
  | "swing_help"
  | "factual_business"
  | "booking"
  | "other";

const TEE_TIME =
  /\b(tee\s*times?|tee\s*sheet|book(ing)? golf|play(?:ing)? (?:golf|tomorrow|today|saturday|sunday)|foursome|available times?|anything (tomorrow|today|saturday|this weekend)|times? (tomorrow|today|saturday)|around \d{1,2}.*(for|players)|after \d{1,2}.*(for|players|tee))\b/i;

const MEMBERSHIP = /\b(membership|join the club|become a member|member dues|how much.*(member|dues))\b/i;

const TOURNAMENT =
  /\b(tournament|outing|scramble|corporate (golf|event)|company (golf|outing|event)|host (a |an )?.{0,40}?(event|outing|tournament)|group of \d{2,}|wedding|banquet)\b/i;

const SWING_UPLOAD =
  /\b(upload|send|share)\b.*\b(swing|video)\b|\bswing (review|analysis|upload)\b/;

const SWING_HELP =
  /\b(slice|hook|shank|putt|chip|pitch|bunker|driver|iron|wedge|swing|contact|top|thin|fat|chunk|distance|draw|fade|grip|stance|backswing|downswing|tempo|yips|three.?putt|3.?putt|break \d+|handicap|consisten)\w*\b/;

const PLAN_QUESTION =
  /\bplans?\b[\s\S]{0,100}\b(?:includ\w*|feature\w*|come\s+with|cost\w*|price\w*)\b|\b(?:includ\w*|feature\w*|come\s+with|cost\w*|price\w*)\b[\s\S]{0,100}\bplans?\b/i;

const COMPATIBILITY_QUESTION = /\b(?:will|does|can|is)\b[\s\S]{0,80}\bwork\s+with\b|\bcompatible\s+with\b|\bintegrat\w*\s+with\b/i;

const HOW_IT_WORKS_QUESTION = /\bhow\s+(?:does|do|will)\b[\s\S]{0,100}\bwork\b/i;

const FACTUAL =
  /\bhow much|price[sd]?|pricing|cost[s]?|rates?\b|\b(where|location|address|directions)\b|\b(cancel+ation|refund|reschedul|policy|policies|dress code)\b|\bdo (you|they)\b.*\b(offer|have|rent|include|allow)\b|\b(available|availability|openings?|hours|open today)\b|\b(junior|kids?|children)\b|\bcarts? included\b|\bwalk(ing)? allowed\b|\bclub rentals?\b|\bdriving range\b|\btwilight\b|\brestaurant\b|\blessons?\b/;

export function classifyVisitorIntent(message: string, organizationType: OrganizationType = "golf_coach"): VisitorIntent {
  const text = message.toLowerCase().trim();
  if (/^(hi|hello|hey|yo|howdy|good (morning|afternoon|evening))\b[.! ]*$/.test(text)) return "greeting";

  if (isCourseLike(organizationType) && TEE_TIME.test(text) && !/\bmembership|lesson|instruction|tournament|outing\b/.test(text)) {
    return "tee_time_search";
  }
  if (isCourseLike(organizationType) && /\b(any(thing)?|what.*(have|got)|can i play|need a time|looking for (a )?time)\b/.test(text) && /\b(today|tomorrow|morning|afternoon|saturday|sunday|tee|players?|foursome|\d\s*(am|pm))\b/.test(text)) {
    return "tee_time_search";
  }

  if (MEMBERSHIP.test(text)) return "membership";
  if (TOURNAMENT.test(text)) return "tournament";
  if (SWING_UPLOAD.test(text) && !/\bhow much|price|cost\b/.test(text)) return "swing_upload";

  if (isCourseLike(organizationType) && /\b(lesson|instruction|teaching pro|golf pro)\b/.test(text)) return "lesson";
  if (PLAN_QUESTION.test(text) || COMPATIBILITY_QUESTION.test(text) || (HOW_IT_WORKS_QUESTION.test(text) && !SWING_HELP.test(text)) || FACTUAL.test(text)) {
    return "factual_business";
  }
  if (/\b(book|booking|schedule|sign ?up|get started|work with|lesson with)\b/.test(text)) return "booking";
  if (SWING_HELP.test(text)) return "swing_help";
  if (/\blessons?\b/.test(text)) return "lesson";
  return "other";
}

export function isPlanQuestion(message: string): boolean {
  return PLAN_QUESTION.test(message);
}

export function isHowItWorksQuestion(message: string): boolean {
  return HOW_IT_WORKS_QUESTION.test(message) && !SWING_HELP.test(message);
}
