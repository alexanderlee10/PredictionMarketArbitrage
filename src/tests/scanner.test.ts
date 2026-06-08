import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test-arbitrage.db');
// libsql client uses file: URI or bare path
process.env.DATABASE_URL = TEST_DB_PATH;
process.env.USE_MOCK_DATA = 'true';
if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

import { describe, it, expect } from 'vitest';
import { runScan } from '@/server/scanner';
import { initDb, getDb } from '@/lib/db';
import { scans, opportunities } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

describe('scanner pipeline', () => {
  it('runs a full mock scan and saves history', async () => {
    await initDb();
    const result = await runScan();

    expect(result.scanId).toBeTruthy();
    expect(result.opportunities.length).toBeGreaterThan(0);

    const db = getDb();
    const scanRows = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(1);
    expect(scanRows[0].kalshiMarketsCount).toBe(8);
    expect(scanRows[0].polymarketMarketsCount).toBe(8);
    expect(scanRows[0].matchesCount).toBeGreaterThan(0);

    const oppRows = await db.select().from(opportunities);
    expect(oppRows.length).toBeGreaterThan(0);

    const teamA = result.opportunities.find(
      (o) => o.kalshiMarketId === 'CHAMP-A-2024',
    );
    expect(teamA).toBeDefined();
    expect(teamA!.calculation.grossArbitrage).toBe(true);
    expect(teamA!.calculation.grossReturnPct).toBeCloseTo(0.0309, 2);
  });
});
