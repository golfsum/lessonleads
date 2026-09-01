"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { SITE_WIDGET_PUBLIC_ID } from "@/lib/site-widget/ids";

const HIDDEN = ["/admin", "/dashboard", "/onboarding", "/login", "/signup", "/forgot-password", "/embed", "/l"];
const SITE_VISITOR_KEY = "ll:lessonleads:site-visitor";
const SITE_SESSION_KEY = `ll:${SITE_WIDGET_PUBLIC_ID}:host-session`;
const LAST_PAGE_VIEW_KEY = "ll:lessonleads:last-page-view";
const PAGE_VIEW_SEQUENCE_KEY = "ll:lessonleads:page-view-sequence";

function isMarketingPath(pathname: string) {
  return !HIDDEN.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function randomId() {
  return window.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function storageId(storage: Storage, key: string) {
  const current = storage.getItem(key);
  if (current) return current;
  const created = randomId();
  storage.setItem(key, created);
  return created;
}

function pageViewPayload(pathname: string) {
  const visitorId = storageId(window.localStorage, SITE_VISITOR_KEY);
  const sessionId = storageId(window.sessionStorage, SITE_SESSION_KEY);
  const now = Date.now();
  const previous = window.sessionStorage.getItem(LAST_PAGE_VIEW_KEY)?.split("|");
  if (previous?.[0] === pathname && now - Number(previous[1] ?? 0) < 1_000) return null;
  window.sessionStorage.setItem(LAST_PAGE_VIEW_KEY, `${pathname}|${now}`);

  const sequence = Number(window.sessionStorage.getItem(PAGE_VIEW_SEQUENCE_KEY) ?? 0) + 1;
  window.sessionStorage.setItem(PAGE_VIEW_SEQUENCE_KEY, String(sequence));
  const params = new URLSearchParams(window.location.search);
  const properties = {
    utmSource: params.get("utm_source")?.slice(0, 120) || undefined,
    utmMedium: params.get("utm_medium")?.slice(0, 120) || undefined,
    utmCampaign: params.get("utm_campaign")?.slice(0, 120) || undefined,
  };

  return {
    visitorId,
    sessionId,
    path: pathname,
    referrer: document.referrer.slice(0, 500) || undefined,
    idempotencyKey: `page-view:${sessionId}:${sequence}`,
    properties,
  };
}

export function SiteWidgetScript() {
  const pathname = usePathname() ?? "/";
  const enabled = isMarketingPath(pathname);

  useEffect(() => {
    if (!enabled) return;
    try {
      const payload = pageViewPayload(pathname);
      if (!payload) return;
      void fetch("/api/public/site-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // Analytics must never interfere with the marketing site or support widget.
    }
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;
    if (document.querySelector(`script[data-coach="${SITE_WIDGET_PUBLIC_ID}"]`)) return;

    const script = document.createElement("script");
    script.src = "/widget.js";
    script.async = true;
    script.dataset.coach = SITE_WIDGET_PUBLIC_ID;
    document.body.appendChild(script);

    return () => {
      script.remove();
      document.querySelectorAll("[data-lessonleads-root]").forEach((node) => node.remove());
      const loaded = window as Window & { __lessonleadsLoaded?: string };
      if (loaded.__lessonleadsLoaded === SITE_WIDGET_PUBLIC_ID) delete loaded.__lessonleadsLoaded;
    };
  }, [enabled]);

  return null;
}
