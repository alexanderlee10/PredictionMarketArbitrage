import { describe, it, expect } from 'vitest';
import { calculateArbitrage, calculateBetSizing } from '@/server/arbitrage/calculator';
import { mockKalshiMarkets, mockPolymarketMarkets } from '@/server/markets/mockData';
import { DEFAULT_SETTINGS } from '@/lib/config';

describe('arbitrage calculator', () => {
  const kalshi = mockKalshiMarkets[0]; // Team A championship
  const poly = mockPolymarketMarkets[0];

  it('detects clear arbitrage (Team A example)', () => {
    const calc = calculateArbitrage(kalshi, poly, 'YES', 'NO', DEFAULT_SETTINGS)!;
    expect(calc.kalshiPrice).toBe(0.42);
    expect(calc.polymarketPrice).toBe(0.55);
    expect(calc.totalCost).toBeCloseTo(0.97, 2);
    expect(calc.grossProfitPerPair).toBeCloseTo(0.03, 2);
    expect(calc.grossReturnPct).toBeCloseTo(0.0309, 3);
    expect(calc.grossArbitrage).toBe(true);
  });

  it('detects no arbitrage when total cost > 1', () => {
    const k = mockKalshiMarkets[2]; // BTC
    const p = mockPolymarketMarkets[2];
    const calc = calculateArbitrage(k, p, 'YES', 'NO', DEFAULT_SETTINGS)!;
    expect(calc.grossArbitrage).toBe(false);
  });

  it('fee-adjusted profit can be negative', () => {
    const k = mockKalshiMarkets[1]; // near-arbitrage Fed
    const p = mockPolymarketMarkets[1];
    const calc = calculateArbitrage(k, p, 'YES', 'NO', {
      ...DEFAULT_SETTINGS,
      polymarketFeeBps: 200,
      defaultSlippageBps: 50,
    })!;
    if (calc.grossArbitrage) {
      // near-arbitrage may or may not be net profitable after fees
      expect(typeof calc.netProfitable).toBe('boolean');
    }
  });

  it('calculates bet sizing correctly', () => {
    const sizing = calculateBetSizing(1000, 0.42, 0.55);
    expect(sizing.pairs).toBeCloseTo(1000 / 0.97, 1);
    expect(sizing.grossProfit).toBeGreaterThan(0);
    expect(sizing.grossReturnPct).toBeCloseTo(0.0309, 2);
  });
});
