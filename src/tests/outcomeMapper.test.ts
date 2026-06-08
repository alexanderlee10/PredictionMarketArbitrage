import { describe, it, expect } from 'vitest';
import { mapOutcomes } from '@/server/arbitrage/outcomeMapper';
import { mockKalshiMarkets, mockPolymarketMarkets } from '@/server/markets/mockData';

describe('outcome mapper', () => {
  it('maps opposite outcomes for championship markets', () => {
    const result = mapOutcomes(mockKalshiMarkets[0], mockPolymarketMarkets[0]);
    expect(result.relationship).toBe('opposite_outcome');
    expect(result.kalshiSide).toBe('YES');
    expect(result.polymarketSide).toBe('NO');
  });

  it('marks ambiguous wording as unclear', () => {
    const result = mapOutcomes(mockKalshiMarkets[7], mockPolymarketMarkets[7]);
    expect(result.relationship).toBe('unclear');
  });

  it('returns not_comparable when prices missing', () => {
    const k = { ...mockKalshiMarkets[0], yesAsk: null, noAsk: null };
    const result = mapOutcomes(k, mockPolymarketMarkets[0]);
    expect(result.relationship).toBe('not_comparable');
  });
});
