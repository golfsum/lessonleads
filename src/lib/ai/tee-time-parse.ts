export interface ParsedTeeTimeRequest {
  date: string;
  players: number;
  timeMin?: string;
  timeMax?: string;
  holes?: 9 | 18;
  locationHint?: string;
  preferredTime?: string;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function ymd(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function atLocalMidnight(base: Date) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate());
}

function addDays(base: Date, days: number) {
  const next = atLocalMidnight(base);
  next.setDate(next.getDate() + days);
  return next;
}

function parseClock(raw: string): string | undefined {
  const match = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/i);
  if (!match) return undefined;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase().replace(/\./g, "");
  if (Number.isNaN(hours) || hours > 23 || minutes > 59) return undefined;
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (!meridiem && hours < 7) hours += 12;
  return `${pad(hours)}:${pad(minutes)}`;
}

function nextWeekday(from: Date, weekday: number) {
  const current = from.getDay();
  const delta = weekday === current ? 7 : (weekday + 7 - current) % 7;
  return addDays(from, delta || 7);
}

/**
 * Extract a tee-time search from natural language. Dates are interpreted in
 * the organization timezone's calendar day when `now` is already localized.
 */
export function parseTeeTimeRequest(message: string, now = new Date()): ParsedTeeTimeRequest | null {
  const text = message.toLowerCase();
  const today = atLocalMidnight(now);

  let date = addDays(today, 1);
  if (/\b(today|this afternoon|this morning|tonight)\b/.test(text)) date = today;
  else if (/\btomorrow\b/.test(text)) date = addDays(today, 1);
  else {
    const weekdayIndex = WEEKDAYS.findIndex((day) => new RegExp(`\\b${day}s?\\b`).test(text));
    if (weekdayIndex >= 0) date = nextWeekday(today, weekdayIndex);
  }

  const isoDate = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoDate) {
    const parsed = new Date(`${isoDate[1]}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  let players = 4;
  const playerMatch =
    text.match(/\b(for|party of|foursome of|group of)\s*(one|two|three|four|1|2|3|4)\b/) ??
    text.match(/\b(one|two|three|four|1|2|3|4)\s*(players?|golfers?|people|of us)\b/) ??
    text.match(/\bfoursome\b/) ??
    text.match(/\bsingle\b|\bjust me\b|\bsolo\b/);
  if (playerMatch) {
    const token = (playerMatch[2] ?? playerMatch[1] ?? playerMatch[0]).toLowerCase();
    if (token === "one" || token === "1" || token === "single" || token === "just me" || token === "solo") players = 1;
    else if (token === "two" || token === "2") players = 2;
    else if (token === "three" || token === "3") players = 3;
    else if (token === "four" || token === "4" || token.includes("foursome")) players = 4;
  }

  let timeMin: string | undefined;
  let timeMax: string | undefined;
  let preferredTime: string | undefined;

  if (/\bmorning\b/.test(text)) {
    timeMin = "06:00";
    timeMax = "11:30";
  } else if (/\bafternoon\b/.test(text)) {
    timeMin = "12:00";
    timeMax = "16:00";
  } else if (/\b(evening|twilight|after 3)\b/.test(text)) {
    timeMin = "15:00";
    timeMax = "19:30";
  }

  const around = text.match(/\baround\s+(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i);
  const after = text.match(/\bafter\s+(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i);
  const before = text.match(/\bbefore\s+(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i);
  const between = text.match(/\bbetween\s+(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)\s+and\s+(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i);

  if (between) {
    timeMin = parseClock(between[1]);
    timeMax = parseClock(between[2]);
  } else if (around) {
    preferredTime = parseClock(around[1]);
    if (preferredTime) {
      const [hours, minutes] = preferredTime.split(":").map(Number);
      const start = new Date(today);
      start.setHours(hours, minutes - 90, 0, 0);
      const end = new Date(today);
      end.setHours(hours, minutes + 90, 0, 0);
      timeMin = `${pad(Math.max(5, start.getHours()))}:${pad(start.getMinutes())}`;
      timeMax = `${pad(Math.min(20, end.getHours()))}:${pad(end.getMinutes())}`;
    }
  } else if (after) {
    timeMin = parseClock(after[1]);
  } else if (before) {
    timeMax = parseClock(before[1]);
  }

  const holes = /\b9[\s-]?holes?\b/.test(text) ? 9 : /\b18[\s-]?holes?\b/.test(text) ? 18 : undefined;
  const locationHint = text.match(/\b(north|south|east|west|championship|executive|links|parkland)\s+course\b/)?.[0];

  return {
    date: ymd(date),
    players,
    timeMin,
    timeMax,
    holes,
    locationHint,
    preferredTime,
  };
}
