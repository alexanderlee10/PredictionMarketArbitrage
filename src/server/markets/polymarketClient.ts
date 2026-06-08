import { fetch } from 'undici';
import { logger } from '@/lib/logger';
import { NormalizedMarket, PolymarketGammaMarket } from '@/types/market';
import { normalizePolymarketMarket } from './normalize';

export interface PolymarketClientStatus {
  connected: boolean;
  lastSuccess: string | null;
  lastError: string | null;
  authConfigured: boolean;
  mockMode: boolean;
}

let status: PolymarketClientStatus = {
  connected: false,
  lastSuccess: null,
  lastError: null,
  authConfigured: false,
  mockMode: true,
};

export function getPolymarketStatus(): PolymarketClientStatus {
  return { ...status };
}

/**
 * Polymarket Gamma API (market metadata) — fully public, no auth required.
 * Docs: https://docs.polymarket.com
 *
 * CLOB authenticated endpoints (order placement) require EIP-712 wallet signing.
 * POLYMARKET_API_KEY / POLYMARKET_WALLET_ADDRESS are stored for future CLOB use.
 */
export async function fetchPolymarketMarkets(limit = 500): Promise<{
  markets: NormalizedMarket[];
  errors: string[];
}> {
  const gammaUrl = process.env.POLYMARKET_GAMMA_URL ?? 'https://gamma-api.polymarket.com';
  status.authConfigured = Boolean(
    process.env.POLYMARKET_API_KEY || process.env.POLYMARKET_WALLET_ADDRESS,
  );
  status.mockMode = false;

  const errors: string[] = [];
  const normalized: NormalizedMarket[] = [];
  const batchSize = 100; // Gamma API max per page
  let offset = 0;

  try {
    do {
      const params = new URLSearchParams({
        active: 'true',
        closed: 'false',
        limit: String(batchSize),
        offset: String(offset),
      });
      const url = `${gammaUrl}/markets?${params.toString()}`;

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const msg = `Polymarket ${res.status}: ${body.slice(0, 300) || res.statusText}`;
        errors.push(msg);
        status.lastError = msg;
        status.connected = false;
        break;
      }

      const data = (await res.json()) as PolymarketGammaMarket[];
      const batch = Array.isArray(data) ? data : [];
      for (const raw of batch) {
        const m = normalizePolymarketMarket(raw);
        if (m) normalized.push(m);
      }

      offset += batch.length;
      if (batch.length < batchSize) break; // last page
    } while (normalized.length < limit);

    status.connected = true;
    status.lastSuccess = new Date().toISOString();
    if (errors.length === 0) status.lastError = null;
    logger.info(`Fetched ${normalized.length} Polymarket markets`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Polymarket fetch failed: ${msg}`);
    status.lastError = msg;
    status.connected = false;
    logger.error('Polymarket fetch error', { err });
  }

  return { markets: normalized.slice(0, limit), errors };
}
