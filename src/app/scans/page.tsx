import { initDb, getDb } from '@/lib/db';
import { scans } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ScansPage() {
  await initDb();
  const db = getDb();
  const rows = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(50);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Scan History</h1>
        <p className="text-sm text-muted-foreground">Record of all scanner runs</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Scan ID</th>
              <th className="px-3 py-2 text-left">Started</th>
              <th className="px-3 py-2 text-right">Duration</th>
              <th className="px-3 py-2 text-right">Kalshi</th>
              <th className="px-3 py-2 text-right">Polymarket</th>
              <th className="px-3 py-2 text-right">Matches</th>
              <th className="px-3 py-2 text-right">Opps</th>
              <th className="px-3 py-2 text-right">Net Prof</th>
              <th className="px-3 py-2 text-left">Mode</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-border">
                <td className="px-3 py-2 font-mono text-xs">{s.id.slice(0, 20)}…</td>
                <td className="px-3 py-2 text-xs">{formatDate(s.startedAt)}</td>
                <td className="px-3 py-2 text-right text-xs">{s.durationMs ? `${s.durationMs}ms` : '—'}</td>
                <td className="px-3 py-2 text-right">{s.kalshiMarketsCount}</td>
                <td className="px-3 py-2 text-right">{s.polymarketMarketsCount}</td>
                <td className="px-3 py-2 text-right">{s.matchesCount}</td>
                <td className="px-3 py-2 text-right">{s.opportunitiesCount}</td>
                <td className="px-3 py-2 text-right text-profit">{s.netProfitableCount}</td>
                <td className="px-3 py-2 text-xs">{s.dataSourceMode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
