import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { getDb, initDb } from '@/lib/db';
import { scans, apiErrors } from '@/lib/db/schema';
import { getKalshiStatus } from '@/server/markets/kalshiClient';
import { getPolymarketStatus } from '@/server/markets/polymarketClient';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  await initDb();
  const db = getDb();
  const settings = await getSettings();
  const kalshi = getKalshiStatus();
  const polymarket = getPolymarketStatus();

  if (settings.useMockData) {
    kalshi.mockMode = true;
    polymarket.mockMode = true;
    kalshi.connected = true;
    polymarket.connected = true;
  }

  const latestScan = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(1);
  const recentErrors = await db.select().from(apiErrors).orderBy(desc(apiErrors.createdAt)).limit(10);

  return NextResponse.json({
    kalshi: {
      ...kalshi,
      apiKeyConfigured: Boolean(process.env.KALSHI_API_KEY_ID),
    },
    polymarket: {
      ...polymarket,
      apiKeyConfigured: Boolean(process.env.POLYMARKET_API_KEY || process.env.POLYMARKET_WALLET_ADDRESS),
    },
    mockMode: settings.useMockData,
    lastScan: latestScan[0] ?? null,
    recentErrors,
  });
}
