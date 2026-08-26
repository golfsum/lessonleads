/**
 * Dependency-free HTML content extraction tuned for coach websites.
 * Strips chrome (nav/footer/scripts), keeps headings and body copy,
 * and surfaces metadata useful for auto-setup (title, links, socials, colors).
 */

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201d",
  ldquo: "\u201c",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITY_MAP[name.toLowerCase()] ?? match);
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function removeBlocks(html: string, tags: string[]): string {
  let output = html;
  for (const tag of tags) {
    output = output.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  }
  return output;
}

export interface ExtractedBlock {
  kind: "heading" | "paragraph";
  text: string;
}

export interface ExtractedPage {
  title: string;
  description?: string;
  blocks: ExtractedBlock[];
  text: string;
  links: string[];
  youtubeLinks: string[];
  socialLinks: { instagram?: string; youtube?: string; facebook?: string; x?: string; tiktok?: string };
  bookingLinks: string[];
  imageUrl?: string;
  themeColor?: string;
  siteName?: string;
  looksLikeFaq: boolean;
}

function getMeta(html: string, name: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]).trim();
  }
  return undefined;
}

const BOOKING_HOSTS = ["calendly.com", "acuityscheduling.com", "squareup.com", "square.site", "mindbodyonline.com", "coachnow.io", "golfgenius.com"];

export function extractPage(html: string, pageUrl: string): ExtractedPage {
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || pageUrl;
  const description = getMeta(html, "description") ?? getMeta(html, "og:description");
  const siteName = getMeta(html, "og:site_name");
  const imageUrl = getMeta(html, "og:image");
  const themeColor = getMeta(html, "theme-color");

  // Collect links from the full document before stripping chrome.
  const links: string[] = [];
  const youtubeLinks: string[] = [];
  const socialLinks: ExtractedPage["socialLinks"] = {};
  const bookingLinks: string[] = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"'#]+)["']/gi;
  let anchorMatch: RegExpExecArray | null;
  while ((anchorMatch = anchorPattern.exec(html)) !== null) {
    const href = decodeEntities(anchorMatch[1]).trim();
    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    let resolved: URL;
    try {
      resolved = new URL(href, pageUrl);
    } catch {
      continue;
    }
    const url = resolved.toString();
    const host = resolved.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") {
      youtubeLinks.push(url);
      if (resolved.pathname.startsWith("/@") || resolved.pathname.startsWith("/channel/") || resolved.pathname.startsWith("/c/")) {
        socialLinks.youtube = url;
      }
      continue;
    }
    if (host === "instagram.com") { socialLinks.instagram ??= url; continue; }
    if (host === "facebook.com") { socialLinks.facebook ??= url; continue; }
    if (host === "twitter.com" || host === "x.com") { socialLinks.x ??= url; continue; }
    if (host === "tiktok.com") { socialLinks.tiktok ??= url; continue; }
    if (BOOKING_HOSTS.some((bookingHost) => host === bookingHost || host.endsWith(`.${bookingHost}`))) {
      bookingLinks.push(url);
      continue;
    }
    links.push(url);
  }

  // Strip non-content markup, then chrome sections that repeat on every page.
  let body = removeBlocks(html, ["script", "style", "noscript", "svg", "iframe", "form", "select"]);
  body = removeBlocks(body, ["nav", "footer", "header", "aside"]);
  body = body.replace(/<!--[\s\S]*?-->/g, " ");

  const blocks: ExtractedBlock[] = [];
  const blockPattern = /<(h[1-4]|p|li|blockquote|dt|dd)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockPattern.exec(body)) !== null) {
    const text = stripTags(blockMatch[2]);
    if (!text || text.length < 3) continue;
    const kind = blockMatch[1].toLowerCase().startsWith("h") || blockMatch[1].toLowerCase() === "dt" ? "heading" : "paragraph";
    blocks.push({ kind, text });
  }

  // Fallback for pages without semantic markup.
  if (blocks.length === 0) {
    const raw = stripTags(body);
    if (raw.length > 40) blocks.push({ kind: "paragraph", text: raw.slice(0, 8000) });
  }

  const deduped = dedupeBlocks(blocks).filter((block) => !isJunkBlock(block.text));
  const text = deduped.map((block) => block.text).join("\n");

  const questionHeadings = deduped.filter((block) => block.kind === "heading" && /\?\s*$/.test(block.text)).length;
  const looksLikeFaq = /\/(faq|faqs|help|knowledge|questions)/i.test(pageUrl) || questionHeadings >= 3;

  return {
    title,
    description,
    blocks: deduped,
    text,
    links: [...new Set(links)],
    youtubeLinks: [...new Set(youtubeLinks)],
    socialLinks,
    bookingLinks: [...new Set(bookingLinks)],
    imageUrl,
    themeColor,
    siteName,
    looksLikeFaq,
  };
}

function dedupeBlocks(blocks: ExtractedBlock[]): ExtractedBlock[] {
  const seen = new Set<string>();
  return blocks.filter((block) => {
    const key = block.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const JUNK_PATTERNS = [
  /cookie(s)? (policy|settings|preferences|consent)/i,
  /^accept( all)?( cookies)?$/i,
  /^copyright|^\u00a9|all rights reserved/i,
  /^(skip to|back to top|menu|open menu|close menu|toggle navigation)/i,
  /^(privacy policy|terms of (service|use))$/i,
  /^(log ?in|sign ?up|sign ?in|subscribe)$/i,
];

function isJunkBlock(text: string): boolean {
  if (text.length < 8 && !/\?$/.test(text)) return true;
  return JUNK_PATTERNS.some((pattern) => pattern.test(text));
}

export interface ExtractedFaq {
  question: string;
  answer: string;
}

/** Turn a FAQ-like page into structured Q&A pairs: question headings followed by answer paragraphs. */
export function extractFaqs(blocks: ExtractedBlock[]): ExtractedFaq[] {
  const faqs: ExtractedFaq[] = [];
  let current: ExtractedFaq | null = null;
  for (const block of blocks) {
    const isQuestion = /\?\s*$/.test(block.text) && block.text.length < 200;
    if (isQuestion && (block.kind === "heading" || !current)) {
      if (current && current.answer) faqs.push(current);
      current = { question: block.text, answer: "" };
    } else if (current && block.kind === "paragraph") {
      current.answer = current.answer ? `${current.answer} ${block.text}` : block.text;
    }
  }
  if (current && current.answer) faqs.push(current);
  return faqs.filter((faq) => faq.answer.length >= 20);
}
