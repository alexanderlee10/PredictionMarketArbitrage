import { describe, it, expect } from 'vitest';
import { findMatches, scoreMarketPair } from '@/server/arbitrage/matcher';
import { mockKalshiMarkets, mockPolymarketMarkets } from '@/server/markets/mockData';

const config = {
  minMatchConfidence: 0.8,
  manualReviewThreshold: 0.85,
  useSemanticMatching: false,
};

describe('market matcher', () => {
  it('matches Team A championship markets', () => {
    const k = mockKalshiMarkets[0];
    const p = mockPolymarketMarkets[0];
    const result = scoreMarketPair(k, p, config);
    expect(result.matchScore).toBeGreaterThan(0.8);
    expect(result.outcomeRelationship).toBe('opposite_outcome');
  });

  it('does not match unrelated events', () => {
    const k = mockKalshiMarkets[3]; // Oscars
    const p = mockPolymarketMarkets[3]; // World Cup
    const result = scoreMarketPair(k, p, config);
    expect(result.matchScore).toBeLessThan(0.8);
  });

  it('finds multiple valid matches in mock data', () => {
    const { accepted } = findMatches(mockKalshiMarkets, mockPolymarketMarkets, config);
    expect(accepted.length).toBeGreaterThan(0);
    const teamA = accepted.find(
      (m) => m.kalshiMarketId === 'CHAMP-A-2024' && m.polymarketMarketId === '0xchamp-a-2024',
    );
    expect(teamA).toBeDefined();
  });

  it('flags low confidence matches for manual review', () => {
    const k = mockKalshiMarkets[7]; // ambiguous AI
    const p = mockPolymarketMarkets[7];
    const result = scoreMarketPair(k, p, config);
    expect(result.manualReviewRequired || result.outcomeRelationship === 'unclear').toBe(true);
  });
});
