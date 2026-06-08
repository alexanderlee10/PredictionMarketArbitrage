import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb, initDb } from '@/lib/db';
import { scans, opportunities, opportunitySnapshots } from '@/lib/db/schema';
import { parseJsonSafe } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await initDb();
  const db = getDb();
  const type = new URL(req.url).searchParams.get('type') ?? 'scans';

  if (type === 'scans') {
    const rows = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(50);
    return NextResponse.json({
      scans: rows.map((s) => ({
        ...s,
        errors: parseJsonSafe<string[]>(s.errors, []),
        warnings: parseJsonSafe<string[]>(s.warnings, []),
      })),
    });
  }

  if (type === 'opportunities') {
    const rows = await db.select().from(opportunities).orderBy(desc(opportunities.lastSeenAt)).limit(200);
    return NextResponse.json({
      opportunities: rows.map((o) => ({
        id: o.id,
        firstSeenAt: o.firstSeenAt,
        lastSeenAt: o.lastSeenAt,
        scanId: o.scanId,
        kalshiMarketId: o.kalshiMarketId,
        polymarketMarketId: o.polymarketMarketId,
        kalshiMarketTitle: o.kalshiMarketTitle,
        polymarketMarketTitle: o.polymarketMarketTitle,
        kalshiSide: o.kalshiSide,
        polymarketSide: o.polymarketSide,
        kalshiPrice: o.kalshiPrice,
        polymarketPrice: o.polymarketPrice,
        grossReturnPct: o.grossReturnPct,
        adjustedReturnPct: o.adjustedReturnPct,
        maxMatchedPairs: o.maxMatchedPairs,
        riskFlags: parseJsonSafe<string[]>(o.riskFlags, []),
        status: o.status,
      })),
    });
  }

  if (type === 'snapshots') {
    const oppId = new URL(req.url).searchParams.get('opportunityId');
    if (!oppId) return NextResponse.json({ error: 'opportunityId required' }, { status: 400 });
    const rows = await db
      .select()
      .from(opportunitySnapshots)
      .where(eq(opportunitySnapshots.opportunityId, oppId))
      .orderBy(desc(opportunitySnapshots.createdAt));
    return NextResponse.json({
      snapshots: rows.map((s) => ({
        ...s,
        riskFlags: parseJsonSafe<string[]>(s.riskFlags, []),
      })),
    });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
