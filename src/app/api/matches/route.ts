import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb, initDb } from '@/lib/db';
import { marketMatches, scans } from '@/lib/db/schema';
import { parseJsonSafe } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await initDb();
  const db = getDb();
  const scanId = new URL(req.url).searchParams.get('scanId');

  let rows;
  if (scanId) {
    rows = await db
      .select()
      .from(marketMatches)
      .where(eq(marketMatches.scanId, scanId))
      .orderBy(desc(marketMatches.matchScore));
  } else {
    const latestScan = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(1);
    if (!latestScan.length) return NextResponse.json({ matches: [] });
    rows = await db
      .select()
      .from(marketMatches)
      .where(eq(marketMatches.scanId, latestScan[0].id))
      .orderBy(desc(marketMatches.matchScore));
  }

  const matches = rows.map((r) => ({
    id: r.id,
    scanId: r.scanId,
    kalshiMarketTitle: r.kalshiMarketTitle,
    polymarketMarketTitle: r.polymarketMarketTitle,
    matchScore: r.matchScore,
    titleSimilarity: r.titleSimilarity,
    descriptionSimilarity: r.descriptionSimilarity,
    dateSimilarity: r.dateSimilarity,
    resolutionSimilarity: r.resolutionSimilarity,
    semanticSimilarity: r.semanticSimilarity,
    matchExplanation: r.matchExplanation,
    warnings: parseJsonSafe<string[]>(r.warnings, []),
    manualReviewRequired: r.manualReviewRequired,
    outcomeRelationship: r.outcomeRelationship,
    kalshiSide: r.kalshiSide,
    polymarketSide: r.polymarketSide,
  }));

  return NextResponse.json({ matches });
}
