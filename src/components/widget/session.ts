"use client";

import type { UtmValues } from "@/lib/domain/types";

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function storageGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Storage may be unavailable (private mode / blocked third-party). Fall back to memory.
  }
}

export interface WidgetSession {
  visitorId: string;
  sessionId: string;
  conversationId: string | null;
  leadCaptured: boolean;
  leadId: string | null;
}

export interface PageContext {
  page?: string;
  referrer?: string;
  utm?: UtmValues;
  device: "mobile" | "desktop";
}

const memory: Record<string, string> = {};

function persistentGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  return storageGet(window.localStorage, key) ?? memory[key] ?? null;
}

function persistentSet(key: string, value: string) {
  memory[key] = value;
  if (typeof window !== "undefined") storageSet(window.localStorage, key, value);
}

export function loadSession(publicId: string): WidgetSession {
  const prefix = `ll:${publicId}`;
  let visitorId = persistentGet(`${prefix}:visitor`);
  if (!visitorId) {
    visitorId = randomId();
    persistentSet(`${prefix}:visitor`, visitorId);
  }
  // widget.js passes its own session id so loader events (widget_view) and
  // iframe events (widget_open, chat) count as one session.
  const paramSession =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("sid") : null;
  let sessionId = paramSession || (typeof window !== "undefined" ? storageGet(window.sessionStorage, `${prefix}:session`) : null);
  if (!sessionId) {
    sessionId = randomId();
    if (typeof window !== "undefined") storageSet(window.sessionStorage, `${prefix}:session`, sessionId);
  }
  return {
    visitorId,
    sessionId,
    conversationId: persistentGet(`${prefix}:conversation`),
    leadCaptured: persistentGet(`${prefix}:leadCaptured`) === "true",
    leadId: persistentGet(`${prefix}:leadId`),
  };
}

export function saveConversationId(publicId: string, conversationId: string) {
  persistentSet(`ll:${publicId}:conversation`, conversationId);
}

export function saveLeadCaptured(publicId: string, leadId: string) {
  persistentSet(`ll:${publicId}:leadCaptured`, "true");
  persistentSet(`ll:${publicId}:leadId`, leadId);
}

/** Page/UTM context. Inside the embed iframe, widget.js passes the host page via query params. */
export function readPageContext(): PageContext {
  if (typeof window === "undefined") return { device: "desktop" };
  const params = new URLSearchParams(window.location.search);
  const hostPage = params.get("page") ?? (document.referrer || undefined);
  const utm: UtmValues = {};
  for (const key of ["source", "medium", "campaign"] as const) {
    const value = params.get(`utm_${key}`);
    if (value) utm[key] = value.slice(0, 120);
  }
  return {
    page: hostPage?.slice(0, 500),
    referrer: params.get("ref")?.slice(0, 500) || undefined,
    utm: Object.keys(utm).length > 0 ? utm : undefined,
    device: window.matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop",
  };
}

export function sendWidgetEvent(input: {
  coachId: string;
  name: string;
  sessionId: string;
  conversationId?: string | null;
  leadId?: string | null;
  properties?: Record<string, string | number | boolean | null>;
}) {
  try {
    void fetch("/api/public/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        coachId: input.coachId,
        name: input.name,
        sessionId: input.sessionId,
        conversationId: input.conversationId ?? undefined,
        leadId: input.leadId ?? undefined,
        page: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("page") ?? undefined : undefined,
        properties: input.properties,
      }),
      keepalive: true,
    });
  } catch {
    // Analytics must never break the widget.
  }
}
