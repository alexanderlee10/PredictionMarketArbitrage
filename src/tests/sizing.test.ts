import { describe, it, expect } from 'vitest';
import { computeLiquiditySizing, liquidityScore } from '@/server/arbitrage/sizing';
import { mockKalshiMarkets, mockPolymarketMarkets } from '@/server/markets/mockData';
import { DEFAULT_SETTINGS } from '@/lib/config';

describe('liquidity sizing', () => {
  it('uses orderbook depth when available', () => {
    const sizing = computeLiquiditySizing(
      mockKalshiMarkets[0],
      mockPolymarketMarkets[0],
      'YES',
      'NO',
      0.03,
    );
    expect(sizing.liquiditySource).toBe('orderbook');
    expect(sizing.maxMatchedPairs).toBeGreaterThan(0);
    expect(sizing.estimatedTotalProfit).toBeGreaterThan(0);
  });

  it('estimates conservatively without orderbook', () => {
    const sizing = computeLiquiditySizing(
      mockKalshiMarkets[1],
      mockPolymarketMarkets[1],
      'YES',
      'NO',
      0.01,
    );
    expect(sizing.liquiditySource).toBe('estimated');
  });

  it('scores low liquidity markets lower', () => {
    const high = liquidityScore(mockKalshiMarkets[0], mockPolymarketMarkets[0], 5000, DEFAULT_SETTINGS.minLiquidity);
    const low = liquidityScore(mockKalshiMarkets[6], mockPolymarketMarkets[6], 50, DEFAULT_SETTINGS.minLiquidity);
    expect(high).toBeGreaterThan(low);
  });
});
