import "server-only";

import { createHash } from "node:crypto";

export function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "local";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return createHash("sha256").update(`${address}:${userAgent}`).digest("hex");
}

export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    /* request.url should always parse */
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).origin);
    } catch {
      /* ignore malformed env */
    }
  }
  if (allowed.size === 0) return process.env.NODE_ENV !== "production";
  try {
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function safeBookingUrl(value: string) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}
