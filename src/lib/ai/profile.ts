import type { VisitorProfile } from "@/lib/domain/types";

const FOCUS_PATTERNS: Array<{ area: string; pattern: RegExp }> = [
  { area: "driver", pattern: /\b(driver|drive[sr]?|off the tee|tee shot|slice|slicing|hook off the tee)\b/i },
  { area: "putting", pattern: /\b(putt(ing|er|s)?|green(s)? reading|three.?putt|3.?putt)\b/i },
  { area: "short_game", pattern: /\b(chip(ping)?|pitch(ing)?|wedge[s]?|short game|around the green|bunker|sand)\b/i },
  { area: "irons", pattern: /\b(iron[s]?|ball.?striking|contact|fat shot|thin shot|topping|chunk)\b/i },
  { area: "course_management", pattern: /\b(course management|strategy|scoring|shoot lower|break (100|90|80))\b/i },
];

/**
 * Pull durable facts about the golfer out of a single message. Only sets
 * fields it finds evidence for; callers merge results into the session profile.
 */
export function extractProfileUpdates(message: string): Partial<VisitorProfile> {
  const updates: Partial<VisitorProfile> = {};
  const text = message.toLowerCase();

  const handicapMatch = text.match(/\b(?:i'?m a|i am a|my handicap is|handicap of|play(?:ing)? off)\s*(?:a\s*)?(\+?\d{1,2}(?:\.\d)?)\s*(?:handicap|hcp|index)?\b/i)
    ?? text.match(/\b(\+?\d{1,2}(?:\.\d)?)\s*(?:handicap|hcp|index)\b/i);
  if (handicapMatch) updates.handicap = handicapMatch[1];

  if (/\b(beginner|never played|just start(ed|ing)|brand new|new to golf|first (lesson|time))\b/.test(text)) {
    updates.experienceLevel = "beginner";
  } else if (/\b(scratch|single digit|competitive|tournament|college golf)\b/.test(text)) {
    updates.experienceLevel = "advanced";
  } else if (/\b(been playing|play(ed)? for|intermediate|weekend golfer)\b/.test(text)) {
    updates.experienceLevel = "intermediate";
  }

  for (const { area, pattern } of FOCUS_PATTERNS) {
    if (pattern.test(message)) {
      updates.focusArea = area;
      break;
    }
  }

  const issueMatch = text.match(/\b(slic\w+|hook\w*|shank\w*|top(?:ping|ped)?|fat shots?|thin shots?|chunk\w*|three.?putt\w*|3.?putt\w*|inconsisten\w+|distance|yips)\b/);
  if (issueMatch) updates.primaryIssue = issueMatch[1];

  if (/\b(online|remote|virtual|video) (lesson|coaching|analysis|review)/.test(text) || /\bsend (you|him|her|coach)? ?(a|my) (video|swing)/.test(text)) {
    updates.coachingPreference = "online";
  } else if (/\bin.?person|come (in|by|out)|at (the|your) (course|range|facility|academy)\b/.test(text)) {
    updates.coachingPreference = "in_person";
  }

  if (/\b(i'?m (local|nearby|in town)|i live (in|near|around)|coming to|visiting|i'?ll be in)\b/.test(text)) {
    updates.isLocal = true;
  }

  const frequencyMatch = text.match(/\bplay (?:about |around )?(once|twice|\d+ times?) (a|per) (week|month|year)\b/);
  if (frequencyMatch) updates.playFrequency = frequencyMatch[0].replace(/^play /, "");

  if (/\b(asap|as soon as possible|this week(end)?|urgent|right away|before (my|a|the) (tournament|trip|season))\b/.test(text)) {
    updates.urgency = "soon";
  }

  const goalMatch = text.match(/\b(?:trying to|want(?:ing)? to|goal is to|hoping to|so i can)\s+([^.!?\n]{5,80})/i);
  if (goalMatch) updates.goals = goalMatch[1].trim();

  return updates;
}

export function describeFocusArea(area?: string): string | undefined {
  if (!area) return undefined;
  const labels: Record<string, string> = {
    driver: "driver",
    putting: "putting",
    short_game: "short game",
    irons: "iron play",
    course_management: "course management",
  };
  return labels[area] ?? area.replaceAll("_", " ");
}

/** Turn a captured miss word into a readable phrase for coach-facing copy. */
export function describeIssue(issue: string): string {
  const key = issue.trim().toLowerCase();
  const labels: Record<string, string> = {
    slice: "a slice",
    slicing: "a slice",
    slices: "a slice",
    hook: "a hook",
    hooking: "a hook",
    hooks: "a hook",
    shank: "shanks",
    shanking: "shanks",
    shanks: "shanks",
    topping: "topping the ball",
    topped: "topping the ball",
    top: "topping the ball",
    "fat shots": "fat shots",
    "fat shot": "fat shots",
    "thin shots": "thin shots",
    "thin shot": "thin shots",
    chunking: "chunking",
    chunk: "chunking",
    yips: "the yips",
    inconsistency: "inconsistency",
    inconsistent: "inconsistency",
    distance: "distance",
  };
  return labels[key] ?? issue.trim();
}
