export type OutcomeRelationship =
  | 'same_outcome'
  | 'opposite_outcome'
  | 'unclear'
  | 'not_comparable';

export type RiskFlag =
  | 'different_expiration'
  | 'different_settlement_rules'
  | 'low_match_confidence'
  | 'low_liquidity'
  | 'wide_spread'
  | 'stale_data'
  | 'market_suspended'
  | 'market_closed'
  | 'fees_exceed_edge'
  | 'slippage_exceeds_edge'
  | 'ambiguous_wording'
  | 'different_resolution_source'
  | 'missing_orderbook'
  | 'manual_review_required'
  | 'api_failure'
  | 'partial_data'
  | 'possible_duplicate'
  | 'possible_false_match'
  | 'near_expiration'
  | 'low_volume';

export type OpportunityStatus =
  | 'new'
  | 'still_active'
  | 'disappeared'
  | 'manually_reviewed'
  | 'ignored'
  | 'paper_traded'
  | 'executed_manually'
  | 'false_positive';

export interface MatchResult {
  kalshiMarketId: string;
  polymarketMarketId: string;
  matchScore: number;
  titleSimilarity: number;
  descriptionSimilarity: number;
  dateSimilarity: number;
  resolutionSimilarity: number;
  semanticSimilarity: number | null;
  matchExplanation: string;
  warnings: string[];
  manualReviewRequired: boolean;
  outcomeRelationship: OutcomeRelationship;
  kalshiSide: 'YES' | 'NO';
  polymarketSide: 'YES' | 'NO';
}

export interface ArbitrageCalculation {
  // Gross (before fees/slippage)
  kalshiPrice: number;           // executable ask price
  polymarketPrice: number;       // executable ask price
  totalCost: number;             // kalshiPrice + polymarketPrice
  grossProfitPerPair: number;    // 1 - totalCost
  grossReturnPct: number;        // grossProfitPerPair / totalCost
  grossArbitrage: boolean;       // grossProfitPerPair > 0

  // Fee breakdown
  kalshiFeeBps: number;
  polymarketFeeBps: number;
  kalshiFee: number;
  polymarketFee: number;
  gasCostUsd: number;
  slippageBps: number;
  totalFees: number;

  // Adjusted (after fees/slippage)
  adjustedCost: number;
  adjustedProfitPerPair: number;
  adjustedReturnPct: number;
  netProfitable: boolean;

  // Sizing
  maxSharesSide1: number;
  maxSharesSide2: number;
  maxMatchedPairs: number;
  maxCapitalDeployable: number;
  estimatedTotalProfit: number;
  liquiditySource: 'orderbook' | 'estimated';
}

export interface OpportunityScoring {
  opportunityScore: number;
  liquidityScore: number;
  riskScore: number;
  rank: number;
}

export interface ArbitrageOpportunity {
  id: string;
  scanId: string;

  // Market references
  kalshiMarketId: string;
  polymarketMarketId: string;
  kalshiMarketTitle: string;
  polymarketMarketTitle: string;

  // Match details
  matchResult: MatchResult;

  // Calculation
  calculation: ArbitrageCalculation;

  // Scoring
  scoring: OpportunityScoring;

  // Risk
  riskFlags: RiskFlag[];
  riskFlagsDetail: string[];

  // Metadata
  expirationDate: string | null;
  detectedAt: string;
  status: OpportunityStatus;

  // Raw market snapshots
  kalshiMarketSnapshot: Record<string, unknown>;
  polymarketMarketSnapshot: Record<string, unknown>;
}

export interface ScanResult {
  scanId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  kalshiMarketsCount: number;
  polymarketMarketsCount: number;
  matchesCount: number;
  opportunitiesCount: number;
  netProfitableCount: number;
  bestOpportunityId: string | null;
  bestAdjustedReturn: number | null;
  errors: string[];
  warnings: string[];
  dataSourceMode: 'mock' | 'live';
}
