'use client';

import { useState, useMemo } from 'react';
import { formatPct, formatUsd } from '@/lib/utils';
import { RiskBadgeList } from './RiskBadge';
import { OpportunityDetail } from './OpportunityDetail';

export interface OpportunityRow {
  id: string;
  kalshiMarketTitle: string;
  polymarketMarketTitle: string;
  kalshiSide: string;
  polymarketSide: string;
  kalshiPrice: number;
  polymarketPrice: number;
  totalCost: number;
  grossProfitPerPair: number;
  grossReturnPct: number;
  totalFees: number;
  adjustedProfitPerPair: number;
  adjustedReturnPct: number;
  netProfitable: boolean;
  maxMatchedPairs: number;
  estimatedTotalProfit: number;
  opportunityScore: number;
  matchConfidence: number;
  liquidityScore: number;
  riskScore: number;
  riskFlags: string[];
  expirationDate: string | null;
  lastSeenAt: string;
  kalshiSnapshot: Record<string, unknown>;
  polymarketSnapshot: Record<string, unknown>;
}

interface Filters {
  minAdjustedReturn: number;
  minGrossReturn: number;
  minMatchConfidence: number;
  minLiquidity: number;
  hideUnclear: boolean;
  hideManualReview: boolean;
  hideLowLiquidity: boolean;
  netProfitableOnly: boolean;
}

const defaultFilters: Filters = {
  minAdjustedReturn: 0,
  minGrossReturn: 0,
  minMatchConfidence: 0,
  minLiquidity: 0,
  hideUnclear: false,
  hideManualReview: false,
  hideLowLiquidity: false,
  netProfitableOnly: false,
};

export function OpportunityTable({ opportunities }: { opportunities: OpportunityRow[] }) {
  const [selected, setSelected] = useState<OpportunityRow | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortBy, setSortBy] = useState<'score' | 'adjusted' | 'profit' | 'confidence'>('score');

  const filtered = useMemo(() => {
    let rows = opportunities.filter((o) => {
      if (filters.minAdjustedReturn && o.adjustedReturnPct < filters.minAdjustedReturn) return false;
      if (filters.minGrossReturn && o.grossReturnPct < filters.minGrossReturn) return false;
      if (filters.minMatchConfidence && o.matchConfidence < filters.minMatchConfidence) return false;
      if (filters.minLiquidity && o.liquidityScore < filters.minLiquidity) return false;
      if (filters.hideManualReview && o.riskFlags.includes('manual_review_required')) return false;
      if (filters.hideLowLiquidity && o.riskFlags.includes('low_liquidity')) return false;
      if (filters.netProfitableOnly && !o.netProfitable) return false;
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sortBy === 'adjusted') return b.adjustedReturnPct - a.adjustedReturnPct;
      if (sortBy === 'profit') return b.estimatedTotalProfit - a.estimatedTotalProfit;
      if (sortBy === 'confidence') return b.matchConfidence - a.matchConfidence;
      return b.opportunityScore - a.opportunityScore;
    });

    return rows;
  }, [opportunities, filters, sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <label className="text-xs text-muted-foreground">
          Min adj return
          <input
            type="number"
            step="0.01"
            className="ml-1 w-16 rounded border border-input bg-background px-2 py-1 text-xs"
            value={filters.minAdjustedReturn}
            onChange={(e) => setFilters({ ...filters, minAdjustedReturn: parseFloat(e.target.value) || 0 })}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Min confidence
          <input
            type="number"
            step="0.05"
            className="ml-1 w-16 rounded border border-input bg-background px-2 py-1 text-xs"
            value={filters.minMatchConfidence}
            onChange={(e) => setFilters({ ...filters, minMatchConfidence: parseFloat(e.target.value) || 0 })}
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={filters.netProfitableOnly}
            onChange={(e) => setFilters({ ...filters, netProfitableOnly: e.target.checked })}
          />
          Net profitable only
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={filters.hideManualReview}
            onChange={(e) => setFilters({ ...filters, hideManualReview: e.target.checked })}
          />
          Hide manual review
        </label>
        <select
          className="rounded border border-input bg-background px-2 py-1 text-xs"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        >
          <option value="score">Sort: Score</option>
          <option value="adjusted">Sort: Adjusted Return</option>
          <option value="profit">Sort: Est. Profit</option>
          <option value="confidence">Sort: Confidence</option>
        </select>
        <a
          href="/api/opportunities?format=csv"
          className="ml-auto rounded bg-secondary px-3 py-1 text-xs hover:bg-accent"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Score</th>
              <th className="px-3 py-2 text-left">Kalshi Market</th>
              <th className="px-3 py-2 text-left">Polymarket Market</th>
              <th className="px-3 py-2 text-left">Sides</th>
              <th className="px-3 py-2 text-right">Prices</th>
              <th className="px-3 py-2 text-right">Gross Ret</th>
              <th className="px-3 py-2 text-right">Adj Ret</th>
              <th className="px-3 py-2 text-right">Est Profit</th>
              <th className="px-3 py-2 text-left">Risk</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  No opportunities. Click &quot;Run Scan&quot; to start.
                </td>
              </tr>
            ) : (
              filtered.map((o, i) => (
                <tr
                  key={o.id}
                  className="cursor-pointer border-b border-border hover:bg-secondary/30"
                  onClick={() => setSelected(o)}
                >
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{o.opportunityScore.toFixed(3)}</td>
                  <td className="max-w-[180px] truncate px-3 py-2" title={o.kalshiMarketTitle}>
                    {o.kalshiMarketTitle}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2" title={o.polymarketMarketTitle}>
                    {o.polymarketMarketTitle}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    K:{o.kalshiSide} / P:{o.polymarketSide}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    {o.kalshiPrice.toFixed(2)} + {o.polymarketPrice.toFixed(2)} = {o.totalCost.toFixed(2)}
                  </td>
                  <td className={`px-3 py-2 text-right ${o.grossReturnPct > 0 ? 'text-profit' : ''}`}>
                    {formatPct(o.grossReturnPct)}
                  </td>
                  <td className={`px-3 py-2 text-right font-medium ${o.netProfitable ? 'text-profit' : 'text-loss'}`}>
                    {formatPct(o.adjustedReturnPct)}
                  </td>
                  <td className="px-3 py-2 text-right">{formatUsd(o.estimatedTotalProfit)}</td>
                  <td className="px-3 py-2">
                    <RiskBadgeList flags={o.riskFlags.slice(0, 2)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && <OpportunityDetail opportunity={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
