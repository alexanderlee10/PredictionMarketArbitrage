import { initDb, getDb } from '@/lib/db';
import { opportunities } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { formatDate, formatPct } from '@/lib/utils';
import { RiskBadgeList } from '@/components/RiskBadge';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  await initDb();
  const db = getDb();
  const rows = await db.select().from(opportunities).orderBy(desc(opportunities.lastSeenAt)).limit(100);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Opportunity History</h1>
        <p className="text-sm text-muted-foreground">All detected opportunities over time</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Kalshi</th>
              <th className="px-3 py-2 text-left">Polymarket</th>
              <th className="px-3 py-2 text-left">First Seen</th>
              <th className="px-3 py-2 text-left">Last Seen</th>
              <th className="px-3 py-2 text-right">Gross Ret</th>
              <th className="px-3 py-2 text-right">Adj Ret</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-b border-border">
                <td className="max-w-[160px] truncate px-3 py-2 text-xs">{o.kalshiMarketTitle}</td>
                <td className="max-w-[160px] truncate px-3 py-2 text-xs">{o.polymarketMarketTitle}</td>
                <td className="px-3 py-2 text-xs">{formatDate(o.firstSeenAt)}</td>
                <td className="px-3 py-2 text-xs">{formatDate(o.lastSeenAt)}</td>
                <td className="px-3 py-2 text-right text-xs">{formatPct(o.grossReturnPct)}</td>
                <td className="px-3 py-2 text-right text-xs">{formatPct(o.adjustedReturnPct)}</td>
                <td className="px-3 py-2 text-xs">{o.status}</td>
                <td className="px-3 py-2">
                  <RiskBadgeList flags={JSON.parse(o.riskFlags).slice(0, 2)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
