import type { KnowledgeChunk, KnowledgeSourceType } from "@/lib/domain/types";

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do", "does", "for", "from", "get", "has", "have",
  "he", "her", "his", "how", "i", "if", "in", "is", "it", "its", "me", "my", "of", "on", "or", "our", "she", "so",
  "that", "the", "their", "them", "they", "this", "to", "up", "was", "we", "what", "when", "where", "which", "who",
  "why", "will", "with", "you", "your", "am", "im", "ive", "dont", "cant", "should", "would", "could", "there",
]);

/** Golf-domain synonym expansion so visitor phrasing matches coach phrasing. */
const SYNONYMS: Record<string, string[]> = {
  slice: ["slicing", "fade", "banana", "open"],
  slicing: ["slice"],
  hook: ["hooking", "draw", "snap"],
  hooking: ["hook"],
  putt: ["putting", "putter", "green", "greens"],
  putting: ["putt", "putter"],
  chip: ["chipping", "pitch", "pitching", "wedge"],
  chipping: ["chip", "wedge", "short"],
  drive: ["driver", "driving", "tee"],
  driver: ["drive", "driving", "tee"],
  iron: ["irons", "ballstriking", "striking", "contact"],
  irons: ["iron", "contact"],
  bunker: ["sand", "bunkers"],
  sand: ["bunker"],
  distance: ["far", "farther", "longer", "speed", "power"],
  beginner: ["new", "start", "started", "starting", "first"],
  junior: ["kid", "kids", "child", "children", "youth"],
  price: ["cost", "rates", "pricing", "much", "fee", "fees"],
  cost: ["price", "rates", "pricing", "much"],
  online: ["remote", "virtual", "video"],
  lesson: ["lessons", "coaching", "instruction", "session"],
  lessons: ["lesson", "coaching", "instruction"],
  shank: ["shanks", "shanking", "hosel"],
  top: ["topping", "thin", "thinning"],
  fat: ["chunk", "chunking", "heavy", "ground"],
};

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function expandTokens(tokens: string[]): Map<string, number> {
  const weights = new Map<string, number>();
  for (const token of tokens) {
    weights.set(token, Math.max(weights.get(token) ?? 0, 1));
    const stem = token.endsWith("s") && token.length > 3 ? token.slice(0, -1) : token;
    if (stem !== token) weights.set(stem, Math.max(weights.get(stem) ?? 0, 0.9));
    for (const synonym of SYNONYMS[token] ?? []) {
      weights.set(synonym, Math.max(weights.get(synonym) ?? 0, 0.6));
    }
  }
  return weights;
}

const SOURCE_TYPE_BOOST: Record<KnowledgeSourceType, number> = {
  manual: 1.5,
  faq: 1.4,
  website_page: 1,
  youtube_video: 0.95,
  document: 1,
};

export interface ScoredChunk {
  chunk: KnowledgeChunk;
  score: number;
}

/**
 * Lexical retrieval over a coach's knowledge chunks (TF-IDF style with
 * title boost, golf synonym expansion, and trust weighting for FAQ/manual
 * sources). Callers must pass only the current tenant's chunks.
 */
export function retrieveChunks(query: string, chunks: KnowledgeChunk[], limit = 5): ScoredChunk[] {
  const queryWeights = expandTokens(tokenize(query));
  if (queryWeights.size === 0 || chunks.length === 0) return [];

  // Document frequency for IDF weighting.
  const documentFrequency = new Map<string, number>();
  const chunkTokens: Array<{ body: Map<string, number>; title: Set<string> }> = chunks.map((chunk) => {
    const bodyTokens = tokenize(chunk.content);
    const counts = new Map<string, number>();
    for (const token of bodyTokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    for (const token of new Set(bodyTokens)) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    return { body: counts, title: new Set(tokenize(chunk.title)) };
  });

  const totalDocs = chunks.length;
  const scored: ScoredChunk[] = chunks.map((chunk, index) => {
    const { body, title } = chunkTokens[index];
    const length = Math.max([...body.values()].reduce((sum, count) => sum + count, 0), 1);
    let score = 0;
    for (const [term, weight] of queryWeights) {
      const termFrequency = body.get(term) ?? 0;
      if (termFrequency > 0) {
        const idf = Math.log(1 + totalDocs / (1 + (documentFrequency.get(term) ?? 0)));
        score += weight * idf * (termFrequency / Math.sqrt(length)) * 10;
      }
      if (title.has(term)) score += weight * 2.5;
    }
    return { chunk, score: score * (SOURCE_TYPE_BOOST[chunk.sourceType] ?? 1) };
  });

  return scored
    .filter((entry) => entry.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Score arbitrary titled text items (videos, services) against a query. */
export function scoreText(query: string, text: string, title = ""): number {
  const queryWeights = expandTokens(tokenize(query));
  const bodyCounts = new Map<string, number>();
  for (const token of tokenize(text)) bodyCounts.set(token, (bodyCounts.get(token) ?? 0) + 1);
  const titleTokens = new Set(tokenize(title));
  let score = 0;
  for (const [term, weight] of queryWeights) {
    if (bodyCounts.has(term)) score += weight * Math.min(bodyCounts.get(term)!, 3);
    if (titleTokens.has(term)) score += weight * 3;
  }
  return score;
}
