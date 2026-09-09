/** Normalise whitespace produced by PDF extraction. */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Split long text into overlapping chunks (by paragraphs, then by size) so
 * that search results are focused and small enough to send to the AI.
 */
export function chunkText(text: string, maxChars = 900, overlap = 120): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  const push = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      push();
      // Very long paragraph: slice with overlap so sentences are not lost.
      let start = 0;
      while (start < para.length) {
        chunks.push(para.slice(start, start + maxChars).trim());
        start += maxChars - overlap;
      }
      continue;
    }
    if ((current + '\n\n' + para).length > maxChars) push();
    current = current ? `${current}\n\n${para}` : para;
  }
  push();
  return chunks.filter((c) => c.length > 0);
}

/** Extract meaningful search terms from a natural language query. */
const STOP_WORDS = new Set(
  'a an the of in on at to for from with by and or is are was were be been being this that these those it its my me i you your our we they what which who how why when where explain describe define give tell about please from notes note unit subject topic important points list summary summarise summarize simple language'.split(' '),
);

export function extractTerms(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2 && !STOP_WORDS.has(t)),
    ),
  );
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
