import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb, initDb } from '@/lib/db';
import { opportunities, scans } from '@/lib/db/schema';
import { parseJsonSafe, toCsvRow } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function rowToOpportunity(row: typeof opportunities.$inferSelect) {
  return {
    id: row.id,
    scanId: row.scanId,
    kalshiMarketId: row.kalshiMarketId,
    polymarketMarketId: row.polymarketMarketId,
    kalshiMarketTitle: row.kalshiMarketTitle,
    polymarketMarketTitle: row.polymarketMarketTitle,
    kalshiSide: row.kalshiSide,
    polymarketSide: row.polymarketSide,
    kalshiPrice: row.kalshiPrice,
    polymarketPrice: row.polymarketPrice,
    totalCost: row.totalCost,
    grossProfitPerPair: row.grossProfitPerPair,
    grossReturnPct: row.grossReturnPct,
    grossArbitrage: row.grossArbitrage,
    totalFees: row.totalFees,
    adjustedCost: row.adjustedCost,
    adjustedProfitPerPair: row.adjustedProfitPerPair,
    adjustedReturnPct: row.adjustedReturnPct,
    netProfitable: row.netProfitable,
    maxMatchedPairs: row.maxMatchedPairs,
    maxCapitalDeployable: row.maxCapitalDeployable,
    estimatedTotalProfit: row.estimatedTotalProfit,
    liquiditySource: row.liquiditySource,
    opportunityScore: row.opportunityScore,
    matchConfidence: row.matchConfidence,
    liquidityScore: row.liquidityScore,
    riskScore: row.riskScore,
    riskFlags: parseJsonSafe<string[]>(row.riskFlags, []),
    riskFlagsDetail: parseJsonSafe<string[]>(row.riskFlagsDetail, []),
    expirationDate: row.expirationDate,
    status: row.status,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
    kalshiSnapshot: parseJsonSafe(row.kalshiSnapshot, {}),
    polymarketSnapshot: parseJsonSafe(row.polymarketSnapshot, {}),
  };
}

export async function GET(req: NextRequest) {
  await initDb();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');
  const scanId = searchParams.get('scanId');

  let rows;
  if (scanId) {
    rows = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.scanId, scanId))
      .orderBy(desc(opportunities.opportunityScore));
  } else {
    const latestScan = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(1);
    if (!latestScan.length) {
      return NextResponse.json({ opportunities: [] });
    }
    rows = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.scanId, latestScan[0].id))
      .orderBy(desc(opportunities.opportunityScore));
  }

  const data = rows.map(rowToOpportunity);

  if (format === 'csv') {
    const headers = [
      'rank', 'opportunity_score', 'kalshi_title', 'polymarket_title',
      'kalshi_side', 'polymarket_side', 'kalshi_price', 'polymarket_price',
      'total_cost', 'gross_return_pct', 'adjusted_return_pct', 'net_profitable',
      'estimated_total_profit', 'match_confidence', 'risk_score', 'risk_flags',
    ];
    const lines = [
      headers.join(','),
      ...data.map((o, i) =>
        toCsvRow([
          i + 1, o.opportunityScore, o.kalshiMarketTitle, o.polymarketMarketTitle,
          o.kalshiSide, o.polymarketSide, o.kalshiPrice, o.polymarketPrice,
          o.totalCost, o.grossReturnPct, o.adjustedReturnPct, o.netProfitable,
          o.estimatedTotalProfit, o.matchConfidence, o.riskScore,
          o.riskFlags.join(';'),
        ]),
      ),
    ];
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="opportunities.csv"',
      },
    });
  }

  return NextResponse.json({ opportunities: data });
}
