import { z } from 'zod';

export type Platform = 'kalshi' | 'polymarket';

export type MarketStatus = 'open' | 'closed' | 'resolved' | 'suspended' | 'unknown';

export const NormalizedMarketSchema = z.object({
  id: z.string(),
  platform: z.enum(['kalshi', 'polymarket']),
  eventTitle: z.string(),
  marketTitle: z.string(),
  description: z.string(),
  yesBid: z.number().min(0).max(1).nullable(),
  yesAsk: z.number().min(0).max(1).nullable(),
  noBid: z.number().min(0).max(1).nullable(),
  noAsk: z.number().min(0).max(1).nullable(),
  lastPrice: z.number().min(0).max(1).nullable(),
  volume: z.number().min(0).nullable(),
  liquidity: z.number().min(0).nullable(),
  expiration: z.string().nullable(),  // ISO date string
  resolutionRules: z.string().nullable(),
  resolutionSource: z.string().nullable(),
  marketId: z.string(),
  url: z.string().nullable(),
  status: z.enum(['open', 'closed', 'resolved', 'suspended', 'unknown']),
  orderbook: z.record(z.unknown()).nullable(),
  rawData: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type NormalizedMarket = z.infer<typeof NormalizedMarketSchema>;

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  yes: { bids: OrderBookLevel[]; asks: OrderBookLevel[] };
  no: { bids: OrderBookLevel[]; asks: OrderBookLevel[] };
}

// Kalshi raw API types (based on official docs)
export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  market_type: string;
  title: string;
  subtitle: string;
  yes_sub_title: string;
  no_sub_title: string;
  open_time: string;
  close_time: string;
  expected_expiration_time: string;
  expiration_time: string;
  latest_expiration_time: string;
  settlement_timer_seconds: number;
  status: string;
  response_price_units: string;
  notional_value: number;
  tick_size: number;
  // Live API v2 uses _dollars suffix (confirmed via docs.kalshi.com/api-reference/market/get-markets)
  yes_bid_dollars: number;
  yes_ask_dollars: number;
  no_bid_dollars: number;
  no_ask_dollars: number;
  last_price_dollars: number;
  // Legacy / fallback field names (some endpoints may still use these)
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  last_price?: number;
  previous_yes_bid: number;
  previous_yes_ask: number;
  previous_price: number;
  volume: number;
  volume_24h: number;
  liquidity: number;
  open_interest: number;
  result: string;
  can_close_early: boolean;
  expiration_value: string;
  category: string;
  // Set on multi-variate event (parlay/bundle) markets — skip these
  mve_collection_ticker?: string;
  risk_limit_cents: number;
  strike_type: string;
  floor_strike: number;
  cap_strike: number;
  rules_primary: string;
  rules_secondary: string;
  settlement_source_url: string;
  // order book fields if available
  orderbook?: {
    yes: Array<[number, number]>;  // [price, size]
    no: Array<[number, number]>;
  };
}

// Polymarket Gamma API types
export interface PolymarketGammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  resolutionSource: string;
  endDate: string;
  liquidity: number;
  startDate: string;
  image: string;
  icon: string;
  description: string;
  outcomes: string;         // JSON-encoded string like '["Yes","No"]'
  outcomePrices: string;    // JSON-encoded string like '[0.42, 0.58]'
  volume: number;
  active: boolean;
  closed: boolean;
  marketMakerAddress: string;
  createdAt: string;
  updatedAt: string;
  tokens: PolymarketToken[];
  tags: Array<{ id: string; label: string; slug: string }>;
  // CLOB order book (fetched separately)
  clobTokenIds?: string[];
  enableOrderBook?: boolean;
  bestBid?: number;
  bestAsk?: number;
  lastTradePrice?: number;
  spread?: number;
  oneDayPriceChange?: number;
  volume24hr?: number;
  volumeNum?: number;
  liquidityNum?: number;
  orderPriceMinTickSize?: number;
}

export interface PolymarketToken {
  token_id: string;
  outcome: string;
  price: number;
  winner: boolean;
}

// Polymarket CLOB order book types
export interface PolymarketOrderBook {
  market: string;
  asset_id: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  hash: string;
  timestamp: string;
}
