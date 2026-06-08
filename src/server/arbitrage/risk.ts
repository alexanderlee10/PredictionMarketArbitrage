import { differenceInDays, parseISO } from 'date-fns';
import { AppSettings } from '@/lib/config';
import { NormalizedMarket } from '@/types/market';
import { RiskFlag } from '@/types/opportunity';
import { MatchCandidate } from './matcher';
import { ArbitrageCalculation } from '@/types/opportunity';

export function computeRiskFlags(
  match: MatchCandidate,
  calc: ArbitrageCalculation,
  settings: AppSettings,
): { flags: RiskFlag[]; details: string[] } {
  const flags: RiskFlag[] = [];
  const details: string[] = [];
  const { kalshiMarket: k, polymarketMarket: p } = match;

  if (k.expiration && p.expiration) {
    try {
      const days = Math.abs(differenceInDays(parseISO(k.expiration), parseISO(p.expiration)));
      if (days > 7) {
        flags.push('different_expiration');
        details.push(`Expiration dates differ by ${days} days`);
      }
      const daysToExpiry = differenceInDays(parseISO(k.expiration), new Date());
      if (daysToExpiry <= 7 && daysToExpiry >= 0) {
        flags.push('near_expiration');
        details.push(`Market expires in ${daysToExpiry} days`);
      }
    } catch { /* ignore */ }
  }

  if (match.resolutionSimilarity < 0.7) {
    flags.push('different_settlement_rules');
    details.push('Settlement or resolution rules differ between platforms');
  }

  if (k.resolutionSource && p.resolutionSource && k.resolutionSource !== p.resolutionSource) {
    flags.push('different_resolution_source');
    details.push(`Kalshi: ${k.resolutionSource}, Polymarket: ${p.resolutionSource}`);
  }

  if (match.matchScore < settings.manualReviewThreshold) {
    flags.push('low_match_confidence');
    details.push(`Match confidence ${(match.matchScore * 100).toFixed(1)}% below threshold`);
  }

  const avgLiq = ((k.liquidity ?? 0) + (p.liquidity ?? 0)) / 2;
  if (avgLiq < settings.minLiquidity) {
    flags.push('low_liquidity');
    details.push(`Average liquidity $${avgLiq.toFixed(0)} below minimum`);
  }

  const kSpread = k.yesAsk !== null && k.yesBid !== null ? k.yesAsk - k.yesBid : null;
  const pSpread = p.yesAsk !== null && p.yesBid !== null ? p.yesAsk - p.yesBid : null;
  if ((kSpread !== null && kSpread > settings.maxSpreadAllowed) ||
      (pSpread !== null && pSpread > settings.maxSpreadAllowed)) {
    flags.push('wide_spread');
    details.push('Bid-ask spread exceeds configured maximum');
  }

  if (k.status === 'suspended' || p.status === 'suspended') {
    flags.push('market_suspended');
    details.push('One or both markets are suspended');
  }
  if (k.status === 'closed' || p.status === 'closed') {
    flags.push('market_closed');
    details.push('One or both markets are closed');
  }

  if (calc.totalFees > calc.grossProfitPerPair && calc.grossArbitrage) {
    flags.push('fees_exceed_edge');
    details.push('Estimated fees exceed gross arbitrage edge');
  }

  if (calc.adjustedProfitPerPair <= 0 && calc.grossArbitrage) {
    flags.push('slippage_exceeds_edge');
    details.push('Slippage and fees eliminate the gross edge');
  }

  if (match.outcomeRelationship === 'unclear') {
    flags.push('ambiguous_wording');
    details.push('Outcome relationship is unclear');
  }

  if (!k.orderbook && !p.orderbook) {
    flags.push('missing_orderbook');
    details.push('Order book depth unavailable — sizing is estimated');
  }

  if (match.manualReviewRequired) {
    flags.push('manual_review_required');
    details.push('Manual review recommended before acting');
  }

  if (calc.liquiditySource === 'estimated') {
    flags.push('partial_data');
    details.push('Liquidity sizing based on estimates, not full order book');
  }

  if (match.matchScore < 0.85 && match.matchScore >= settings.minMatchConfidence) {
    flags.push('possible_false_match');
    details.push('Moderate match score — verify event equivalence manually');
  }

  const avgVol = ((k.volume ?? 0) + (p.volume ?? 0)) / 2;
  if (avgVol < 5000) {
    flags.push('low_volume');
    details.push('Low trading volume on one or both markets');
  }

  return { flags, details };
}

export function computeRiskScore(flags: RiskFlag[]): number {
  if (flags.length === 0) return 1;
  const weights: Partial<Record<RiskFlag, number>> = {
    different_expiration: 0.15,
    different_settlement_rules: 0.2,
    low_match_confidence: 0.2,
    low_liquidity: 0.15,
    wide_spread: 0.1,
    ambiguous_wording: 0.25,
    manual_review_required: 0.15,
    possible_false_match: 0.2,
    fees_exceed_edge: 0.2,
    slippage_exceeds_edge: 0.2,
    missing_orderbook: 0.05,
    partial_data: 0.05,
    market_suspended: 0.3,
    market_closed: 0.3,
    near_expiration: 0.1,
    low_volume: 0.1,
  };

  let penalty = 0;
  for (const flag of flags) {
    penalty += weights[flag] ?? 0.05;
  }
  return Math.max(0, 1 - Math.min(1, penalty));
}
