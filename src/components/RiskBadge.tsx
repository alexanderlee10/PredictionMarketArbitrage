import { cn } from '@/lib/utils';

const FLAG_LABELS: Record<string, string> = {
  different_expiration: 'Diff Expiration',
  different_settlement_rules: 'Diff Settlement',
  low_match_confidence: 'Low Confidence',
  low_liquidity: 'Low Liquidity',
  wide_spread: 'Wide Spread',
  stale_data: 'Stale Data',
  market_suspended: 'Suspended',
  market_closed: 'Closed',
  fees_exceed_edge: 'Fees > Edge',
  slippage_exceeds_edge: 'Slippage > Edge',
  ambiguous_wording: 'Ambiguous',
  different_resolution_source: 'Diff Source',
  missing_orderbook: 'No Orderbook',
  manual_review_required: 'Review Required',
  partial_data: 'Partial Data',
  possible_false_match: 'Possible False Match',
  near_expiration: 'Near Expiry',
  low_volume: 'Low Volume',
};

const SEVERITY: Record<string, 'high' | 'medium' | 'low'> = {
  manual_review_required: 'high',
  ambiguous_wording: 'high',
  possible_false_match: 'high',
  fees_exceed_edge: 'high',
  slippage_exceeds_edge: 'high',
  different_settlement_rules: 'high',
  low_match_confidence: 'medium',
  low_liquidity: 'medium',
  wide_spread: 'medium',
  different_expiration: 'medium',
  missing_orderbook: 'low',
  partial_data: 'low',
  low_volume: 'low',
  near_expiration: 'low',
};

export function RiskBadge({ flag }: { flag: string }) {
  const severity = SEVERITY[flag] ?? 'low';
  return (
    <span
      className={cn(
        'inline-block rounded px-1.5 py-0.5 text-xs font-medium',
        severity === 'high' && 'bg-loss-muted text-loss',
        severity === 'medium' && 'bg-warning-muted text-warning',
        severity === 'low' && 'bg-secondary text-muted-foreground',
      )}
    >
      {FLAG_LABELS[flag] ?? flag}
    </span>
  );
}

export function RiskBadgeList({ flags }: { flags: string[] }) {
  if (!flags.length) return <span className="text-xs text-muted-foreground">None</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <RiskBadge key={f} flag={f} />
      ))}
    </div>
  );
}
