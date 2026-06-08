import { NormalizedMarket } from '@/types/market';

const now = new Date().toISOString();
const future30d = new Date(Date.now() + 30 * 86400_000).toISOString();
const future90d = new Date(Date.now() + 90 * 86400_000).toISOString();
const future7d = new Date(Date.now() + 7 * 86400_000).toISOString();
const future180d = new Date(Date.now() + 180 * 86400_000).toISOString();
const future45d = new Date(Date.now() + 45 * 86400_000).toISOString();
const future60d = new Date(Date.now() + 60 * 86400_000).toISOString();
const future14d = new Date(Date.now() + 14 * 86400_000).toISOString();
// Intentionally mismatched: Polymarket expires later for edge-case testing
const future120d = new Date(Date.now() + 120 * 86400_000).toISOString();

// ============================================================
// KALSHI MOCK MARKETS (8 markets)
// ============================================================
export const mockKalshiMarkets: NormalizedMarket[] = [
  // 1. CLEAR ARBITRAGE OPPORTUNITY (from spec)
  {
    id: 'kalshi:CHAMP-A-2024',
    platform: 'kalshi',
    eventTitle: 'Sports Championships 2024',
    marketTitle: 'Will Team A win the championship?',
    description:
      'This market resolves YES if Team A wins the 2024 championship. Resolves NO otherwise. Resolution source: official league website.',
    yesBid: 0.40,
    yesAsk: 0.42,
    noBid: 0.58,
    noAsk: 0.60,
    lastPrice: 0.41,
    volume: 125000,
    liquidity: 45000,
    expiration: future30d,
    resolutionRules:
      'Resolves YES if Team A is declared championship winner by the official league. Resolves NO otherwise.',
    resolutionSource: 'official-league.com',
    marketId: 'CHAMP-A-2024',
    url: 'https://kalshi.com/markets/CHAMP-A-2024',
    status: 'open',
    orderbook: {
      yes: { asks: [{ price: 0.42, size: 5000 }, { price: 0.43, size: 3000 }], bids: [{ price: 0.40, size: 4000 }] },
      no:  { asks: [{ price: 0.60, size: 4000 }, { price: 0.61, size: 2500 }], bids: [{ price: 0.58, size: 3500 }] },
    },
    rawData: { source: 'mock', ticker: 'CHAMP-A-2024' },
    createdAt: now,
    updatedAt: now,
  },

  // 2. NEAR-ARBITRAGE (very thin edge before fees)
  {
    id: 'kalshi:FED-RATE-JAN',
    platform: 'kalshi',
    eventTitle: 'Federal Reserve January 2025',
    marketTitle: 'Will the Fed raise rates in January 2025?',
    description:
      'Resolves YES if the Federal Reserve raises the federal funds rate at the January 2025 FOMC meeting.',
    yesBid: 0.10,
    yesAsk: 0.12,
    noBid: 0.86,
    noAsk: 0.89,
    lastPrice: 0.11,
    volume: 320000,
    liquidity: 98000,
    expiration: future45d,
    resolutionRules:
      'Resolves YES if the FOMC votes to increase the federal funds rate target range at the January 2025 meeting.',
    resolutionSource: 'federalreserve.gov',
    marketId: 'FED-RATE-JAN',
    url: 'https://kalshi.com/markets/FED-RATE-JAN',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', ticker: 'FED-RATE-JAN' },
    createdAt: now,
    updatedAt: now,
  },

  // 3. NO ARBITRAGE (total_cost > 1)
  {
    id: 'kalshi:BTC-100K-2024',
    platform: 'kalshi',
    eventTitle: 'Bitcoin Price 2024',
    marketTitle: 'Will Bitcoin reach $100,000 by end of 2024?',
    description:
      'Resolves YES if Bitcoin price (USD) closes above $100,000 on any major exchange before December 31, 2024.',
    yesBid: 0.62,
    yesAsk: 0.65,
    noBid: 0.33,
    noAsk: 0.36,
    lastPrice: 0.63,
    volume: 890000,
    liquidity: 250000,
    expiration: future60d,
    resolutionRules:
      'Resolves YES if the BTC/USD price on Coinbase exceeds $100,000 at any point before market close date.',
    resolutionSource: 'coinbase.com',
    marketId: 'BTC-100K-2024',
    url: 'https://kalshi.com/markets/BTC-100K-2024',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', ticker: 'BTC-100K-2024' },
    createdAt: now,
    updatedAt: now,
  },

  // 4. MISMATCHED EVENT (different topic entirely — should NOT match)
  {
    id: 'kalshi:OSCAR-BEST-PIC',
    platform: 'kalshi',
    eventTitle: 'Academy Awards 2025',
    marketTitle: 'Will Oppenheimer 2 win Best Picture at the 2025 Oscars?',
    description:
      'Resolves YES if the Academy of Motion Picture Arts and Sciences awards Oppenheimer 2 the Best Picture Oscar at the 2025 ceremony.',
    yesBid: 0.18,
    yesAsk: 0.21,
    noBid: 0.77,
    noAsk: 0.80,
    lastPrice: 0.19,
    volume: 55000,
    liquidity: 18000,
    expiration: future90d,
    resolutionRules: 'Resolves YES if Oppenheimer 2 wins Best Picture.',
    resolutionSource: 'oscars.org',
    marketId: 'OSCAR-BEST-PIC',
    url: 'https://kalshi.com/markets/OSCAR-BEST-PIC',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', ticker: 'OSCAR-BEST-PIC' },
    createdAt: now,
    updatedAt: now,
  },

  // 5. DIFFERENT EXPIRATION (same event, different close dates — risk flag)
  {
    id: 'kalshi:ELECTION-2024-PRES',
    platform: 'kalshi',
    eventTitle: 'US Presidential Election 2024',
    marketTitle: 'Will the Democratic candidate win the 2024 US Presidential Election?',
    description:
      'Resolves YES if the Democratic Party candidate wins the 2024 US Presidential Election as certified by Congress.',
    yesBid: 0.44,
    yesAsk: 0.47,
    noBid: 0.51,
    noAsk: 0.54,
    lastPrice: 0.46,
    volume: 5200000,
    liquidity: 1800000,
    expiration: future7d,   // Expires soon
    resolutionRules:
      'Resolves YES if the Democratic nominee is declared winner of the 2024 presidential election.',
    resolutionSource: 'ap.org',
    marketId: 'ELECTION-2024-PRES',
    url: 'https://kalshi.com/markets/ELECTION-2024-PRES',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', ticker: 'ELECTION-2024-PRES' },
    createdAt: now,
    updatedAt: now,
  },

  // 6. DIFFERENT SETTLEMENT RULE (same event, different resolution criteria)
  {
    id: 'kalshi:CPI-DEC-2024',
    platform: 'kalshi',
    eventTitle: 'US CPI December 2024',
    marketTitle: 'Will US CPI exceed 3.5% year-over-year in December 2024?',
    description:
      'Resolves YES if the Bureau of Labor Statistics reports CPI year-over-year increase above 3.5% for December 2024.',
    yesBid: 0.28,
    yesAsk: 0.31,
    noBid: 0.67,
    noAsk: 0.70,
    lastPrice: 0.29,
    volume: 175000,
    liquidity: 55000,
    expiration: future14d,
    resolutionRules:
      'Resolves YES if BLS reports CPI (all items) year-over-year change > 3.5% for December 2024. Uses the first release, not revisions.',
    resolutionSource: 'bls.gov',
    marketId: 'CPI-DEC-2024',
    url: 'https://kalshi.com/markets/CPI-DEC-2024',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', ticker: 'CPI-DEC-2024' },
    createdAt: now,
    updatedAt: now,
  },

  // 7. LOW LIQUIDITY MARKET
  {
    id: 'kalshi:NICHE-SPORT-EVENT',
    platform: 'kalshi',
    eventTitle: 'Regional Sports League 2024',
    marketTitle: 'Will City FC win the Regional League Title in 2024?',
    description:
      'Resolves YES if City FC wins the Regional Sports League championship in the 2024 season.',
    yesBid: 0.30,
    yesAsk: 0.38,
    noBid: 0.58,
    noAsk: 0.65,
    lastPrice: 0.34,
    volume: 1200,
    liquidity: 800,
    expiration: future60d,
    resolutionRules:
      'Resolves YES if City FC is declared champion of the Regional League for 2024.',
    resolutionSource: 'regionalleague.com',
    marketId: 'NICHE-SPORT-EVENT',
    url: 'https://kalshi.com/markets/NICHE-SPORT-EVENT',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', ticker: 'NICHE-SPORT-EVENT' },
    createdAt: now,
    updatedAt: now,
  },

  // 8. AMBIGUOUS WORDING
  {
    id: 'kalshi:AI-BREAKTHROUGH',
    platform: 'kalshi',
    eventTitle: 'AI Technology Milestones 2025',
    marketTitle: 'Will there be a major AI breakthrough in 2025?',
    description:
      'Resolves YES if a significant advancement in artificial intelligence is announced or demonstrated in 2025. Resolution criteria subject to admin discretion based on market consensus.',
    yesBid: 0.60,
    yesAsk: 0.65,
    noBid: 0.32,
    noAsk: 0.37,
    lastPrice: 0.62,
    volume: 42000,
    liquidity: 14000,
    expiration: future180d,
    resolutionRules:
      'Resolves YES if admin determines a "major AI breakthrough" occurred, defined as a milestone that significantly advances the state of the art and receives broad scientific recognition.',
    resolutionSource: 'admin-discretion',
    marketId: 'AI-BREAKTHROUGH',
    url: 'https://kalshi.com/markets/AI-BREAKTHROUGH',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', ticker: 'AI-BREAKTHROUGH' },
    createdAt: now,
    updatedAt: now,
  },
];

// ============================================================
// POLYMARKET MOCK MARKETS (8 markets)
// ============================================================
export const mockPolymarketMarkets: NormalizedMarket[] = [
  // 1. MATCHES Kalshi #1 — creates clear arbitrage (opposite sides)
  {
    id: 'polymarket:0xchamp-a-2024',
    platform: 'polymarket',
    eventTitle: 'Sports Championships 2024',
    marketTitle: 'Team A to win championship?',
    description:
      'This market resolves to YES if Team A wins the 2024 championship title. Resolution based on official league announcement.',
    yesBid: 0.44,
    yesAsk: 0.46,
    noBid: 0.52,
    noAsk: 0.55,
    lastPrice: 0.45,
    volume: 98000,
    liquidity: 35000,
    expiration: future30d,
    resolutionRules:
      'Resolves YES if Team A wins the championship. Resolves NO if any other team wins or if the championship is cancelled.',
    resolutionSource: 'official-league.com',
    marketId: '0xchamp-a-2024',
    url: 'https://polymarket.com/event/team-a-championship',
    status: 'open',
    orderbook: {
      yes: { asks: [{ price: 0.46, size: 4200 }, { price: 0.47, size: 2800 }], bids: [{ price: 0.44, size: 3800 }] },
      no:  { asks: [{ price: 0.55, size: 3500 }, { price: 0.56, size: 2000 }], bids: [{ price: 0.52, size: 3200 }] },
    },
    rawData: { source: 'mock', conditionId: '0xchamp-a-2024' },
    createdAt: now,
    updatedAt: now,
  },

  // 2. MATCHES Kalshi #2 — near-arbitrage (slim margin)
  {
    id: 'polymarket:0xfed-rate-jan-2025',
    platform: 'polymarket',
    eventTitle: 'Federal Reserve Decision January 2025',
    marketTitle: 'Federal Reserve rate hike in January 2025?',
    description:
      'Will the Federal Reserve increase interest rates at the January 2025 FOMC meeting?',
    yesBid: 0.09,
    yesAsk: 0.11,
    noBid: 0.88,
    noAsk: 0.90,
    lastPrice: 0.10,
    volume: 220000,
    liquidity: 72000,
    expiration: future45d,
    resolutionRules:
      'Resolves YES if the Fed raises rates at the January 2025 FOMC meeting. Uses Fed.gov announcement.',
    resolutionSource: 'federalreserve.gov',
    marketId: '0xfed-rate-jan-2025',
    url: 'https://polymarket.com/event/fed-rate-hike-jan-2025',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', conditionId: '0xfed-rate-jan-2025' },
    createdAt: now,
    updatedAt: now,
  },

  // 3. MATCHES Kalshi #3 — no arbitrage (total_cost > 1)
  {
    id: 'polymarket:0xbtc-100k-2024',
    platform: 'polymarket',
    eventTitle: 'Bitcoin $100K 2024',
    marketTitle: 'Will Bitcoin hit $100,000 in 2024?',
    description:
      'Resolves YES if the price of Bitcoin in USD exceeds $100,000 on any major exchange before December 31, 2024.',
    yesBid: 0.61,
    yesAsk: 0.64,
    noBid: 0.34,
    noAsk: 0.38,
    lastPrice: 0.62,
    volume: 750000,
    liquidity: 190000,
    expiration: future60d,
    resolutionRules:
      'Resolves YES if BTC/USD exceeds $100,000 on Binance, Coinbase, or Kraken before the end of 2024.',
    resolutionSource: 'coingecko.com',
    marketId: '0xbtc-100k-2024',
    url: 'https://polymarket.com/event/bitcoin-100k-2024',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', conditionId: '0xbtc-100k-2024' },
    createdAt: now,
    updatedAt: now,
  },

  // 4. DOES NOT MATCH Kalshi #4 (Oscar market — completely different)
  {
    id: 'polymarket:0xworld-cup-2026',
    platform: 'polymarket',
    eventTitle: 'FIFA World Cup 2026',
    marketTitle: 'Will Brazil win the 2026 FIFA World Cup?',
    description:
      'Resolves YES if Brazil wins the 2026 FIFA World Cup held in North America.',
    yesBid: 0.18,
    yesAsk: 0.21,
    noBid: 0.77,
    noAsk: 0.80,
    lastPrice: 0.19,
    volume: 280000,
    liquidity: 85000,
    expiration: future180d,
    resolutionRules: 'Resolves YES if Brazil lifts the 2026 FIFA World Cup trophy.',
    resolutionSource: 'fifa.com',
    marketId: '0xworld-cup-2026',
    url: 'https://polymarket.com/event/brazil-world-cup-2026',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', conditionId: '0xworld-cup-2026' },
    createdAt: now,
    updatedAt: now,
  },

  // 5. MATCHES Kalshi #5 — DIFFERENT EXPIRATION (risk flag)
  {
    id: 'polymarket:0xus-election-2024',
    platform: 'polymarket',
    eventTitle: 'US Presidential Election 2024',
    marketTitle: 'Democratic candidate wins 2024 US Presidential Election?',
    description:
      'This market resolves YES if the Democratic Party candidate wins the 2024 US Presidential Election.',
    yesBid: 0.44,
    yesAsk: 0.47,
    noBid: 0.51,
    noAsk: 0.54,
    lastPrice: 0.46,
    volume: 4800000,
    liquidity: 1500000,
    expiration: future120d,  // Intentionally mismatched vs Kalshi future7d
    resolutionRules:
      'Resolves based on certified election results. Uses AP/Reuters projection as primary resolution source.',
    resolutionSource: 'reuters.com',   // Different from Kalshi (ap.org)
    marketId: '0xus-election-2024',
    url: 'https://polymarket.com/event/us-presidential-election-2024',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', conditionId: '0xus-election-2024' },
    createdAt: now,
    updatedAt: now,
  },

  // 6. MATCHES Kalshi #6 — DIFFERENT SETTLEMENT RULE
  {
    id: 'polymarket:0xcpi-dec-2024',
    platform: 'polymarket',
    eventTitle: 'US Inflation December 2024',
    marketTitle: 'US CPI above 3.5% YoY in December 2024?',
    description:
      'Resolves YES if US Consumer Price Index year-over-year change for December 2024 is above 3.5%.',
    yesBid: 0.27,
    yesAsk: 0.30,
    noBid: 0.68,
    noAsk: 0.71,
    lastPrice: 0.28,
    volume: 145000,
    liquidity: 42000,
    expiration: future14d,
    // Different rule: uses REVISED data, not first release
    resolutionRules:
      'Resolves YES if the final revised BLS CPI figure for December 2024 exceeds 3.5% year-over-year.',
    resolutionSource: 'bls.gov',
    marketId: '0xcpi-dec-2024',
    url: 'https://polymarket.com/event/us-cpi-december-2024',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', conditionId: '0xcpi-dec-2024' },
    createdAt: now,
    updatedAt: now,
  },

  // 7. MATCHES Kalshi #7 — LOW LIQUIDITY
  {
    id: 'polymarket:0xcityfc-regional-2024',
    platform: 'polymarket',
    eventTitle: 'Regional Football League 2024',
    marketTitle: 'City FC wins Regional League 2024?',
    description:
      'Resolves YES if City FC wins the Regional Football League Championship in 2024.',
    yesBid: 0.28,
    yesAsk: 0.36,
    noBid: 0.60,
    noAsk: 0.67,
    lastPrice: 0.32,
    volume: 900,
    liquidity: 500,
    expiration: future60d,
    resolutionRules:
      'Resolves YES if City FC is the regional league champion at end of 2024 season.',
    resolutionSource: 'regionalleague.com',
    marketId: '0xcityfc-regional-2024',
    url: 'https://polymarket.com/event/city-fc-regional-2024',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', conditionId: '0xcityfc-regional-2024' },
    createdAt: now,
    updatedAt: now,
  },

  // 8. MATCHES Kalshi #8 — AMBIGUOUS WORDING
  {
    id: 'polymarket:0xai-major-milestone-2025',
    platform: 'polymarket',
    eventTitle: 'AI Milestones 2025',
    marketTitle: 'Will AI achieve a major breakthrough in 2025?',
    description:
      'Resolves YES if artificial intelligence achieves a significant breakthrough or milestone in 2025, as determined by market resolution committee.',
    yesBid: 0.58,
    yesAsk: 0.63,
    noBid: 0.34,
    noAsk: 0.39,
    lastPrice: 0.60,
    volume: 38000,
    liquidity: 12000,
    expiration: future180d,
    // Ambiguous: "committee decides" vs Kalshi "admin discretion"
    resolutionRules:
      'Resolved by a committee of AI experts who determine if a "major" breakthrough occurred. Subject to interpretation.',
    resolutionSource: 'resolution-committee',
    marketId: '0xai-major-milestone-2025',
    url: 'https://polymarket.com/event/ai-breakthrough-2025',
    status: 'open',
    orderbook: null,
    rawData: { source: 'mock', conditionId: '0xai-major-milestone-2025' },
    createdAt: now,
    updatedAt: now,
  },
];

export function getMockMarkets(): { kalshi: NormalizedMarket[]; polymarket: NormalizedMarket[] } {
  return { kalshi: mockKalshiMarkets, polymarket: mockPolymarketMarkets };
}
