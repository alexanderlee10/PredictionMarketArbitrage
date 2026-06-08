import { cleanText } from '@/lib/utils';
import { NormalizedMarket } from '@/types/market';
import { OutcomeRelationship } from '@/types/opportunity';

export interface OutcomeMapping {
  relationship: OutcomeRelationship;
  kalshiSide: 'YES' | 'NO';
  polymarketSide: 'YES' | 'NO';
  explanation: string;
}

const AMBIGUOUS_PHRASES = [
  'admin discretion',
  'committee',
  'subject to interpretation',
  'market consensus',
  'significant',
  'major breakthrough',
  'major ai',
];

function hasAmbiguousWording(market: NormalizedMarket): boolean {
  const text = cleanText(`${market.marketTitle} ${market.description} ${market.resolutionRules ?? ''}`);
  return AMBIGUOUS_PHRASES.some((p) => text.includes(p));
}

function getAsk(market: NormalizedMarket, side: 'YES' | 'NO'): number | null {
  return side === 'YES' ? market.yesAsk : market.noAsk;
}

interface PairEval {
  kalshiSide: 'YES' | 'NO';
  polymarketSide: 'YES' | 'NO';
  totalCost: number;
  relationship: OutcomeRelationship;
}

function evaluatePairs(kalshi: NormalizedMarket, poly: NormalizedMarket): PairEval[] {
  const pairs: Array<{ k: 'YES' | 'NO'; p: 'YES' | 'NO' }> = [
    { k: 'YES', p: 'YES' },
    { k: 'YES', p: 'NO' },
    { k: 'NO', p: 'YES' },
    { k: 'NO', p: 'NO' },
  ];

  const results: PairEval[] = [];
  for (const { k, p } of pairs) {
    const kPrice = getAsk(kalshi, k);
    const pPrice = getAsk(poly, p);
    if (kPrice === null || pPrice === null) continue;

    const relationship: OutcomeRelationship = k === p ? 'same_outcome' : 'opposite_outcome';
    results.push({ kalshiSide: k, polymarketSide: p, totalCost: kPrice + pPrice, relationship });
  }
  return results;
}

export function mapOutcomes(kalshi: NormalizedMarket, poly: NormalizedMarket): OutcomeMapping {
  if (hasAmbiguousWording(kalshi) || hasAmbiguousWording(poly)) {
    return {
      relationship: 'unclear',
      kalshiSide: 'YES',
      polymarketSide: 'NO',
      explanation: 'Ambiguous resolution wording — manual review required',
    };
  }

  const titleSim = cleanText(kalshi.marketTitle) === cleanText(poly.marketTitle);
  const evals = evaluatePairs(kalshi, poly);

  if (evals.length === 0) {
    return {
      relationship: 'not_comparable',
      kalshiSide: 'YES',
      polymarketSide: 'NO',
      explanation: 'Missing executable ask prices on one or both sides',
    };
  }

  // Prefer opposite-outcome pairs for arbitrage (buy both sides covering all outcomes)
  const opposite = evals.filter((e) => e.relationship === 'opposite_outcome');
  const same = evals.filter((e) => e.relationship === 'same_outcome');

  if (opposite.length > 0) {
    const best = opposite.reduce((a, b) => (a.totalCost < b.totalCost ? a : b));
    return {
      relationship: 'opposite_outcome',
      kalshiSide: best.kalshiSide,
      polymarketSide: best.polymarketSide,
      explanation: `Buy Kalshi ${best.kalshiSide} + Polymarket ${best.polymarketSide} covers all outcomes (cost ${best.totalCost.toFixed(3)})`,
    };
  }

  if (same.length > 0 && titleSim) {
    const best = same[0];
    return {
      relationship: 'same_outcome',
      kalshiSide: best.kalshiSide,
      polymarketSide: best.polymarketSide,
      explanation: 'Same outcome direction — not an opposite-side arbitrage pair',
    };
  }

  return {
    relationship: 'unclear',
    kalshiSide: 'YES',
    polymarketSide: 'NO',
    explanation: 'Could not confidently determine outcome relationship',
  };
}
