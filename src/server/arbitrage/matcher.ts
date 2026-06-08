import stringSimilarity from 'string-similarity';
import { differenceInDays, parseISO } from 'date-fns';
import { cleanText } from '@/lib/utils';
import { NormalizedMarket } from '@/types/market';
import { MatchResult } from '@/types/opportunity';
import { mapOutcomes } from './outcomeMapper';

export interface MatcherConfig {
  minMatchConfidence: number;
  manualReviewThreshold: number;
  useSemanticMatching: boolean;
}

export interface MatchCandidate extends MatchResult {
  kalshiMarket: NormalizedMarket;
  polymarketMarket: NormalizedMarket;
}

// ── Alias expansion ────────────────────────────────────────────
// Normalise common abbreviations before comparing so "Fed" and
// "Federal Reserve" both become the same token set.
const ALIASES: Array<[RegExp, string]> = [
  [/\bfed\b/gi, 'federal reserve'],
  [/\bfomc\b/gi, 'federal reserve'],
  [/\bbtc\b/gi, 'bitcoin'],
  [/\beth\b/gi, 'ethereum'],
  [/\bsol\b/gi, 'solana'],
  [/\bgop\b/gi, 'republican'],
  [/\bpotus\b/gi, 'president united states'],
  [/\bdems?\b/gi, 'democrat'],
  [/\bbps\b/gi, 'basis points'],
  [/\bcpi\b/gi, 'inflation consumer price'],
  [/\bpce\b/gi, 'inflation'],
  [/\bgdp\b/gi, 'economy gross domestic'],
  [/\beoy\b/gi, 'year end'],
  [/\bnba\b/gi, 'basketball nba'],
  [/\bnfl\b/gi, 'football nfl'],
  [/\bmlb\b/gi, 'baseball mlb'],
  [/\bnhl\b/gi, 'hockey nhl'],
  [/\bus\b/gi, 'united states'],
  [/\buk\b/gi, 'united kingdom'],
  [/\beu\b/gi, 'european union'],
  [/\bai\b/gi, 'artificial intelligence'],
  [/\bspx\b/gi, 's&p 500 stock'],
  [/\bspy\b/gi, 's&p 500 stock'],
  [/\b(\d+)k\b/gi, '$1000'],   // "70k" → "70000"
  [/\b(\d+)bps\b/gi, '$1 basis points'],
];

const STOPWORDS = new Set([
  'will', 'the', 'a', 'an', 'by', 'in', 'at', 'to', 'be', 'is', 'or', 'and',
  'of', 'for', 'on', 'if', 'it', 'its', 'this', 'that', 'are', 'was', 'has',
  'have', 'not', 'do', 'does', 'did', 'with', 'from', 'as', 'up', 'than',
  'before', 'after', 'into', 'out', 'over', 'under', 'above', 'below',
  'just', 'most', 'any', 'all', 'both', 'each', 'how', 'when', 'where',
  'why', 'who', 'which', 'what', 'would', 'could', 'should', 'may', 'might',
  'been', 'being', 'their', 'there', 'they', 'them', 'then', 'these', 'those',
  'your', 'our', 'his', 'her', 'we', 'he', 'she', 'you', 'i', 'my', 'no',
  'yes', 'new', 'per', 'end', 'day', 'set',
]);

// Minimal suffix stemmer so "rates"↔"rate", "wins"↔"win", "cutting"↔"cut"
function stem(w: string): string {
  if (w.length < 4) return w;
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('tion') && w.length > 6) return w.slice(0, -4);
  if (w.endsWith('tions') && w.length > 7) return w.slice(0, -5);
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ers') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('er') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s')  && w.length > 4) return w.slice(0, -1);
  return w;
}

function tokenize(text: string): Set<string> {
  let s = text.toLowerCase();
  for (const [pattern, replacement] of ALIASES) {
    s = s.replace(pattern, replacement);
  }
  return new Set(
    cleanText(s)
      .split(/\s+/)
      .filter((t) => (t.length > 2 || /^\d+$/.test(t)) && !STOPWORDS.has(t))
      .map(stem),
  );
}

function tokenJaccard(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach((t) => { if (setB.has(t)) intersection++; });
  return intersection / (setA.size + setB.size - intersection);
}

function hasAnyTokenOverlap(a: string, b: string): boolean {
  const setA = tokenize(a);
  const setB = tokenize(b);
  let found = false;
  setA.forEach((t) => { if (setB.has(t)) found = true; });
  return found;
}

// ── Similarity helpers ─────────────────────────────────────────
function charSim(a: string, b: string): number {
  const ca = cleanText(a);
  const cb = cleanText(b);
  if (!ca || !cb) return 0;
  return stringSimilarity.compareTwoStrings(ca, cb);
}

// Best of character-level and token-level similarity
function textSimilarity(a: string, b: string): number {
  return Math.max(charSim(a, b), tokenJaccard(a, b));
}

function dateSimilarity(a: string | null, b: string | null): number {
  if (!a || !b) return 0.5;
  try {
    const days = Math.abs(differenceInDays(parseISO(a), parseISO(b)));
    if (days === 0) return 1;
    if (days <= 3) return 0.9;
    if (days <= 7) return 0.75;
    if (days <= 30) return 0.5;
    if (days <= 90) return 0.25;
    return 0;
  } catch {
    return 0.5;
  }
}

function resolutionSimilarity(
  rulesA: string | null,
  rulesB: string | null,
  sourceA: string | null,
  sourceB: string | null,
): number {
  const rulesSim = textSimilarity(rulesA ?? '', rulesB ?? '');
  const sourceSim = textSimilarity(sourceA ?? '', sourceB ?? '');
  return rulesSim * 0.7 + sourceSim * 0.3;
}

// ── Core scoring ───────────────────────────────────────────────
export function scoreMarketPair(
  kalshi: NormalizedMarket,
  polymarket: NormalizedMarket,
  config: MatcherConfig,
): MatchCandidate {
  // Combine market title + event title for richer comparison
  const kText = [kalshi.marketTitle, kalshi.eventTitle].filter(Boolean).join(' ');
  const pText = [polymarket.marketTitle, polymarket.eventTitle].filter(Boolean).join(' ');

  // Title similarity: take the best score across several text combinations
  const titleSimilarity = Math.max(
    textSimilarity(kalshi.marketTitle, polymarket.marketTitle),
    textSimilarity(kText, pText),
    textSimilarity(kalshi.marketTitle, pText),
    textSimilarity(kText, polymarket.marketTitle),
  );

  const descriptionSimilarity = textSimilarity(
    kalshi.description ?? '',
    polymarket.description ?? '',
  );
  const dateSim = dateSimilarity(kalshi.expiration, polymarket.expiration);
  const resolutionSim = resolutionSimilarity(
    kalshi.resolutionRules,
    polymarket.resolutionRules,
    kalshi.resolutionSource,
    polymarket.resolutionSource,
  );

  // Reduce description weight when markets have no descriptions (Kalshi often has none)
  const hasDesc =
    (kalshi.description?.length ?? 0) > 10 &&
    (polymarket.description?.length ?? 0) > 10;
  const titleW = hasDesc ? 0.45 : 0.60;
  const descW = hasDesc ? 0.20 : 0.05;
  const dateW = 0.20;
  const resW = 0.15;

  let matchScore = titleW * titleSimilarity + descW * descriptionSimilarity + dateW * dateSim + resW * resolutionSim;

  let semanticSimilarity: number | null = null;
  if (config.useSemanticMatching) {
    semanticSimilarity = (titleSimilarity + descriptionSimilarity) / 2;
    matchScore = matchScore * 0.85 + semanticSimilarity * 0.15;
  }

  const warnings: string[] = [];
  if (dateSim < 0.75) warnings.push('Expiration dates differ significantly');
  if (resolutionSim < 0.6) warnings.push('Resolution rules or sources differ');
  if (titleSimilarity < 0.6) warnings.push('Title similarity is moderate');

  const outcome = mapOutcomes(kalshi, polymarket);
  const manualReviewRequired =
    matchScore < config.manualReviewThreshold ||
    outcome.relationship === 'unclear' ||
    warnings.length >= 2;

  const matchExplanation = [
    `Title similarity: ${(titleSimilarity * 100).toFixed(1)}%`,
    `Description similarity: ${(descriptionSimilarity * 100).toFixed(1)}%`,
    `Date similarity: ${(dateSim * 100).toFixed(1)}%`,
    `Resolution similarity: ${(resolutionSim * 100).toFixed(1)}%`,
    `Weighted match score: ${(matchScore * 100).toFixed(1)}%`,
    `Outcome: ${outcome.relationship} (${outcome.explanation})`,
  ].join('. ');

  return {
    kalshiMarketId: kalshi.marketId,
    polymarketMarketId: polymarket.marketId,
    kalshiMarket: kalshi,
    polymarketMarket: polymarket,
    matchScore,
    titleSimilarity,
    descriptionSimilarity,
    dateSimilarity: dateSim,
    resolutionSimilarity: resolutionSim,
    semanticSimilarity,
    matchExplanation,
    warnings,
    manualReviewRequired,
    outcomeRelationship: outcome.relationship,
    kalshiSide: outcome.kalshiSide,
    polymarketSide: outcome.polymarketSide,
  };
}

export function findMatches(
  kalshiMarkets: NormalizedMarket[],
  polymarketMarkets: NormalizedMarket[],
  config: MatcherConfig,
): { accepted: MatchCandidate[]; rejected: MatchCandidate[] } {
  const accepted: MatchCandidate[] = [];
  const rejected: MatchCandidate[] = [];

  for (const kalshi of kalshiMarkets) {
    const kText = `${kalshi.marketTitle} ${kalshi.eventTitle}`;
    for (const poly of polymarketMarkets) {
      const pText = `${poly.marketTitle} ${poly.eventTitle}`;

      // Fast pre-screen: skip pairs that share zero meaningful tokens.
      // This cuts 250k pair comparisons down to the small fraction that
      // share at least one keyword (after alias expansion).
      if (!hasAnyTokenOverlap(kText, pText)) continue;

      const candidate = scoreMarketPair(kalshi, poly, config);
      if (candidate.matchScore >= config.minMatchConfidence) {
        accepted.push(candidate);
      } else if (candidate.matchScore >= 0.3) {
        rejected.push(candidate);
      }
    }
  }

  accepted.sort((a, b) => b.matchScore - a.matchScore);
  return { accepted, rejected };
}
