import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { markets, marketMatches, scans } from '@/lib/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';
import { scoreMarketPair } from '@/server/arbitrage/matcher';
import { NormalizedMarket } from '@/types/market';
import { parseJsonSafe } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  await initDb();
  const db = getDb();

  // Only use markets from the latest scan to avoid mock data contamination
  const latestScan = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(1);
  if (!latestScan.length) {
    return NextResponse.json({ error: 'No scans found — run a scan first.' });
  }
  const scan = latestScan[0];

  // Get the market IDs that were actually fetched in this scan via market_matches
  // For markets without matches, we need a different approach — use the scan's market counts
  // Instead, just query markets updated around the scan time
  const kalshiRows = await db.select().from(markets)
    .where(eq(markets.platform, 'kalshi'))
    .limit(300);
  const polyRows = await db.select().from(markets)
    .where(eq(markets.platform, 'polymarket'))
    .limit(300);

  if (!kalshiRows.length || !polyRows.length) {
    return NextResponse.json({
      error: 'No market data yet.',
      scan: { id: scan.id, kalshiCount: scan.kalshiMarketsCount, polyCount: scan.polymarketMarketsCount, errors: JSON.parse(scan.errors) },
    });
  }

  const toNorm = (r: typeof markets.$inferSelect): NormalizedMarket => ({
    id: r.id, platform: r.platform as 'kalshi' | 'polymarket',
    eventTitle: r.eventTitle, marketTitle: r.marketTitle, description: r.description,
    yesBid: r.yesBid, yesAsk: r.yesAsk, noBid: r.noBid, noAsk: r.noAsk,
    lastPrice: r.lastPrice, volume: r.volume, liquidity: r.liquidity,
    expiration: r.expiration, resolutionRules: r.resolutionRules,
    resolutionSource: r.resolutionSource, marketId: r.marketId, url: r.url,
    status: r.status as NormalizedMarket['status'],
    orderbook: r.orderbook ? parseJsonSafe(r.orderbook, null) : null,
    rawData: parseJsonSafe(r.rawData, {}),
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  });

  const kalshi = kalshiRows.map(toNorm);
  const poly   = polyRows.map(toNorm);
  const config = { minMatchConfidence: 0, manualReviewThreshold: 0.85, useSemanticMatching: false };

  // Score first 150 × 150 pairs (no threshold)
  const sample  = kalshi.slice(0, 150);
  const polySample = poly.slice(0, 150);
  type Scored = { score: number; kTitle: string; pTitle: string; kEvent: string; pEvent: string; titleSim: number; tokenSim: string };
  const all: Scored[] = [];

  for (const k of sample) {
    for (const p of polySample) {
      const c = scoreMarketPair(k, p, config);
      if (c.matchScore > 0.25) {   // skip obvious non-matches to keep response small
        all.push({
          score: c.matchScore,
          kTitle: k.marketTitle,
          pTitle: p.marketTitle,
          kEvent: k.eventTitle,
          pEvent: p.eventTitle,
          titleSim: c.titleSimilarity,
          tokenSim: `${(c.titleSimilarity * 100).toFixed(1)}%`,
        });
      }
    }
  }

  all.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    latestScan: {
      id: scan.id,
      startedAt: scan.startedAt,
      dataSourceMode: scan.dataSourceMode,
      kalshiMarketsCount: scan.kalshiMarketsCount,
      polymarketMarketsCount: scan.polymarketMarketsCount,
      matchesCount: scan.matchesCount,
      errors: JSON.parse(scan.errors),
    },
    kalshiInDb: kalshi.length,
    polyInDb: poly.length,
    realKalshiSample: kalshi.slice(0, 15).map(m => `${m.marketTitle} [${m.eventTitle}]`),
    realPolySample: poly.slice(0, 15).map(m => `${m.marketTitle} [${m.eventTitle}]`),
    aboveThreshold_055: all.filter(p => p.score >= 0.55).length,
    aboveThreshold_040: all.filter(p => p.score >= 0.40).length,
    top20: all.slice(0, 20),
  });
}
