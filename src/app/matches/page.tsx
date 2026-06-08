import { initDb, getDb } from '@/lib/db';
import { marketMatches, markets, scans } from '@/lib/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { formatPct } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function gapColor(gap: number | null) {
  if (gap === null) return 'text-muted-foreground';
  if (gap > 0) return 'text-green-400 font-bold';
  if (gap > -0.05) return 'text-yellow-400';
  return 'text-muted-foreground';
}

function outcomeLabel(rel: string) {
  if (rel === 'opposite_outcome') return { label: 'Opposite', cls: 'bg-blue-500/20 text-blue-300' };
  if (rel === 'same_outcome') return { label: 'Same', cls: 'bg-orange-500/20 text-orange-300' };
  if (rel === 'unclear') return { label: 'Unclear', cls: 'bg-yellow-500/20 text-yellow-300' };
  return { label: rel, cls: 'bg-secondary text-muted-foreground' };
}

export default async function MatchesPage() {
  await initDb();
  const db = getDb();

  const latestScan = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(1);
  const matchRows = latestScan.length
    ? await db
        .select()
        .from(marketMatches)
        .where(eq(marketMatches.scanId, latestScan[0].id))
        .orderBy(desc(marketMatches.matchScore))
    : [];

  // Fetch prices for all referenced markets in one query
  const allMarketIds = Array.from(
    new Set([
      ...matchRows.map((m) => m.kalshiMarketId),
      ...matchRows.map((m) => m.polymarketMarketId),
    ]),
  );
  const marketRows =
    allMarketIds.length > 0
      ? await db.select().from(markets).where(inArray(markets.id, allMarketIds))
      : [];
  const marketMap = Object.fromEntries(marketRows.map((m) => [m.id, m]));

  // Compute pricing for each match
  const rows = matchRows.map((m) => {
    const km = marketMap[m.kalshiMarketId];
    const pm = marketMap[m.polymarketMarketId];
    const kalshiPrice = km
      ? m.kalshiSide === 'YES'
        ? (km.yesAsk ?? null)
        : (km.noAsk ?? null)
      : null;
    const polyPrice = pm
      ? m.polymarketSide === 'YES'
        ? (pm.yesAsk ?? null)
        : (pm.noAsk ?? null)
      : null;
    const totalCost =
      kalshiPrice !== null && polyPrice !== null ? kalshiPrice + polyPrice : null;
    const gap = totalCost !== null ? 1 - totalCost : null;
    return { ...m, kalshiPrice, polyPrice, totalCost, gap };
  });

  // Sort: gap desc (smallest totalCost = closest to arb, first)
  rows.sort((a, b) => {
    if (a.gap === null && b.gap === null) return 0;
    if (a.gap === null) return 1;
    if (b.gap === null) return -1;
    return b.gap - a.gap;
  });

  const scanTime = latestScan[0]?.startedAt
    ? new Date(latestScan[0].startedAt).toLocaleString()
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Market Matches</h1>
        <p className="text-sm text-muted-foreground">
          All matched pairs from latest scan
          {scanTime ? ` · ${scanTime}` : ''} · sorted by best spread
        </p>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="text-green-400">● Gap &gt; 0 — arbitrage (buy both sides for &lt; $1)</span>
        <span className="text-yellow-400">● Gap 0 to −5% — near miss</span>
        <span>● Gap &lt; −5% — no arb</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Kalshi market</th>
              <th className="px-3 py-2 text-left">Polymarket market</th>
              <th className="px-3 py-2 text-right">K side</th>
              <th className="px-3 py-2 text-right">K ask</th>
              <th className="px-3 py-2 text-right">P side</th>
              <th className="px-3 py-2 text-right">P ask</th>
              <th className="px-3 py-2 text-right">Total cost</th>
              <th className="px-3 py-2 text-right">Gap</th>
              <th className="px-3 py-2 text-center">Outcome</th>
              <th className="px-3 py-2 text-right">Match</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  No matches yet. Run a scan first.
                </td>
              </tr>
            ) : (
              rows.map((m) => {
                const { label, cls } = outcomeLabel(m.outcomeRelationship);
                return (
                  <tr
                    key={m.id}
                    className={`border-b border-border hover:bg-secondary/20 ${
                      m.gap !== null && m.gap > 0 ? 'bg-green-950/20' : ''
                    }`}
                  >
                    <td
                      className="max-w-[220px] truncate px-3 py-2"
                      title={m.kalshiMarketTitle}
                    >
                      {m.kalshiMarketTitle}
                    </td>
                    <td
                      className="max-w-[220px] truncate px-3 py-2"
                      title={m.polymarketMarketTitle}
                    >
                      {m.polymarketMarketTitle}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-mono">{m.kalshiSide}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {m.kalshiPrice !== null ? m.kalshiPrice.toFixed(3) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-mono">{m.polymarketSide}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {m.polyPrice !== null ? m.polyPrice.toFixed(3) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {m.totalCost !== null ? m.totalCost.toFixed(3) : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${gapColor(m.gap)}`}>
                      {m.gap !== null
                        ? `${m.gap > 0 ? '+' : ''}${(m.gap * 100).toFixed(2)}%`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded px-1.5 py-0.5 text-xs ${cls}`}>{label}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {formatPct(m.matchScore)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
