import { logger } from '@/lib/logger';
import { NormalizedMarket, KalshiMarket, PolymarketGammaMarket } from '@/types/market';

function centsToDecimal(cents: number | null | undefined): number | null {
  if (cents === null || cents === undefined || isNaN(cents)) return null;
  // Kalshi prices may be in cents (0-100) or already decimal
  if (cents > 1) return Math.min(1, Math.max(0, cents / 100));
  return Math.min(1, Math.max(0, cents));
}

function mapKalshiStatus(status: string): NormalizedMarket['status'] {
  const s = status?.toLowerCase() ?? '';
  if (s === 'open' || s === 'active') return 'open';
  if (s === 'closed') return 'closed';
  if (s === 'settled' || s === 'finalized') return 'resolved';
  if (s === 'paused' || s === 'suspended') return 'suspended';
  return 'unknown';
}

export function normalizeKalshiMarket(raw: KalshiMarket): NormalizedMarket | null {
  try {
    // Skip multi-variate event (parlay/bundle) markets — their titles are
    // concatenated leg strings like "yes KAT: 15+,yes Wembanyama: 20+,..."
    // which will never match anything on Polymarket.
    if (raw.mve_collection_ticker) return null;

    const now = new Date().toISOString();
    const marketId = raw.ticker;
    // Live API uses _dollars suffix; fallback to bare field names for older responses / mock data
    const yesBid = raw.yes_bid_dollars ?? raw.yes_bid;
    const yesAsk = raw.yes_ask_dollars ?? raw.yes_ask;
    const noBid  = raw.no_bid_dollars  ?? raw.no_bid;
    const noAsk  = raw.no_ask_dollars  ?? raw.no_ask;
    const lp     = raw.last_price_dollars ?? raw.last_price;
    return {
      id: `kalshi:${marketId}`,
      platform: 'kalshi',
      eventTitle: raw.subtitle || raw.category || '',
      marketTitle: raw.title || raw.yes_sub_title || marketId,
      description: [raw.rules_primary, raw.rules_secondary].filter(Boolean).join(' '),
      yesBid: centsToDecimal(yesBid),
      yesAsk: centsToDecimal(yesAsk),
      noBid: centsToDecimal(noBid),
      noAsk: centsToDecimal(noAsk),
      lastPrice: centsToDecimal(lp),
      volume: raw.volume ?? raw.volume_24h ?? null,
      liquidity: raw.liquidity ?? null,
      expiration: raw.expiration_time || raw.close_time || raw.expected_expiration_time || null,
      resolutionRules: raw.rules_primary ?? null,
      resolutionSource: raw.settlement_source_url ?? null,
      marketId,
      url: `https://kalshi.com/markets/${marketId}`,
      status: mapKalshiStatus(raw.status),
      orderbook: raw.orderbook ? { yes: { asks: [], bids: [] }, no: { asks: [], bids: [] } } : null,
      rawData: raw as unknown as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
    };
  } catch (err) {
    logger.error('Failed to normalize Kalshi market', { err, ticker: raw?.ticker });
    return null;
  }
}

export function normalizePolymarketMarket(raw: PolymarketGammaMarket): NormalizedMarket | null {
  try {
    const now = new Date().toISOString();
    const marketId = raw.conditionId || raw.id || raw.slug;

    let yesPrice: number | null = null;
    let noPrice: number | null = null;
    if (raw.outcomePrices) {
      try {
        const prices = JSON.parse(raw.outcomePrices) as number[];
        yesPrice = prices[0] ?? null;
        noPrice = prices[1] ?? null;
      } catch { /* ignore */ }
    }

    const yesAsk = raw.bestAsk ?? yesPrice;
    const yesBid = raw.bestBid ?? (yesPrice !== null ? yesPrice - (raw.spread ?? 0) / 2 : null);

    return {
      id: `polymarket:${marketId}`,
      platform: 'polymarket',
      eventTitle: raw.slug?.replace(/-/g, ' ') ?? '',
      marketTitle: raw.question ?? marketId,
      description: raw.description ?? '',
      yesBid: yesBid !== null ? Math.min(1, Math.max(0, yesBid)) : null,
      yesAsk: yesAsk !== null ? Math.min(1, Math.max(0, yesAsk)) : null,
      noBid: noPrice !== null ? Math.min(1, Math.max(0, noPrice - (raw.spread ?? 0) / 2)) : null,
      noAsk: noPrice !== null ? Math.min(1, Math.max(0, noPrice)) : null,
      lastPrice: raw.lastTradePrice ?? yesPrice,
      volume: raw.volume ?? raw.volumeNum ?? raw.volume24hr ?? null,
      liquidity: raw.liquidity ?? raw.liquidityNum ?? null,
      expiration: raw.endDate ?? null,
      resolutionRules: raw.description ?? null,
      resolutionSource: raw.resolutionSource ?? null,
      marketId,
      url: `https://polymarket.com/event/${raw.slug}`,
      status: raw.closed ? 'closed' : raw.active ? 'open' : 'unknown',
      orderbook: null,
      rawData: raw as unknown as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
    };
  } catch (err) {
    logger.error('Failed to normalize Polymarket market', { err, id: raw?.id });
    return null;
  }
}
