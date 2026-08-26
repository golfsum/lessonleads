/**
 * Widget domain allowlisting. The embed iframe lives on the LessonLeads origin,
 * so chat requests cannot be gated on the fetch Origin header alone. We also
 * check the host page URL the loader reports, plus Referer when present.
 */

export function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export function hostFromUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return normalizeDomain(new URL(candidate).hostname);
  } catch {
    return null;
  }
}

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

export function isAllowedHost(host: string | null, allowedOrigins: string[], appUrl?: string): boolean {
  if (!host) return allowedOrigins.length === 0;
  if (isLocalHost(host)) return true;
  const appHost = hostFromUrl(appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "");
  if (appHost && host === appHost) return true;
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.some((domain) => {
    const allowed = normalizeDomain(domain);
    if (!allowed) return false;
    return host === allowed || host.endsWith(`.${allowed}`);
  });
}

export function widgetOriginAllowed(input: {
  origin?: string | null;
  page?: string | null;
  referrer?: string | null;
  allowedOrigins: string[];
  appUrl?: string;
}): boolean {
  const appUrl = input.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const appHost = hostFromUrl(appUrl);
  const originHost = hostFromUrl(input.origin);
  const pageHost = hostFromUrl(input.page) ?? hostFromUrl(input.referrer);

  // Chat and events run from the LessonLeads iframe, so Origin is our app.
  // The host page URL is the real site that must match the allowlist.
  if (originHost && appHost && originHost === appHost) {
    if (pageHost) return isAllowedHost(pageHost, input.allowedOrigins, appUrl);
    return true;
  }

  const hosts = [originHost, pageHost].filter((host): host is string => Boolean(host));
  if (hosts.length === 0) {
    return input.allowedOrigins.length === 0;
  }
  return hosts.some((host) => isAllowedHost(host, input.allowedOrigins, appUrl));
}
