import { initDb, getDb } from '@/lib/db';
import { journalEntries } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { formatDate, formatUsd } from '@/lib/utils';
import { JournalForm } from '@/components/JournalForm';

export const dynamic = 'force-dynamic';

export default async function JournalPage() {
  await initDb();
  const db = getDb();
  const rows = await db.select().from(journalEntries).orderBy(desc(journalEntries.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manual Trade Journal</h1>
        <p className="text-sm text-muted-foreground">
          Record your manual actions — this tool does not place live trades
        </p>
      </div>
      <JournalForm />
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Notes</th>
              <th className="px-3 py-2 text-right">Kalshi Stake</th>
              <th className="px-3 py-2 text-right">Poly Stake</th>
              <th className="px-3 py-2 text-left">Result</th>
              <th className="px-3 py-2 text-right">P/L</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No journal entries yet.
                </td>
              </tr>
            ) : (
              rows.map((e) => (
                <tr key={e.id} className="border-b border-border">
                  <td className="px-3 py-2 text-xs">{formatDate(e.createdAt)}</td>
                  <td className="px-3 py-2 text-xs">{e.actionType}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-xs">{e.notes}</td>
                  <td className="px-3 py-2 text-right text-xs">{e.kalshiStake ? formatUsd(e.kalshiStake) : '—'}</td>
                  <td className="px-3 py-2 text-right text-xs">{e.polymarketStake ? formatUsd(e.polymarketStake) : '—'}</td>
                  <td className="px-3 py-2 text-xs">{e.result ?? '—'}</td>
                  <td className={`px-3 py-2 text-right text-xs ${(e.profitLoss ?? 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {e.profitLoss !== null ? formatUsd(e.profitLoss) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
