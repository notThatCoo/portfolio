/**
 * Small fuzzy matcher for the command palette. The query must appear in the
 * text as a subsequence (case-insensitive). Score rewards:
 *  - matches at the start of words ("dsk" → "DarkSide-20k Surrogate")
 *  - consecutive runs ("term" in "Terminal" beats "t…e…r…m")
 *  - shorter targets, so the tighter match wins ties
 * Returns null when there's no match, plus matched indices for highlighting.
 */
export interface Match {
  score: number;
  indices: number[];
}

const isBoundary = (text: string, i: number) =>
  i === 0 || /[\s\-_/.]/.test(text[i - 1]) || (/[a-z]/.test(text[i - 1]) && /[A-Z]/.test(text[i]));

export function fuzzyMatch(query: string, text: string): Match | null {
  const q = query.trim().toLowerCase();
  if (!q) return { score: 0, indices: [] };
  const lower = text.toLowerCase();

  // Contiguous substring is the strongest signal; prefer it outright.
  const at = lower.indexOf(q);
  if (at >= 0) {
    const indices = Array.from({ length: q.length }, (_, k) => at + k);
    const score = 100 + (isBoundary(text, at) ? 40 : 0) + (at === 0 ? 20 : 0) - text.length * 0.1;
    return { score, indices };
  }

  const indices: number[] = [];
  let score = 0;
  let prev = -2;
  let from = 0;
  for (const ch of q) {
    if (ch === " ") continue;
    // Prefer the next occurrence at a word boundary, otherwise the next one at all.
    let i = -1;
    for (let j = from; j < lower.length; j++) {
      if (lower[j] !== ch) continue;
      if (isBoundary(text, j)) {
        i = j;
        break;
      }
      if (i < 0) i = j;
    }
    if (i < 0) return null;
    score += 1;
    if (isBoundary(text, i)) score += 8;
    if (i === prev + 1) score += 5;
    indices.push(i);
    prev = i;
    from = i + 1;
  }
  return { score: score - text.length * 0.1, indices };
}

export interface Searchable {
  title: string;
  keywords?: string[];
}

/** Rank items by their best match over title and keywords; stable for equal scores. */
export function rank<T extends Searchable>(items: T[], query: string): { item: T; match: Match }[] {
  if (!query.trim()) return items.map((item) => ({ item, match: { score: 0, indices: [] } }));
  const results: { item: T; match: Match; order: number }[] = [];
  items.forEach((item, order) => {
    const title = fuzzyMatch(query, item.title);
    const kw = (item.keywords ?? [])
      .map((k) => fuzzyMatch(query, k))
      .filter((m): m is Match => m !== null)
      // Keyword hits rank a bit below title hits and don't highlight the title.
      .map((m) => ({ score: m.score - 15, indices: [] }));
    const best = [title, ...kw]
      .filter((m): m is Match => m !== null)
      .sort((a, b) => b.score - a.score)[0];
    if (best) results.push({ item, match: best, order });
  });
  return results
    .sort((a, b) => b.match.score - a.match.score || a.order - b.order)
    .map(({ item, match }) => ({ item, match }));
}
