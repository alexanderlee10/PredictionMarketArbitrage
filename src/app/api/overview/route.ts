import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb, initDb } from '@/lib/db';
import { scans, opportunities } from '@/lib/db/schema';
import { getSettings } from '@/lib/settings';
import { getKalshiStatus } from '@/server/markets/kalshiClient';
import { getPolymarketStatus } from '@/server/markets/polymarketClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  await initDb();
  const db = getDb();
  const settings = await getSettings();
  const latestScan = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(1);
  const scan = latestScan[0] ?? null;

  let opps: typeof opportunities.$inferSelect[] = [];
  if (scan) {
    opps = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.scanId, scan.id))
      .orderBy(desc(opportunities.opportunityScore));
  }

  const grossArb = opps.filter((o) => o.grossArbitrage);
  const netProfitable = opps.filter((o) => o.netProfitable);
  const needsReview = opps.filter((o) => {
    try {
      const flags = JSON.parse(o.riskFlags) as string[];
      return flags.includes('manual_review_required');
    } catch {
      return false;
    }
  });

  const kalshi = getKalshiStatus();
  const polymarket = getPolymarketStatus();

  return NextResponse.json({
    totalKalshiMarkets: scan?.kalshiMarketsCount ?? 0,
    totalPolymarketMarkets: scan?.polymarketMarketsCount ?? 0,
    totalMatches: scan?.matchesCount ?? 0,
    grossOpportunities: grossArb.length,
    netProfitableOpportunities: netProfitable.length,
    bestAdjustedReturn: scan?.bestAdjustedReturn ?? null,
    bestOpportunityProfit: netProfitable[0]?.estimatedTotalProfit ?? 0,
    bestOpportunityMaxPairs: netProfitable[0]?.maxMatchedPairs ?? 0,
    bestOpportunityMaxCapital: netProfitable[0]?.maxCapitalDeployable ?? 0,
    lastScanTime: scan?.finishedAt ?? scan?.startedAt ?? null,
    apiStatus: settings.useMockData ? 'mock' : kalshi.connected && polymarket.connected ? 'connected' : 'degraded',
    needsManualReview: needsReview.length,
    scanId: scan?.id ?? null,
  });
}
