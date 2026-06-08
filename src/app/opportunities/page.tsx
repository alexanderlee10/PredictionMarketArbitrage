import { OpportunityTable } from '@/components/OpportunityTable';
import { initDb, getDb } from '@/lib/db';
import { opportunities, scans } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getOpportunities() {
  await initDb();
  const db = getDb();
  const latestScan = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(1);
  if (!latestScan.length) return [];

  const rows = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.scanId, latestScan[0].id))
    .orderBy(desc(opportunities.opportunityScore));

  return rows.map((o) => ({
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
}

export default async function OpportunitiesPage() {
  const opps = await getOpportunities();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Live Opportunities</h1>
        <p className="text-sm text-muted-foreground">Ranked arbitrage opportunities from latest scan</p>
      </div>
      <OpportunityTable opportunities={opps} />
    </div>
  );
}
