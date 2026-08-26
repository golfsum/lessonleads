type Bucket = { count: number; resetsAt: number };

const globalBuckets = globalThis as typeof globalThis & { lessonLeadsRateLimits?: Map<string, Bucket> };
const buckets = globalBuckets.lessonLeadsRateLimits ?? new Map<string, Bucket>();
globalBuckets.lessonLeadsRateLimits = buckets;

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const current = buckets.get(key);
  if (!current || current.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  current.count += 1;
  const allowed = current.count <= limit;
  return { allowed, remaining: Math.max(limit - current.count, 0), retryAfterSeconds: Math.max(Math.ceil((current.resetsAt - now) / 1000), 1) };
}

export function clearRateLimitsForTests() { buckets.clear(); }
