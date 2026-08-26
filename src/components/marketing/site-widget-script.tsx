"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { SITE_WIDGET_PUBLIC_ID } from "@/lib/site-widget/ids";

const HIDDEN = ["/dashboard", "/onboarding", "/login", "/signup", "/forgot-password", "/embed", "/l"];

function isMarketingPath(pathname: string) {
  return !HIDDEN.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function SiteWidgetScript() {
  const pathname = usePathname() ?? "/";
  const enabled = isMarketingPath(pathname);

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
