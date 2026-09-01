import "server-only";

import { extractFaqs, extractPage, type ExtractedFaq, type ExtractedPage } from "./extract";

const MAX_PAGES = 20;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 1_500_000;
const USER_AGENT = "LessonLeadsBot/1.0 (+https://lessonleads.com/bot)";

/** Paths that usually hold coaching content, in priority order. */
const PRIORITY_PATTERNS = [
  /faq|help|knowledge|questions/i,
  /tee-?times?|book|reserv/i,
  /rates?|green-?fees?|pric|twilight/i,
  /membership|join/i,
  /about|bio|meet|course|scorecard|layout/i,
  /lesson|coaching|instruction|teach|program|academy|school/i,
  /event|outing|tournament|wedding/i,
  /restaurant|grill|dining|menu/i,
  /practice|range|simulator/i,
  /pro-?shop|contact|location|hours|directions/i,
  /service|offer/i,
  /blog|article|tip|drill|resource|guide/i,
];

const SKIP_PATTERNS = [
  /\.(pdf|jpe?g|png|gif|webp|svg|mp4|mov|zip|css|js|xml|ico|woff2?)($|\?)/i,
  /\/(wp-admin|wp-login|cart|checkout|account|login|signup|privacy|terms|cookie)/i,
  /\/(tag|category|author|page)\/\d*/i,
  /[?&](replytocom|share|print)=/i,
];

export interface ScannedPage {
  url: string;
  title: string;
  description?: string;
  text: string;
  looksLikeFaq: boolean;
  faqs: ExtractedFaq[];
}

export interface WebsiteScanResult {
  baseUrl: string;
  pages: ScannedPage[];
  detected: {
    siteName?: string;
    imageUrl?: string;
    logoUrl?: string;
    themeColor?: string;
    socialLinks: ExtractedPage["socialLinks"];
    youtubeLinks: string[];
    bookingLinks: string[];
  };
  errors: Array<{ url: string; message: string }>;
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("xhtml")) {
      throw new Error(`Not HTML (${contentType.split(";")[0] || "unknown"})`);
    }
    const text = await response.text();
    return text.length > MAX_HTML_BYTES ? text.slice(0, MAX_HTML_BYTES) : text;
  } finally {
    clearTimeout(timer);
  }
}

interface RobotsRules {
  disallowed: string[];
}

async function fetchRobots(origin: string): Promise<RobotsRules> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { "user-agent": USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return { disallowed: [] };
    const body = await response.text();
    const disallowed: string[] = [];
    let applies = false;
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.replace(/#.*$/, "").trim();
      if (!line) continue;
      const [directiveRaw, ...valueParts] = line.split(":");
      const directive = directiveRaw.toLowerCase().trim();
      const value = valueParts.join(":").trim();
      if (directive === "user-agent") {
        applies = value === "*" || value.toLowerCase().includes("lessonleads");
      } else if (applies && directive === "disallow" && value) {
        disallowed.push(value);
      }
    }
    return { disallowed };
  } catch {
    return { disallowed: [] };
  }
}

function isAllowed(url: URL, rules: RobotsRules): boolean {
  const path = url.pathname + url.search;
  return !rules.disallowed.some((rule) => path.startsWith(rule));
}

function priorityFor(url: string): number {
  for (let index = 0; index < PRIORITY_PATTERNS.length; index += 1) {
    if (PRIORITY_PATTERNS[index].test(url)) return index;
  }
  return PRIORITY_PATTERNS.length;
}

export function normalizeWebsiteUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (!url.hostname.includes(".")) return null;
    // Block obvious internal/private targets. Public coach sites are always public hosts.
    if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|\[::1\])/.test(url.hostname)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Crawl a coach website: homepage first, then same-origin pages that look like
 * coaching content, respecting robots.txt and hard page/time limits.
 */
export async function scanWebsite(websiteUrl: string): Promise<WebsiteScanResult> {
  const normalized = normalizeWebsiteUrl(websiteUrl);
  if (!normalized) throw new Error("INVALID_URL");
  const base = new URL(normalized);
  const robots = await fetchRobots(base.origin);

  const result: WebsiteScanResult = {
    baseUrl: base.toString(),
    pages: [],
    detected: { socialLinks: {}, youtubeLinks: [], bookingLinks: [] },
    errors: [],
  };

  const visited = new Set<string>();
  const queue: string[] = [base.toString()];

  while (queue.length > 0 && result.pages.length < MAX_PAGES) {
    const currentUrl = queue.shift()!;
    const normalizedKey = currentUrl.replace(/\/$/, "");
    if (visited.has(normalizedKey)) continue;
    visited.add(normalizedKey);

    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      continue;
    }
    if (parsed.origin !== base.origin) continue;
    if (!isAllowed(parsed, robots)) continue;
    if (SKIP_PATTERNS.some((pattern) => pattern.test(currentUrl))) continue;

    let extracted: ExtractedPage;
    try {
      const html = await fetchHtml(currentUrl);
      extracted = extractPage(html, currentUrl);
    } catch (error) {
      result.errors.push({ url: currentUrl, message: error instanceof Error ? error.message : "Fetch failed" });
      continue;
    }

    if (extracted.text.length >= 80) {
      result.pages.push({
        url: currentUrl,
        title: extracted.title,
        description: extracted.description,
        text: extracted.text,
        looksLikeFaq: extracted.looksLikeFaq,
        faqs: extracted.looksLikeFaq ? extractFaqs(extracted.blocks) : [],
      });
    }

    result.detected.siteName ??= extracted.siteName;
    result.detected.imageUrl ??= extracted.imageUrl;
    result.detected.logoUrl ??= extracted.logoUrl;
    result.detected.themeColor ??= extracted.themeColor;
    for (const [key, value] of Object.entries(extracted.socialLinks)) {
      const socials = result.detected.socialLinks as Record<string, string | undefined>;
      socials[key] ??= value;
    }
    result.detected.youtubeLinks = [...new Set([...result.detected.youtubeLinks, ...extracted.youtubeLinks])];
    result.detected.bookingLinks = [...new Set([...result.detected.bookingLinks, ...extracted.bookingLinks])];

    const sameOrigin = extracted.links
      .filter((link) => {
        try {
          const url = new URL(link);
          return url.origin === base.origin && !visited.has(link.replace(/\/$/, ""));
        } catch {
          return false;
        }
      })
      .sort((a, b) => priorityFor(a) - priorityFor(b));
    queue.push(...sameOrigin.slice(0, 12));
  }

  return result;
}

/** Fetch and extract one page, used for manual URL adds and per-page re-sync. */
export async function scanSinglePage(pageUrl: string): Promise<ScannedPage> {
  const normalized = normalizeWebsiteUrl(pageUrl);
  if (!normalized) throw new Error("INVALID_URL");
  const html = await fetchHtml(normalized);
  const extracted = extractPage(html, normalized);
  return {
    url: normalized,
    title: extracted.title,
    description: extracted.description,
    text: extracted.text,
    looksLikeFaq: extracted.looksLikeFaq,
    faqs: extracted.looksLikeFaq ? extractFaqs(extracted.blocks) : [],
  };
}
