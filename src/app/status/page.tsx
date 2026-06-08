import { initDb, getDb } from '@/lib/db';
import { apiErrors } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { getSettings } from '@/lib/settings';
import { getKalshiStatus } from '@/server/markets/kalshiClient';
import { getPolymarketStatus } from '@/server/markets/polymarketClient';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? 'bg-profit' : 'bg-loss'}`} />
  );
}

export default async function StatusPage() {
  await initDb();
  const db = getDb();
  const settings = await getSettings();
  const kalshi = getKalshiStatus();
  const polymarket = getPolymarketStatus();
  const errors = await db.select().from(apiErrors).orderBy(desc(apiErrors.createdAt)).limit(10);

  if (settings.useMockData) {
    kalshi.mockMode = true;
    polymarket.mockMode = true;
    kalshi.connected = true;
    polymarket.connected = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Connection Status</h1>
        <p className="text-sm text-muted-foreground">Platform connectivity and configuration</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <StatusDot ok={kalshi.connected || settings.useMockData} />
            <h2 className="font-semibold">Kalshi</h2>
          </div>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Mode</dt><dd>{settings.useMockData ? 'Mock' : 'Live'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Auth Configured</dt><dd>{kalshi.authConfigured ? 'Yes' : 'No'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Last Success</dt><dd>{formatDate(kalshi.lastSuccess)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Last Error</dt><dd className="text-loss text-xs">{kalshi.lastError ?? '—'}</dd></div>
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <StatusDot ok={polymarket.connected || settings.useMockData} />
            <h2 className="font-semibold">Polymarket</h2>
          </div>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Mode</dt><dd>{settings.useMockData ? 'Mock' : 'Live'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Auth Configured</dt><dd>{polymarket.authConfigured ? 'Yes' : 'No'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Last Success</dt><dd>{formatDate(polymarket.lastSuccess)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Last Error</dt><dd className="text-loss text-xs">{polymarket.lastError ?? '—'}</dd></div>
          </dl>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">Recent API Errors</h2>
          <ul className="space-y-2 text-xs">
            {errors.map((e) => (
              <li key={e.id} className="text-muted-foreground">
                [{e.platform}] {e.endpoint}: {e.errorMessage}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        API keys are never displayed. Configure via environment variables — see .env.example.
      </p>
    </div>
  );
}
