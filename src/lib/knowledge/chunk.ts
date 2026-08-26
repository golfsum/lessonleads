const TARGET_CHUNK_CHARS = 1100;
const MIN_CHUNK_CHARS = 120;

/**
 * Split extracted page text into retrieval-sized chunks on paragraph
 * boundaries. Keeps headings attached to the content that follows them.
 */
export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 1 > TARGET_CHUNK_CHARS) {
      chunks.push(current.trim());
      current = "";
    }
    current = current ? `${current}\n${paragraph}` : paragraph;
    // Very long single paragraphs get hard-split on sentence boundaries.
    while (current.length > TARGET_CHUNK_CHARS * 1.6) {
      const cut = findSentenceCut(current, TARGET_CHUNK_CHARS);
      chunks.push(current.slice(0, cut).trim());
      current = current.slice(cut).trim();
    }
  }
  if (current.trim().length >= MIN_CHUNK_CHARS || (chunks.length === 0 && current.trim())) {
    chunks.push(current.trim());
  } else if (current.trim() && chunks.length > 0) {
    chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}\n${current.trim()}`;
  }
  return chunks.filter(Boolean);
}

function findSentenceCut(text: string, target: number): number {
  for (let index = target; index > target * 0.5; index -= 1) {
    if (/[.!?]/.test(text[index]) && text[index + 1] === " ") return index + 1;
  }
  return target;
}
