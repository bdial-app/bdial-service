// ────────────────────────────────────────────────────────────
// Query understanding — pure helpers, no DB access.
//
// A query becomes a list of word groups. A text matches the query only when
// EVERY group matches somewhere in it (as the start of a word), so
// "digital marketing" can no longer match "Mast Foods" on two shared letters.
// Each group is the word's conservative root plus any exact synonyms.
// ────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'of', 'for', 'in', 'at', 'on', 'to', 'with',
  'near', 'nearby', 'me', 'my', 'around', 'best', 'top', 'good',
]);

export interface ParsedQuery {
  /** Lower-cased, punctuation collapsed to single spaces. */
  norm: string;
  /** Significant words after stopword removal (falls back to all words). */
  words: string[];
  /** Postgres regexes — every one must match for a text to count as a match. */
  groups: string[];
  /** Postgres regex for whole-phrase synonyms ('' when none). An alternative to `groups`. */
  phraseSynonyms: string;
  /** Postgres regex for the words in sequence, e.g. digital\W+marketing. */
  phrase: string;
  /** JS equivalents of the above, for matching cached categories in memory. */
  jsGroups: RegExp[];
  jsPhraseSynonyms: RegExp | null;
}

export function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function splitWords(norm: string): string[] {
  const all = norm.split(' ').filter(Boolean);
  const significant = all.filter((w) => !STOPWORDS.has(w));
  return significant.length > 0 ? significant : all;
}

/**
 * Conservative stemming: only plural and agent/noun suffixes, and only when
 * the root stays long enough to be meaningful. "-ing" is never stripped —
 * "marketing" must not collapse to "market" and match supermarkets.
 */
export function wordRoot(w: string): string {
  if (w.length <= 3) return w;
  const strip = (re: RegExp, min: number): string | null => {
    const r = w.replace(re, '');
    return r !== w && r.length >= min ? r : null;
  };
  return (
    strip(/ies$/, 4) ??
    (w.endsWith('ss') ? w : null) ??
    strip(/(?<=(?:ch|sh|x|ss))es$/, 4) ??
    strip(/ments?$/, 5) ??
    strip(/ers?$/, 5) ??
    strip(/y$/, 5) ??
    strip(/s$/, 3) ??
    w
  );
}

/**
 * Regex fragment for one word. Short words (ac, it, seo, app) must be whole
 * words, otherwise "app" would match "apparel". `partial` marks the word the
 * user is still typing, which matches as a plain prefix.
 */
function wordFragment(w: string, partial: boolean): string {
  if (partial) {
    // "developer" typed so far should still reach "Development"
    const root = wordRoot(w);
    return root !== w && root.length >= 4 ? `(?:${w}|${root})` : w;
  }
  if (w.length <= 3) return `${w}(?:s|es)?(?![\\p{L}\\p{N}])`;
  return wordRoot(w);
}

function phraseFragment(phrase: string): string {
  return splitWords(normalizeQuery(phrase)).map((w) => wordFragment(w, false)).join('[^\\p{L}\\p{N}]+');
}

// Postgres ARE has \m (start of word) but no \p{..}; JS has \p{..} but no \m.
const PG_WORD_START = '\\m';
const JS_WORD_START = '(?<![\\p{L}\\p{N}])';

function toPg(fragment: string): string {
  return PG_WORD_START + fragment.replace(/\\p\{L\}\\p\{N\}/g, '[:alnum:]');
}

function toJs(fragment: string): RegExp {
  return new RegExp(JS_WORD_START + fragment, 'iu');
}

/**
 * Build the matcher for a query.
 * @param synonyms exact term → canonical terms (lower-cased keys)
 * @param asYouType treat the last word as an unfinished prefix (autocomplete)
 */
export function parseQuery(
  q: string,
  synonyms: Map<string, string[]>,
  asYouType = false,
): ParsedQuery {
  const norm = normalizeQuery(q);
  const words = splitWords(norm);
  const lastIsPartial = asYouType && !/\s$/.test(q);

  const groupFragments = words.map((w, i) => {
    const partial = lastIsPartial && i === words.length - 1;
    const alts = [wordFragment(w, partial)];
    for (const canonical of synonyms.get(w) ?? []) alts.push(phraseFragment(canonical));
    return alts.length === 1 ? alts[0] : `(?:${alts.join('|')})`;
  });

  const phraseAlts = (synonyms.get(norm) ?? []).map(phraseFragment).filter(Boolean);
  const phraseSyn = phraseAlts.length > 0 ? `(?:${phraseAlts.join('|')})` : '';

  const phrase = words
    .map((w, i) => wordFragment(w, lastIsPartial && i === words.length - 1))
    .join('[^\\p{L}\\p{N}]+');

  return {
    norm,
    words,
    groups: groupFragments.map(toPg),
    phraseSynonyms: phraseSyn ? toPg(phraseSyn) : '',
    phrase: toPg(phrase),
    jsGroups: groupFragments.map(toJs),
    jsPhraseSynonyms: phraseSyn ? toJs(phraseSyn) : null,
  };
}

export function matchesAll(text: string | null | undefined, pq: ParsedQuery): boolean {
  if (!text) return false;
  if (pq.jsGroups.length > 0 && pq.jsGroups.every((re) => re.test(text))) return true;
  return pq.jsPhraseSynonyms != null && pq.jsPhraseSynonyms.test(text);
}

// ────────────────────────────────────────────────────────────
// Typo correction — trigram similarity (same definition as pg_trgm)
// ────────────────────────────────────────────────────────────

function trigrams(w: string): Set<string> {
  const padded = `  ${w} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
  return out;
}

export function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared);
}

export interface Vocabulary {
  /** Every word that appears anywhere searchable — never "corrected". */
  known: Set<string>;
  /** Words worth correcting towards (category names, keywords, synonyms). */
  targets: string[];
}

/**
 * Replace misspelt words ("margetting" → "marketing"). A word is left alone
 * when it, its root, or (while typing) its prefix is a known word.
 * Returns null when nothing changed.
 */
export function correctQuery(norm: string, vocab: Vocabulary, asYouType = false): string | null {
  const words = norm.split(' ').filter(Boolean);
  let changed = false;

  const corrected = words.map((w, i) => {
    if (w.length < 4 || /\d/.test(w) || STOPWORDS.has(w)) return w;
    if (vocab.known.has(w) || vocab.known.has(wordRoot(w))) return w;
    const isLast = i === words.length - 1;
    if (asYouType && isLast && vocab.targets.some((t) => t.startsWith(w))) return w;

    let best: string | null = null;
    // Real typos score ≥ 0.4 (margetting/marketing = 0.40); unrelated words ~0.15
    let bestSim = 0.38;
    for (const t of vocab.targets) {
      if (t[0] !== w[0] || Math.abs(t.length - w.length) > 3) continue;
      const sim = trigramSimilarity(w, t);
      if (sim > bestSim) {
        bestSim = sim;
        best = t;
      }
    }
    if (best) {
      changed = true;
      return best;
    }
    return w;
  });

  return changed ? corrected.join(' ') : null;
}

/** Split any text into normalized words, for building the vocabulary. */
export function vocabularyWords(text: string | null | undefined): string[] {
  if (!text) return [];
  return normalizeQuery(text).split(' ').filter((w) => w.length >= 2);
}
