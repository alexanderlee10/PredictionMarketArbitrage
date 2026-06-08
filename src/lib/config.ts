import { z } from 'zod';

export const AppSettingsSchema = z.object({
  useMockData: z.boolean().default(true),
  minMatchConfidence: z.number().min(0).max(1).default(0.8),
  minAdjustedReturn: z.number().default(0),
  maxSpreadAllowed: z.number().min(0).max(1).default(0.1),
  minLiquidity: z.number().min(0).default(100),
  defaultSlippageBps: z.number().min(0).default(25),
  kalshiFeeBps: z.number().min(0).default(0),
  polymarketFeeBps: z.number().min(0).default(200),
  gasCostUsd: z.number().min(0).default(0.5),
  currencyConversionBps: z.number().min(0).default(0),
  refreshIntervalSeconds: z.number().min(10).default(60),
  useSemanticMatching: z.boolean().default(false),
  maxMarketsPerScan: z.number().min(1).default(500),
  staleDataSeconds: z.number().min(0).default(120),
  manualReviewThreshold: z.number().min(0).max(1).default(0.85),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

export function loadSettingsFromEnv(): AppSettings {
  return AppSettingsSchema.parse({
    useMockData: process.env.USE_MOCK_DATA !== 'false',
    minMatchConfidence: parseFloat(process.env.MIN_MATCH_CONFIDENCE ?? '0.80'),
    minAdjustedReturn: parseFloat(process.env.MIN_ADJUSTED_RETURN ?? '0'),
    maxSpreadAllowed: parseFloat(process.env.MAX_SPREAD_ALLOWED ?? '0.10'),
    minLiquidity: parseFloat(process.env.MIN_LIQUIDITY ?? '100'),
    defaultSlippageBps: parseFloat(process.env.DEFAULT_SLIPPAGE_BPS ?? '25'),
    kalshiFeeBps: parseFloat(process.env.KALSHI_FEE_BPS ?? '0'),
    polymarketFeeBps: parseFloat(process.env.POLYMARKET_FEE_BPS ?? '200'),
    gasCostUsd: parseFloat(process.env.GAS_COST_USD ?? '0.50'),
    currencyConversionBps: parseFloat(process.env.CURRENCY_CONVERSION_BPS ?? '0'),
    refreshIntervalSeconds: parseInt(process.env.REFRESH_INTERVAL_SECONDS ?? '60', 10),
    useSemanticMatching: process.env.USE_SEMANTIC_MATCHING === 'true',
    maxMarketsPerScan: parseInt(process.env.MAX_MARKETS_PER_SCAN ?? '500', 10),
    staleDataSeconds: parseInt(process.env.STALE_DATA_SECONDS ?? '120', 10),
    manualReviewThreshold: parseFloat(process.env.MANUAL_REVIEW_THRESHOLD ?? '0.85'),
  });
}

export const DEFAULT_SETTINGS: AppSettings = loadSettingsFromEnv();

export const SETTING_KEYS = Object.keys(AppSettingsSchema.shape) as (keyof AppSettings)[];
