import { AppSettings } from '@/lib/config';
import { NormalizedMarket } from '@/types/market';
import { ArbitrageCalculation } from '@/types/opportunity';
import { computeLiquiditySizing } from './sizing';

function getAsk(market: NormalizedMarket, side: 'YES' | 'NO'): number | null {
  return side === 'YES' ? market.yesAsk : market.noAsk;
}

export function calculateArbitrage(
  kalshi: NormalizedMarket,
  poly: NormalizedMarket,
  kalshiSide: 'YES' | 'NO',
  polymarketSide: 'YES' | 'NO',
  settings: AppSettings,
): ArbitrageCalculation | null {
  const kalshiPrice = getAsk(kalshi, kalshiSide);
  const polymarketPrice = getAsk(poly, polymarketSide);
  if (kalshiPrice === null || polymarketPrice === null) return null;

  const totalCost = kalshiPrice + polymarketPrice;
  const grossProfitPerPair = 1 - totalCost;
  const grossReturnPct = totalCost > 0 ? grossProfitPerPair / totalCost : 0;
  const grossArbitrage = grossProfitPerPair > 0;

  const kalshiFee = kalshiPrice * (settings.kalshiFeeBps / 10000);
  const polymarketFee = polymarketPrice * (settings.polymarketFeeBps / 10000);
  const slippage = totalCost * (settings.defaultSlippageBps / 10000);
  const conversion = totalCost * (settings.currencyConversionBps / 10000);
  const gasPerPair = settings.gasCostUsd / 100; // amortized across ~100 pairs
  const totalFees = kalshiFee + polymarketFee + slippage + conversion + gasPerPair;

  const adjustedCost = totalCost + totalFees;
  const adjustedProfitPerPair = 1 - adjustedCost;
  const adjustedReturnPct = adjustedCost > 0 ? adjustedProfitPerPair / adjustedCost : 0;
  const netProfitable = adjustedProfitPerPair > 0 && adjustedReturnPct >= settings.minAdjustedReturn;

  const sizing = computeLiquiditySizing(kalshi, poly, kalshiSide, polymarketSide, adjustedProfitPerPair);

  return {
    kalshiPrice,
    polymarketPrice,
    totalCost,
    grossProfitPerPair,
    grossReturnPct,
    grossArbitrage,
    kalshiFeeBps: settings.kalshiFeeBps,
    polymarketFeeBps: settings.polymarketFeeBps,
    kalshiFee,
    polymarketFee,
    gasCostUsd: settings.gasCostUsd,
    slippageBps: settings.defaultSlippageBps,
    totalFees,
    adjustedCost,
    adjustedProfitPerPair,
    adjustedReturnPct,
    netProfitable,
    ...sizing,
  };
}

export function calculateBetSizing(
  totalCapital: number,
  price1: number,
  price2: number,
  feeRate = 0,
): {
  pairs: number;
  stake1: number;
  stake2: number;
  grossProfit: number;
  grossReturnPct: number;
  adjustedProfit: number;
  adjustedReturnPct: number;
} {
  const costPerPair = price1 + price2;
  const pairs = totalCapital / costPerPair;
  const stake1 = pairs * price1;
  const stake2 = pairs * price2;
  const grossProfit = pairs - totalCapital;
  const grossReturnPct = grossProfit / totalCapital;
  const fees = totalCapital * feeRate;
  const adjustedProfit = grossProfit - fees;
  const adjustedReturnPct = adjustedProfit / (totalCapital + fees);

  return { pairs, stake1, stake2, grossProfit, grossReturnPct, adjustedProfit, adjustedReturnPct };
}
