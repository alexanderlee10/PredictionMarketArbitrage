import { SummaryCards } from '@/components/SummaryCards';
import { OpportunityTable } from '@/components/OpportunityTable';
import { initDb } from '@/lib/db';
import { runScan } from '@/server/scanner';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { scans, opportunities } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

async function getData() {
  await initDb();
  const db = getDb();

  let latestScan = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(1);

  if (!latestScan.length) {
    await runScan();
    latestScan = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(1);
  }

  const scan = latestScan[0];
  const opps = scan
    ? await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.scanId, scan.id))
        .orderBy(desc(opportunities.opportunityScore))
    : [];

  const grossArb = opps.filter((o) => o.grossArbitrage);
  const netProfitable = opps.filter((o) => o.netProfitable);
  const needsReview = opps.filter((o) => {
    try {
      return (JSON.parse(o.riskFlags) as string[]).includes('manual_review_required');
    } catch {
      return false;
    }
  });

  const bestNetOpp = netProfitable[0] ?? null;

  const overview = {
    totalKalshiMarkets: scan?.kalshiMarketsCount ?? 0,
    totalPolymarketMarkets: scan?.polymarketMarketsCount ?? 0,
    totalMatches: scan?.matchesCount ?? 0,
    grossOpportunities: grossArb.length,
    netProfitableOpportunities: netProfitable.length,
    bestAdjustedReturn: scan?.bestAdjustedReturn ?? null,
    // Best single opportunity only — do NOT sum all opps (that assumes unlimited capital on each)
    bestOpportunityProfit: bestNetOpp?.estimatedTotalProfit ?? 0,
    bestOpportunityMaxPairs: bestNetOpp?.maxMatchedPairs ?? 0,
    bestOpportunityMaxCapital: bestNetOpp?.maxCapitalDeployable ?? 0,
    lastScanTime: scan?.finishedAt ?? scan?.startedAt ?? null,
    apiStatus: scan?.dataSourceMode === 'mock' ? 'mock' : 'live',
    needsManualReview: needsReview.length,
  };

  const opportunityRows = opps.map((o) => ({
    id: o.id,
    kalshiMarketTitle: o.kalshiMarketTitle,
    polymarketMarketTitle: o.polymarketMarketTitle,
    kalshiSide: o.kalshiSide,
    polymarketSide: o.polymarketSide,
    kalshiPrice: o.kalshiPrice,
    polymarketPrice: o.polymarketPrice,
    totalCost: o.totalCost,
    grossProfitPerPair: o.grossProfitPerPair,
    grossReturnPct: o.grossReturnPct,
    totalFees: o.totalFees,
    adjustedProfitPerPair: o.adjustedProfitPerPair,
    adjustedReturnPct: o.adjustedReturnPct,
    netProfitable: o.netProfitable,
    maxMatchedPairs: o.maxMatchedPairs,
    estimatedTotalProfit: o.estimatedTotalProfit,
    opportunityScore: o.opportunityScore,
    matchConfidence: o.matchConfidence,
    liquidityScore: o.liquidityScore,
    riskScore: o.riskScore,
    riskFlags: JSON.parse(o.riskFlags) as string[],
    expirationDate: o.expirationDate,
    lastSeenAt: o.lastSeenAt,
    kalshiSnapshot: JSON.parse(o.kalshiSnapshot) as Record<string, unknown>,
    polymarketSnapshot: JSON.parse(o.polymarketSnapshot) as Record<string, unknown>,
  }));

  return { overview, opportunityRows };
}

export default async function OverviewPage() {
  const { overview, opportunityRows } = await getData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Cross-platform arbitrage between Kalshi and Polymarket
        </p>
      </div>
      <SummaryCards data={overview} />
      <div>
        <h2 className="mb-3 text-lg font-semibold">Top Opportunities</h2>
        <OpportunityTable opportunities={opportunityRows} />
      </div>
    </div>
  );
}
