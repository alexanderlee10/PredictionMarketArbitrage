'use client';

import { formatPct, formatUsd, formatDate } from '@/lib/utils';
import { RiskBadgeList } from './RiskBadge';
import type { OpportunityRow } from './OpportunityTable';
import { X } from 'lucide-react';

export function OpportunityDetail({
  opportunity: o,
  onClose,
}: {
  opportunity: OpportunityRow;
  onClose: () => void;
}) {
  const kalshi = o.kalshiSnapshot as Record<string, unknown>;
  const poly = o.polymarketSnapshot as Record<string, unknown>;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold">Opportunity Detail</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <section className="mb-4 space-y-2">
          <h3 className="text-sm font-semibold text-primary">Markets</h3>
          <div className="rounded border border-border p-3 text-sm">
            <p className="font-medium">Kalshi: {o.kalshiMarketTitle}</p>
            <p className="text-xs text-muted-foreground">Buy {o.kalshiSide} @ {o.kalshiPrice.toFixed(3)}</p>
            {typeof kalshi.url === 'string' && (
              <a href={kalshi.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                Open Kalshi →
              </a>
            )}
          </div>
          <div className="rounded border border-border p-3 text-sm">
            <p className="font-medium">Polymarket: {o.polymarketMarketTitle}</p>
            <p className="text-xs text-muted-foreground">Buy {o.polymarketSide} @ {o.polymarketPrice.toFixed(3)}</p>
            {typeof poly.url === 'string' && (
              <a href={poly.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                Open Polymarket →
              </a>
            )}
          </div>
        </section>

        <section className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">Arbitrage Math</h3>
          <div className="space-y-1 rounded border border-border p-3 font-mono text-xs">
            <p>total_cost = {o.kalshiPrice.toFixed(3)} + {o.polymarketPrice.toFixed(3)} = {o.totalCost.toFixed(3)}</p>
            <p>gross_profit = 1 - {o.totalCost.toFixed(3)} = {o.grossProfitPerPair.toFixed(3)}</p>
            <p>gross_return = {formatPct(o.grossReturnPct)}</p>
            <p className="mt-2 text-muted-foreground">fees = {formatUsd(o.totalFees)}</p>
            <p>adjusted_profit = {o.adjustedProfitPerPair.toFixed(3)}</p>
            <p>adjusted_return = {formatPct(o.adjustedReturnPct)}</p>
          </div>
        </section>

        <section className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">Liquidity Sizing</h3>
          <div className="rounded border border-border p-3 text-xs space-y-1">
            <p>Max matched pairs: {o.maxMatchedPairs.toFixed(0)}</p>
            <p>Est. total profit at max size: {formatUsd(o.estimatedTotalProfit)}</p>
            <p>Match confidence: {(o.matchConfidence * 100).toFixed(1)}%</p>
            <p>Liquidity score: {o.liquidityScore.toFixed(2)}</p>
            <p>Risk score: {o.riskScore.toFixed(2)}</p>
          </div>
        </section>

        <section className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">Risk Flags</h3>
          <RiskBadgeList flags={o.riskFlags} />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-primary">Metadata</h3>
          <p className="text-xs text-muted-foreground">Detected: {formatDate(o.lastSeenAt)}</p>
          <p className="text-xs text-muted-foreground">Expires: {formatDate(o.expirationDate)}</p>
        </section>
      </div>
    </div>
  );
}
