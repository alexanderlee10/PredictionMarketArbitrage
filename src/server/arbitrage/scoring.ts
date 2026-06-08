import { clamp } from '@/lib/utils';
import { AppSettings } from '@/lib/config';
import { ArbitrageCalculation } from '@/types/opportunity';
import { MatchCandidate } from './matcher';
import { liquidityScore } from './sizing';

export interface ScoredOpportunity {
  opportunityScore: number;
  liquidityScore: number;
  riskScore: number;
}

export function scoreOpportunity(
  match: MatchCandidate,
  calc: ArbitrageCalculation,
  riskScore: number,
  settings: AppSettings,
): ScoredOpportunity {
  const liqScore = liquidityScore(
    match.kalshiMarket,
    match.polymarketMarket,
    calc.maxMatchedPairs,
    settings.minLiquidity,
  );

  const returnNorm = clamp(calc.adjustedReturnPct / 0.1, 0, 1); // 10% = max score

  const opportunityScore =
    returnNorm * 0.35 +
    match.matchScore * 0.25 +
    liqScore * 0.2 +
    riskScore * 0.2;

  return {
    opportunityScore,
    liquidityScore: liqScore,
    riskScore,
  };
}

export function rankOpportunities<T extends { scoring: ScoredOpportunity; calculation: ArbitrageCalculation }>(
  opps: T[],
): T[] {
  return [...opps].sort((a, b) => {
    if (a.calculation.netProfitable !== b.calculation.netProfitable) {
      return a.calculation.netProfitable ? -1 : 1;
    }
    if (b.scoring.opportunityScore !== a.scoring.opportunityScore) {
      return b.scoring.opportunityScore - a.scoring.opportunityScore;
    }
    if (b.calculation.adjustedReturnPct !== a.calculation.adjustedReturnPct) {
      return b.calculation.adjustedReturnPct - a.calculation.adjustedReturnPct;
    }
    return b.calculation.estimatedTotalProfit - a.calculation.estimatedTotalProfit;
  });
}
