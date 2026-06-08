import { NextResponse } from 'next/server';
import https from 'https';
import { getDb, initDb } from '@/lib/db';
import { settings, scans } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function httpsGet(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Accept: 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
    });
    req.setTimeout(10000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

export async function GET() {
  await initDb();
  const db = getDb();

  const dbSettings = await db.select().from(settings);
  const dbSettingMap = Object.fromEntries(dbSettings.map((r) => [r.key, r.value]));
  const recentScans = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(3);

  // Fetch raw market objects so we can inspect the actual field names
  const kalshiUrl = `${process.env.KALSHI_BASE_URL ?? 'https://external-api.kalshi.com/trade-api/v2'}/markets?status=open&limit=5`;
  const polyUrl = `${process.env.POLYMARKET_GAMMA_URL ?? 'https://gamma-api.polymarket.com'}/markets?active=true&closed=false&limit=5`;

  let kalshiResult: Record<string, unknown> = {};
  try {
    const { body } = await httpsGet(kalshiUrl);
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const mkt = (parsed.markets ?? []) as Array<Record<string, unknown>>;
    kalshiResult = {
      count: mkt.length,
      // Show the actual raw object for first market so we can see all fields
      firstMarketRaw: mkt[0] ?? null,
      sampleTickers: mkt.slice(0, 5).map((m) => m.ticker),
      // The fields we care about for matching:
      sampleTitles: mkt.slice(0, 5).map((m) => ({
        ticker: m.ticker,
        title: m.title,
        yes_sub_title: m.yes_sub_title,
        subtitle: m.subtitle,
        category: m.category,
        status: m.status,
      })),
    };
  } catch (err) {
    kalshiResult = { error: String(err) };
  }

  let polyResult: Record<string, unknown> = {};
  try {
    const { body } = await httpsGet(polyUrl);
    const parsed = JSON.parse(body) as Array<Record<string, unknown>>;
    const list = Array.isArray(parsed) ? parsed : [];
    polyResult = {
      count: list.length,
      firstMarketRaw: list[0] ?? null,
      sampleMarkets: list.slice(0, 5).map((m) => ({
        question: m.question,
        slug: m.slug,
        endDate: m.endDate,
        bestAsk: m.bestAsk,
        bestBid: m.bestBid,
        active: m.active,
      })),
    };
  } catch (err) {
    polyResult = { error: String(err) };
  }

  return NextResponse.json({
    envVars: {
      USE_MOCK_DATA: process.env.USE_MOCK_DATA,
      MIN_MATCH_CONFIDENCE: process.env.MIN_MATCH_CONFIDENCE,
      NODE_VERSION: process.version,
    },
    dbSettings: dbSettingMap,
    kalshi: kalshiResult,
    polymarket: polyResult,
    recentScans: recentScans.map((s) => ({
      startedAt: s.startedAt,
      dataSourceMode: s.dataSourceMode,
      kalshiMarketsCount: s.kalshiMarketsCount,
      polymarketMarketsCount: s.polymarketMarketsCount,
      matchesCount: s.matchesCount,
      errors: JSON.parse(s.errors),
    })),
  });
}
