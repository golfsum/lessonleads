import { intentLevelForScore, type IntentLevel } from "@/lib/domain/types";

interface IntentSignal {
  pattern: RegExp;
  points: number;
}

/**
 * Buying-intent signals. Points accumulate across a conversation and are
 * clamped to 0-100. The score is used for sorting and automation, never
 * exposed to visitors as fact.
 */
const SIGNALS: IntentSignal[] = [
  { pattern: /\bhow much (is|are|do|does|would)|\bprice[s]?\b|\bcost[s]?\b|\brates?\b|\bpricing\b/i, points: 25 },
  { pattern: /\b(are you|is (he|she|coach)) available|\bavailability\b|\bopenings?\b|\bschedule (a|my)\b/i, points: 30 },
  { pattern: /\bbook(ing)?( a| my| the)? (lesson|session|analysis|time)|\bsign(ing)? up\b|\bhow do i (book|get started|start)\b/i, points: 35 },
  { pattern: /\b(do you|does (he|she|coach \w+)) (offer|do|teach|have)\b/i, points: 15 },
  { pattern: /\bneed (someone|a coach|help|a pro) (to|who can)? ?(look|check|fix|watch)/i, points: 30 },
  { pattern: /\b(upload|send|share) (you |him |her |coach \w+ )?(a |my )?(swing|video)\b/i, points: 30 },
  { pattern: /\bonline (lesson|coaching|analysis|review)s?\b/i, points: 20 },
  { pattern: /\b(i'?m|i am|i'?ll be) (coming|visiting|in town|traveling) (to|next|this)?/i, points: 25 },
  { pattern: /\b(been (fighting|struggling|dealing|battling)|for (months|years)|so frustrated|tried everything|at my wit)/i, points: 20 },
  { pattern: /\b(lesson|coaching) (package|plan|program)s?\b/i, points: 20 },
  { pattern: /\bgift (certificate|card|voucher)\b/i, points: 20 },
  { pattern: /\b(this|next) (week|weekend|month|saturday|sunday)\b/i, points: 15 },
  { pattern: /\bjunior|my (son|daughter|kid|child)\b/i, points: 10 },
  { pattern: /\bwhere (are you|do you teach|is the)\b|\blocation\b|\bdirections\b/i, points: 15 },
  { pattern: /\b(tee times?|tee sheet|foursome|book(ing)? golf)\b/i, points: 35 },
  { pattern: /\b(membership|join the club|member dues)\b/i, points: 30 },
  { pattern: /\b(tournament|outing|scramble|corporate golf|host (a |an )?(event|outing))\b/i, points: 40 },
];

/** Points earned by a single visitor message. */
export function scoreMessageIntent(message: string): number {
  let points = 0;
  for (const signal of SIGNALS) {
    if (signal.pattern.test(message)) points += signal.points;
  }
  // Base engagement credit: a substantive question shows some interest.
  if (points === 0 && message.trim().length > 12) points = 4;
  return Math.min(points, 60);
}

export function accumulateIntent(currentScore: number, message: string): { score: number; level: IntentLevel } {
  const score = Math.max(0, Math.min(100, currentScore + scoreMessageIntent(message)));
  return { score, level: intentLevelForScore(score) };
}

/** Actions outside chat that indicate intent. */
export const ACTION_INTENT_POINTS = {
  swingUploadStarted: 20,
  swingUploaded: 35,
  serviceViewed: 8,
  bookingClicked: 40,
  videoViewed: 4,
} as const;
