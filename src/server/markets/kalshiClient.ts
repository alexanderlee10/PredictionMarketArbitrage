import { fetch } from 'undici';
import { createSign, constants } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { logger } from '@/lib/logger';
import { NormalizedMarket, KalshiMarket } from '@/types/market';
import { normalizeKalshiMarket } from './normalize';

export interface KalshiClientStatus {
  connected: boolean;
  lastSuccess: string | null;
  lastError: string | null;
  authConfigured: boolean;
  mockMode: boolean;
}

let status: KalshiClientStatus = {
  connected: false,
  lastSuccess: null,
  lastError: null,
  authConfigured: false,
  mockMode: true,
};

export function getKalshiStatus(): KalshiClientStatus {
  return { ...status };
}

let cachedPem: string | null = null;

function loadPrivateKey(): string | null {
  if (cachedPem !== null) return cachedPem;
  const keyPath = process.env.KALSHI_PRIVATE_KEY_PATH;
  if (!keyPath) return null;
  try {
    cachedPem = readFileSync(resolve(process.cwd(), keyPath), 'utf-8');
    return cachedPem;
  } catch (err) {
    logger.error('Kalshi: could not read private key file', { err, keyPath });
    return null;
  }
}

/**
 * RSA-PSS SHA-256 signing for Kalshi Trade API v2.
 * Message = timestampMs + METHOD + /path/only  (no query string).
 * Docs: https://docs.kalshi.com/getting_started/api_keys
 */
function buildAuthHeaders(method: string, urlPath: string): Record<string, string> {
  const keyId = process.env.KALSHI_API_KEY_ID;
  const pem = loadPrivateKey();
  if (!keyId || !pem) return {};
  try {
    const ts = Date.now().toString();
    const pathOnly = urlPath.includes('?') ? urlPath.slice(0, urlPath.indexOf('?')) : urlPath;
    const message = `${ts}${method.toUpperCase()}${pathOnly}`;
    const signer = createSign('SHA256');
    signer.update(message);
    signer.end();
    const signature = signer.sign(
      {
        key: pem,
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
      },
      'base64',
    );
    return {
      'KALSHI-ACCESS-KEY': keyId,
      'KALSHI-ACCESS-TIMESTAMP': ts,
      'KALSHI-ACCESS-SIGNATURE': signature,
    };
  } catch (err) {
    logger.error('Kalshi: request signing failed', { err });
    return {};
  }
}

export async function fetchKalshiMarkets(limit = 500): Promise<{
  markets: NormalizedMarket[];
  errors: string[];
}> {
  const baseUrl = process.env.KALSHI_BASE_URL ?? 'https://external-api.kalshi.com/trade-api/v2';
  status.authConfigured = Boolean(process.env.KALSHI_API_KEY_ID && process.env.KALSHI_PRIVATE_KEY_PATH);
  status.mockMode = false;

  const errors: string[] = [];
  const normalized: NormalizedMarket[] = [];
  const batchSize = Math.min(200, limit); // Kalshi max 1000, but 200 is safe default
  let cursor: string | undefined;

  try {
    do {
      const params = new URLSearchParams({ status: 'open', limit: String(batchSize) });
      if (cursor) params.set('cursor', cursor);
      const query = params.toString();

      // Path used for RSA-PSS signing (no query string, no host)
      const signingPath = '/trade-api/v2/markets';
      const fullUrl = `${baseUrl}/markets?${query}`;

      const res = await fetch(fullUrl, {
        headers: {
          Accept: 'application/json',
          ...buildAuthHeaders('GET', `${signingPath}?${query}`),
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const msg = `Kalshi ${res.status}: ${body.slice(0, 300) || res.statusText}`;
        errors.push(msg);
        status.lastError = msg;
        status.connected = false;
        break;
      }

      const data = (await res.json()) as { markets?: KalshiMarket[]; cursor?: string };
      const batch = data.markets ?? [];
      for (const raw of batch) {
        const m = normalizeKalshiMarket(raw);
        if (m) normalized.push(m);
      }

      cursor = data.cursor;
      if (batch.length === 0) break;
    } while (cursor && normalized.length < limit);

    status.connected = true;
    status.lastSuccess = new Date().toISOString();
    if (errors.length === 0) status.lastError = null;
    logger.info(`Fetched ${normalized.length} Kalshi markets`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Kalshi fetch failed: ${msg}`);
    status.lastError = msg;
    status.connected = false;
    logger.error('Kalshi fetch error', { err });
  }

  return { markets: normalized.slice(0, limit), errors };
}
