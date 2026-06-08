import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { getDb, initDb, persistDb } from '@/lib/db';
import { journalEntries } from '@/lib/db/schema';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  await initDb();
  const db = getDb();
  const rows = await db.select().from(journalEntries).orderBy(desc(journalEntries.createdAt));
  return NextResponse.json({ entries: rows });
}

export async function POST(req: NextRequest) {
  await initDb();
  const db = getDb();
  const body = await req.json();
  const id = generateId('journal');
  const now = new Date().toISOString();

  await db.insert(journalEntries).values({
    id,
    opportunityId: body.opportunityId ?? null,
    actionType: body.actionType ?? 'note',
    notes: body.notes ?? '',
    kalshiStake: body.kalshiStake ?? null,
    polymarketStake: body.polymarketStake ?? null,
    kalshiPrice: body.kalshiPrice ?? null,
    polymarketPrice: body.polymarketPrice ?? null,
    result: body.result ?? null,
    profitLoss: body.profitLoss ?? null,
    mistakes: body.mistakes ?? '',
    createdAt: now,
    updatedAt: now,
  });

  persistDb();
  return NextResponse.json({ success: true, id });
}
