import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================================
// Markets (snapshots from each scan)
// ============================================================
export const markets = sqliteTable('markets', {
  id: text('id').primaryKey(),            // platform:marketId
  platform: text('platform').notNull(),   // 'kalshi' | 'polymarket'
  eventTitle: text('event_title').notNull(),
  marketTitle: text('market_title').notNull(),
  description: text('description').notNull().default(''),
  yesBid: real('yes_bid'),
  yesAsk: real('yes_ask'),
  noBid: real('no_bid'),
  noAsk: real('no_ask'),
  lastPrice: real('last_price'),
  volume: real('volume'),
  liquidity: real('liquidity'),
  expiration: text('expiration'),
  resolutionRules: text('resolution_rules'),
  resolutionSource: text('resolution_source'),
  marketId: text('market_id').notNull(),
  url: text('url'),
  status: text('status').notNull().default('unknown'),
  orderbook: text('orderbook'),           // JSON string
  rawData: text('raw_data').notNull(),    // JSON string
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  platformIdx: index('markets_platform_idx').on(t.platform),
  statusIdx: index('markets_status_idx').on(t.status),
}));

// ============================================================
// Scans
// ============================================================
export const scans = sqliteTable('scans', {
  id: text('id').primaryKey(),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  durationMs: integer('duration_ms'),
  kalshiMarketsCount: integer('kalshi_markets_count').notNull().default(0),
  polymarketMarketsCount: integer('polymarket_markets_count').notNull().default(0),
  matchesCount: integer('matches_count').notNull().default(0),
  opportunitiesCount: integer('opportunities_count').notNull().default(0),
  netProfitableCount: integer('net_profitable_count').notNull().default(0),
  bestOpportunityId: text('best_opportunity_id'),
  bestAdjustedReturn: real('best_adjusted_return'),
  errors: text('errors').notNull().default('[]'),         // JSON array
  warnings: text('warnings').notNull().default('[]'),     // JSON array
  dataSourceMode: text('data_source_mode').notNull().default('mock'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ============================================================
// Matched Market Pairs
// ============================================================
export const marketMatches = sqliteTable('market_matches', {
  id: text('id').primaryKey(),
  scanId: text('scan_id').notNull().references(() => scans.id),
  kalshiMarketId: text('kalshi_market_id').notNull(),
  polymarketMarketId: text('polymarket_market_id').notNull(),
  matchScore: real('match_score').notNull(),
  titleSimilarity: real('title_similarity').notNull(),
  descriptionSimilarity: real('description_similarity').notNull(),
  dateSimilarity: real('date_similarity').notNull(),
  resolutionSimilarity: real('resolution_similarity').notNull(),
  semanticSimilarity: real('semantic_similarity'),
  matchExplanation: text('match_explanation').notNull(),
  warnings: text('warnings').notNull().default('[]'),     // JSON array
  manualReviewRequired: integer('manual_review_required', { mode: 'boolean' }).notNull().default(false),
  outcomeRelationship: text('outcome_relationship').notNull(),
  kalshiSide: text('kalshi_side').notNull(),              // 'YES' | 'NO'
  polymarketSide: text('polymarket_side').notNull(),
  kalshiMarketTitle: text('kalshi_market_title').notNull(),
  polymarketMarketTitle: text('polymarket_market_title').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  scanIdx: index('market_matches_scan_idx').on(t.scanId),
  scoreIdx: index('market_matches_score_idx').on(t.matchScore),
}));

// ============================================================
// Opportunities
// ============================================================
export const opportunities = sqliteTable('opportunities', {
  id: text('id').primaryKey(),
  scanId: text('scan_id').notNull().references(() => scans.id),
  matchId: text('match_id').notNull().references(() => marketMatches.id),

  kalshiMarketId: text('kalshi_market_id').notNull(),
  polymarketMarketId: text('polymarket_market_id').notNull(),
  kalshiMarketTitle: text('kalshi_market_title').notNull(),
  polymarketMarketTitle: text('polymarket_market_title').notNull(),

  // Prices
  kalshiPrice: real('kalshi_price').notNull(),
  polymarketPrice: real('polymarket_price').notNull(),
  kalshiSide: text('kalshi_side').notNull(),
  polymarketSide: text('polymarket_side').notNull(),

  // Gross
  totalCost: real('total_cost').notNull(),
  grossProfitPerPair: real('gross_profit_per_pair').notNull(),
  grossReturnPct: real('gross_return_pct').notNull(),
  grossArbitrage: integer('gross_arbitrage', { mode: 'boolean' }).notNull(),

  // Adjusted
  totalFees: real('total_fees').notNull(),
  adjustedCost: real('adjusted_cost').notNull(),
  adjustedProfitPerPair: real('adjusted_profit_per_pair').notNull(),
  adjustedReturnPct: real('adjusted_return_pct').notNull(),
  netProfitable: integer('net_profitable', { mode: 'boolean' }).notNull(),

  // Sizing
  maxMatchedPairs: real('max_matched_pairs').notNull(),
  maxCapitalDeployable: real('max_capital_deployable').notNull(),
  estimatedTotalProfit: real('estimated_total_profit').notNull(),
  liquiditySource: text('liquidity_source').notNull(),

  // Scoring
  opportunityScore: real('opportunity_score').notNull(),
  matchConfidence: real('match_confidence').notNull(),
  liquidityScore: real('liquidity_score').notNull(),
  riskScore: real('risk_score').notNull(),

  // Risk
  riskFlags: text('risk_flags').notNull().default('[]'),          // JSON array
  riskFlagsDetail: text('risk_flags_detail').notNull().default('[]'),  // JSON array

  // Metadata
  expirationDate: text('expiration_date'),
  status: text('status').notNull().default('new'),
  firstSeenAt: text('first_seen_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),

  // Snapshots
  kalshiSnapshot: text('kalshi_snapshot').notNull(),              // JSON
  polymarketSnapshot: text('polymarket_snapshot').notNull(),       // JSON

  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  scanIdx: index('opportunities_scan_idx').on(t.scanId),
  scoreIdx: index('opportunities_score_idx').on(t.opportunityScore),
  profitableIdx: index('opportunities_profitable_idx').on(t.netProfitable),
  kalshiIdx: index('opportunities_kalshi_idx').on(t.kalshiMarketId),
  polyIdx: index('opportunities_poly_idx').on(t.polymarketMarketId),
}));

// ============================================================
// Opportunity Snapshots (history over time)
// ============================================================
export const opportunitySnapshots = sqliteTable('opportunity_snapshots', {
  id: text('id').primaryKey(),
  opportunityId: text('opportunity_id').notNull().references(() => opportunities.id),
  scanId: text('scan_id').notNull().references(() => scans.id),
  kalshiPrice: real('kalshi_price').notNull(),
  polymarketPrice: real('polymarket_price').notNull(),
  grossReturnPct: real('gross_return_pct').notNull(),
  adjustedReturnPct: real('adjusted_return_pct').notNull(),
  maxMatchedPairs: real('max_matched_pairs').notNull(),
  riskFlags: text('risk_flags').notNull().default('[]'),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  oppIdx: index('snapshots_opp_idx').on(t.opportunityId),
}));

// ============================================================
// Manual Trade Journal
// ============================================================
export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey(),
  opportunityId: text('opportunity_id'),           // nullable, may reference a detected opportunity
  actionType: text('action_type').notNull(),        // 'paper_trade' | 'manual_review' | 'ignore' | 'note'
  notes: text('notes').notNull().default(''),
  kalshiStake: real('kalshi_stake'),
  polymarketStake: real('polymarket_stake'),
  kalshiPrice: real('kalshi_price'),
  polymarketPrice: real('polymarket_price'),
  result: text('result'),                           // 'profit' | 'loss' | 'pending' | 'voided'
  profitLoss: real('profit_loss'),
  mistakes: text('mistakes').notNull().default(''),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ============================================================
// API Errors Log
// ============================================================
export const apiErrors = sqliteTable('api_errors', {
  id: text('id').primaryKey(),
  scanId: text('scan_id'),
  platform: text('platform').notNull(),
  endpoint: text('endpoint').notNull(),
  errorMessage: text('error_message').notNull(),
  statusCode: integer('status_code'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ============================================================
// Settings
// ============================================================
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
