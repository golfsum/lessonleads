const cache = new Map<string, { expiresAt: number; value: unknown }>();
const DEFAULT_TTL_MS = 45_000;

export function cacheKey(parts: Array<string | number | undefined | null>) {
  return parts.map((part) => String(part ?? "")).join("|");
}

export function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
