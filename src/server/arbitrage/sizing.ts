import { NormalizedMarket } from '@/types/market';

interface OrderBookSide {
  asks?: Array<{ price: number; size: number }>;
  bids?: Array<{ price: number; size: number }>;
}

function getDepthAtAsk(
  orderbook: unknown,
  side: 'YES' | 'NO',
): number | null {
  if (!orderbook || typeof orderbook !== 'object') return null;
  const ob = orderbook as Record<string, OrderBookSide>;
  const book = ob[side.toLowerCase()];
  if (!book?.asks?.length) return null;
  return book.asks.reduce((sum, level) => sum + level.size, 0);
}

function estimateFromLiquidity(liquidity: number | null, volume: number | null): number {
  const liq = liquidity ?? 0;
  const vol = volume ?? 0;
  return Math.max(0, Math.min(liq * 0.1, vol * 0.05));
}

export function computeLiquiditySizing(
  kalshi: NormalizedMarket,
  poly: NormalizedMarket,
  kalshiSide: 'YES' | 'NO',
  polymarketSide: 'YES' | 'NO',
  adjustedProfitPerPair: number,
): {
  maxSharesSide1: number;
  maxSharesSide2: number;
  maxMatchedPairs: number;
  maxCapitalDeployable: number;
  estimatedTotalProfit: number;
  liquiditySource: 'orderbook' | 'estimated';
} {
  const kDepth = getDepthAtAsk(kalshi.orderbook, kalshiSide);
  const pDepth = getDepthAtAsk(poly.orderbook, polymarketSide);

  let maxSharesSide1: number;
  let maxSharesSide2: number;
  let liquiditySource: 'orderbook' | 'estimated';

  if (kDepth !== null && pDepth !== null) {
    maxSharesSide1 = kDepth;
    maxSharesSide2 = pDepth;
    liquiditySource = 'orderbook';
  } else {
    maxSharesSide1 = kDepth ?? estimateFromLiquidity(kalshi.liquidity, kalshi.volume);
    maxSharesSide2 = pDepth ?? estimateFromLiquidity(poly.liquidity, poly.volume);
    liquiditySource = 'estimated';
  }

  const maxMatchedPairs = Math.min(maxSharesSide1, maxSharesSide2);
  const kPrice = kalshiSide === 'YES' ? (kalshi.yesAsk ?? 0) : (kalshi.noAsk ?? 0);
  const pPrice = polymarketSide === 'YES' ? (poly.yesAsk ?? 0) : (poly.noAsk ?? 0);
  const maxCapitalDeployable = maxMatchedPairs * (kPrice + pPrice);
  const estimatedTotalProfit = maxMatchedPairs * adjustedProfitPerPair;

  return {
    maxSharesSide1,
    maxSharesSide2,
    maxMatchedPairs,
    maxCapitalDeployable,
    estimatedTotalProfit,
    liquiditySource,
  };
}

export function liquidityScore(
  kalshi: NormalizedMarket,
  poly: NormalizedMarket,
  maxMatchedPairs: number,
  minLiquidity: number,
): number {
  const avgLiq = ((kalshi.liquidity ?? 0) + (poly.liquidity ?? 0)) / 2;
  const liqFactor = Math.min(1, avgLiq / (minLiquidity * 10));
  const sizeFactor = Math.min(1, maxMatchedPairs / 1000);
  return Math.min(1, liqFactor * 0.6 + sizeFactor * 0.4);
}
