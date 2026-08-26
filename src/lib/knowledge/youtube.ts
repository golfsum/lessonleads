import "server-only";

import { decodeEntities } from "./extract";

const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = "Mozilla/5.0 (compatible; LessonLeadsBot/1.0; +https://lessonleads.com/bot)";

export interface YoutubeVideoInfo {
  videoId: string;
  url: string;
  title: string;
  thumbnailUrl?: string;
  authorName?: string;
  transcript?: string;
}

export function parseYoutubeUrl(input: string): { kind: "video"; videoId: string } | { kind: "channel"; url: string } | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") {
    const videoId = url.pathname.slice(1).split("/")[0];
    return videoId ? { kind: "video", videoId } : null;
  }
  if (host !== "youtube.com") return null;
  if (url.pathname === "/watch" && url.searchParams.get("v")) return { kind: "video", videoId: url.searchParams.get("v")! };
  const shortsMatch = url.pathname.match(/^\/shorts\/([\w-]{6,})/);
  if (shortsMatch) return { kind: "video", videoId: shortsMatch[1] };
  if (/^\/(@[\w.-]+|channel\/[\w-]+|c\/[\w.-]+|user\/[\w.-]+)/.test(url.pathname)) {
    return { kind: "channel", url: `https://www.youtube.com${url.pathname.split("/").slice(0, 2).join("/")}` };
  }
  return null;
}

async function fetchWithTimeout(url: string, accept = "text/html"): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { "user-agent": USER_AGENT, accept }, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Video metadata via YouTube's public oEmbed endpoint (no API key). */
export async function fetchVideoMetadata(videoId: string): Promise<YoutubeVideoInfo | null> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const response = await fetchWithTimeout(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`,
      "application/json",
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { title?: string; thumbnail_url?: string; author_name?: string };
    if (!data.title) return null;
    return { videoId, url: videoUrl, title: data.title, thumbnailUrl: data.thumbnail_url, authorName: data.author_name };
  } catch {
    return null;
  }
}

/**
 * Best-effort transcript fetch from YouTube's public caption tracks. Returns
 * undefined when captions are unavailable; we never fabricate transcripts.
 */
export async function fetchVideoTranscript(videoId: string): Promise<string | undefined> {
  try {
    const watchResponse = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`);
    if (!watchResponse.ok) return undefined;
    const html = await watchResponse.text();
    const trackMatch = html.match(/"captionTracks":\s*(\[[^\]]*\])/);
    if (!trackMatch) return undefined;
    let tracks: Array<{ baseUrl?: string; languageCode?: string; kind?: string }>;
    try {
      tracks = JSON.parse(trackMatch[1].replace(/\\u0026/g, "&"));
    } catch {
      return undefined;
    }
    const track =
      tracks.find((candidate) => candidate.languageCode?.startsWith("en") && candidate.kind !== "asr") ??
      tracks.find((candidate) => candidate.languageCode?.startsWith("en")) ??
      tracks[0];
    if (!track?.baseUrl) return undefined;
    const captionResponse = await fetchWithTimeout(track.baseUrl.replace(/\\u0026/g, "&"), "text/xml");
    if (!captionResponse.ok) return undefined;
    const xml = await captionResponse.text();
    const texts: string[] = [];
    const pattern = /<text[^>]*>([\s\S]*?)<\/text>/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(xml)) !== null) {
      const text = decodeEntities(decodeEntities(match[1])).replace(/\s+/g, " ").trim();
      if (text) texts.push(text);
    }
    const transcript = texts.join(" ");
    return transcript.length > 100 ? transcript.slice(0, 40_000) : undefined;
  } catch {
    return undefined;
  }
}

/** Discover recent videos on a channel page (best effort, no API key). */
export async function fetchChannelVideos(channelUrl: string, limit = 12): Promise<YoutubeVideoInfo[]> {
  try {
    const response = await fetchWithTimeout(`${channelUrl.replace(/\/$/, "")}/videos`);
    if (!response.ok) return [];
    const html = await response.text();
    const seen = new Set<string>();
    const videos: YoutubeVideoInfo[] = [];
    const pattern = /"videoRenderer":\{"videoId":"([\w-]{6,})".*?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null && videos.length < limit) {
      const videoId = match[1];
      if (seen.has(videoId)) continue;
      seen.add(videoId);
      let title: string;
      try {
        title = JSON.parse(`"${match[2]}"`);
      } catch {
        title = match[2];
      }
      videos.push({
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }
    return videos;
  } catch {
    return [];
  }
}

/** Guess a golf category from a video title. */
export function categorizeGolfVideo(title: string, description = ""): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const categories: string[] = [];
  if (/\bdriver|drive|tee|slice|distance\b/.test(text)) categories.push("Driver");
  if (/\bputt|green|lag\b/.test(text)) categories.push("Putting");
  if (/\bchip|pitch|wedge|short game|bunker|sand\b/.test(text)) categories.push("Short Game");
  if (/\biron|ball.?striking|contact\b/.test(text)) categories.push("Irons");
  if (/\bcourse management|strategy|scoring\b/.test(text)) categories.push("Course Management");
  if (/\bbeginner|basics|fundamental\b/.test(text)) categories.push("Beginner");
  if (/\bjunior|kids?\b/.test(text)) categories.push("Junior Golf");
  return categories.length > 0 ? categories : ["General"];
}
