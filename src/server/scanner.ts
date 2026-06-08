import { eq } from 'drizzle-orm';
import { getDb, initDb, persistDb } from '@/lib/db';
import {
  markets,
  scans,
  marketMatches,
  opportunities,
  opportunitySnapshots,
  apiErrors,
} from '@/lib/db/schema';
import { generateId } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { getSettings } from '@/lib/settings';
import { ArbitrageOpportunity } from '@/types/opportunity';
import { NormalizedMarket } from '@/types/market';
import { getMockMarkets } from './markets/mockData';
import { fetchKalshiMarkets } from './markets/kalshiClient';
import { fetchPolymarketMarkets } from './markets/polymarketClient';
import { findMatches, MatchCandidate } from './arbitrage/matcher';
import { calculateArbitrage } from './arbitrage/calculator';
import { computeRiskFlags, computeRiskScore } from './arbitrage/risk';
import { scoreOpportunity, rankOpportunities } from './arbitrage/scoring';

export async function runScan(): Promise<{
  scanId: string;
  opportunities: ArbitrageOpportunity[];
}> {
  await initDb();
  const db = getDb();
  const settings = await getSettings();
  const scanId = generateId('scan');
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Insert scan row first — child tables reference scan_id via foreign keys
  await db.insert(scans).values({
    id: scanId,
    startedAt,
    dataSourceMode: settings.useMockData ? 'mock' : 'live',
  });

  let kalshiMarkets: NormalizedMarket[] = [];
  let polymarketMarkets: NormalizedMarket[] = [];
  const dataSourceMode = settings.useMockData ? 'mock' : 'live';

  if (settings.useMockData) {
    const mock = getMockMarkets();
    kalshiMarkets = mock.kalshi;
    polymarketMarkets = mock.polymarket;
    logger.info('Using mock market data');
  } else {
    const [kalshiResult, polyResult] = await Promise.all([
      fetchKalshiMarkets(settings.maxMarketsPerScan),
      fetchPolymarketMarkets(settings.maxMarketsPerScan),
    ]);
    kalshiMarkets = kalshiResult.markets;
    polymarketMarkets = polyResult.markets;
    errors.push(...kalshiResult.errors, ...polyResult.errors);

    for (const err of kalshiResult.errors) {
      await db.insert(apiErrors).values({
        id: generateId('err'),
        scanId,
        platform: 'kalshi',
        endpoint: '/markets',
        errorMessage: err,
      });
    }
    for (const err of polyResult.errors) {
      await db.insert(apiErrors).values({
        id: generateId('err'),
        scanId,
        platform: 'polymarket',
        endpoint: '/markets',
        errorMessage: err,
      });
    }
  }

  // Upsert market snapshots
  const now = new Date().toISOString();
  for (const m of [...kalshiMarkets, ...polymarketMarkets]) {
    await db
      .insert(markets)
      .values({
        id: m.id,
        platform: m.platform,
        eventTitle: m.eventTitle,
        marketTitle: m.marketTitle,
        description: m.description,
        yesBid: m.yesBid,
        yesAsk: m.yesAsk,
        noBid: m.noBid,
        noAsk: m.noAsk,
        lastPrice: m.lastPrice,
        volume: m.volume,
        liquidity: m.liquidity,
        expiration: m.expiration,
        resolutionRules: m.resolutionRules,
        resolutionSource: m.resolutionSource,
        marketId: m.marketId,
        url: m.url,
        status: m.status,
        orderbook: m.orderbook ? JSON.stringify(m.orderbook) : null,
        rawData: JSON.stringify(m.rawData),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: markets.id,
        set: {
          yesBid: m.yesBid,
          yesAsk: m.yesAsk,
          noBid: m.noBid,
          noAsk: m.noAsk,
          lastPrice: m.lastPrice,
          volume: m.volume,
          liquidity: m.liquidity,
          status: m.status,
          orderbook: m.orderbook ? JSON.stringify(m.orderbook) : null,
          rawData: JSON.stringify(m.rawData),
          updatedAt: now,
        },
      });
  }

  const { accepted: matches } = findMatches(kalshiMarkets, polymarketMarkets, {
    minMatchConfidence: settings.minMatchConfidence,
    manualReviewThreshold: settings.manualReviewThreshold,
    useSemanticMatching: settings.useSemanticMatching,
  });

  const detectedOpps: ArbitrageOpportunity[] = [];

  for (const match of matches) {
    const matchId = generateId('match');
    await db.insert(marketMatches).values({
      id: matchId,
      scanId,
      kalshiMarketId: match.kalshiMarketId,
      polymarketMarketId: match.polymarketMarketId,
      matchScore: match.matchScore,
      titleSimilarity: match.titleSimilarity,
      descriptionSimilarity: match.descriptionSimilarity,
      dateSimilarity: match.dateSimilarity,
      resolutionSimilarity: match.resolutionSimilarity,
      semanticSimilarity: match.semanticSimilarity,
      matchExplanation: match.matchExplanation,
      warnings: JSON.stringify(match.warnings),
      manualReviewRequired: match.manualReviewRequired,
      outcomeRelationship: match.outcomeRelationship,
      kalshiSide: match.kalshiSide,
      polymarketSide: match.polymarketSide,
      kalshiMarketTitle: match.kalshiMarket.marketTitle,
      polymarketMarketTitle: match.polymarketMarket.marketTitle,
    });

    if (match.outcomeRelationship !== 'opposite_outcome') continue;

    const calc = calculateArbitrage(
      match.kalshiMarket,
      match.polymarketMarket,
      match.kalshiSide,
      match.polymarketSide,
      settings,
    );
    if (!calc) continue;

    const { flags, details } = computeRiskFlags(match, calc, settings);
    const riskScore = computeRiskScore(flags);
    const scoring = scoreOpportunity(match, calc, riskScore, settings);

    const oppId = generateId('opp');
    const expirationDate = match.kalshiMarket.expiration ?? match.polymarketMarket.expiration;

    const opp: ArbitrageOpportunity = {
      id: oppId,
      scanId,
      kalshiMarketId: match.kalshiMarketId,
      polymarketMarketId: match.polymarketMarketId,
      kalshiMarketTitle: match.kalshiMarket.marketTitle,
      polymarketMarketTitle: match.polymarketMarket.marketTitle,
      matchResult: {
        kalshiMarketId: match.kalshiMarketId,
        polymarketMarketId: match.polymarketMarketId,
        matchScore: match.matchScore,
        titleSimilarity: match.titleSimilarity,
        descriptionSimilarity: match.descriptionSimilarity,
        dateSimilarity: match.dateSimilarity,
        resolutionSimilarity: match.resolutionSimilarity,
        semanticSimilarity: match.semanticSimilarity,
        matchExplanation: match.matchExplanation,
        warnings: match.warnings,
        manualReviewRequired: match.manualReviewRequired,
        outcomeRelationship: match.outcomeRelationship,
        kalshiSide: match.kalshiSide,
        polymarketSide: match.polymarketSide,
      },
      calculation: calc,
      scoring: { ...scoring, rank: 0 },
      riskFlags: flags,
      riskFlagsDetail: details,
      expirationDate,
      detectedAt: now,
      status: 'new',
      kalshiMarketSnapshot: match.kalshiMarket as unknown as Record<string, unknown>,
      polymarketMarketSnapshot: match.polymarketMarket as unknown as Record<string, unknown>,
    };

    detectedOpps.push(opp);

    const existing = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.kalshiMarketId, match.kalshiMarketId))
      .then((rows) =>
        rows.find((r) => r.polymarketMarketId === match.polymarketMarketId),
      );

    const firstSeenAt = existing?.firstSeenAt ?? now;

    await db.insert(opportunities).values({
      id: oppId,
      scanId,
      matchId,
      kalshiMarketId: match.kalshiMarketId,
      polymarketMarketId: match.polymarketMarketId,
      kalshiMarketTitle: match.kalshiMarket.marketTitle,
      polymarketMarketTitle: match.polymarketMarket.marketTitle,
      kalshiPrice: calc.kalshiPrice,
      polymarketPrice: calc.polymarketPrice,
      kalshiSide: match.kalshiSide,
      polymarketSide: match.polymarketSide,
      totalCost: calc.totalCost,
      grossProfitPerPair: calc.grossProfitPerPair,
      grossReturnPct: calc.grossReturnPct,
      grossArbitrage: calc.grossArbitrage,
      totalFees: calc.totalFees,
      adjustedCost: calc.adjustedCost,
      adjustedProfitPerPair: calc.adjustedProfitPerPair,
      adjustedReturnPct: calc.adjustedReturnPct,
      netProfitable: calc.netProfitable,
      maxMatchedPairs: calc.maxMatchedPairs,
      maxCapitalDeployable: calc.maxCapitalDeployable,
      estimatedTotalProfit: calc.estimatedTotalProfit,
      liquiditySource: calc.liquiditySource,
      opportunityScore: scoring.opportunityScore,
      matchConfidence: match.matchScore,
      liquidityScore: scoring.liquidityScore,
      riskScore: scoring.riskScore,
      riskFlags: JSON.stringify(flags),
      riskFlagsDetail: JSON.stringify(details),
      expirationDate,
      status: existing ? 'still_active' : 'new',
      firstSeenAt,
      lastSeenAt: now,
      kalshiSnapshot: JSON.stringify(match.kalshiMarket),
      polymarketSnapshot: JSON.stringify(match.polymarketMarket),
    });

    await db.insert(opportunitySnapshots).values({
      id: generateId('snap'),
      opportunityId: oppId,
      scanId,
      kalshiPrice: calc.kalshiPrice,
      polymarketPrice: calc.polymarketPrice,
      grossReturnPct: calc.grossReturnPct,
      adjustedReturnPct: calc.adjustedReturnPct,
      maxMatchedPairs: calc.maxMatchedPairs,
      riskFlags: JSON.stringify(flags),
      status: existing ? 'still_active' : 'new',
    });

    if (match.manualReviewRequired) {
      warnings.push(`Manual review: ${match.kalshiMarket.marketTitle}`);
    }
  }

  const ranked = rankOpportunities(detectedOpps);
  ranked.forEach((o, i) => {
    o.scoring.rank = i + 1;
  });

  const netProfitable = ranked.filter((o) => o.calculation.netProfitable);
  const best = netProfitable[0] ?? ranked.find((o) => o.calculation.grossArbitrage) ?? ranked[0];
  const finishedAt = new Date().toISOString();
  const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();

  await db
    .update(scans)
    .set({
      finishedAt,
      durationMs,
      kalshiMarketsCount: kalshiMarkets.length,
      polymarketMarketsCount: polymarketMarkets.length,
      matchesCount: matches.length,
      opportunitiesCount: ranked.length,
      netProfitableCount: netProfitable.length,
      bestOpportunityId: best?.id ?? null,
      bestAdjustedReturn: best?.calculation.adjustedReturnPct ?? null,
      errors: JSON.stringify(errors),
      warnings: JSON.stringify(warnings),
      dataSourceMode,
    })
    .where(eq(scans.id, scanId));

  persistDb();

  logger.info('Scan complete', {
    scanId,
    matches: matches.length,
    opportunities: ranked.length,
    netProfitable: netProfitable.length,
  });

  return { scanId, opportunities: ranked };
}
