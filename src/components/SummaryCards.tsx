import { cn, formatPct, formatUsd, formatDate } from '@/lib/utils';

interface CardProps {
  label: string;
  value: string | number;
  sub?: string;
  variant?: 'default' | 'profit' | 'warning';
}

function Card({ label, value, sub, variant = 'default' }: CardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-bold',
          variant === 'profit' && 'text-profit',
          variant === 'warning' && 'text-warning',
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

interface OverviewData {
  totalKalshiMarkets: number;
  totalPolymarketMarkets: number;
  totalMatches: number;
  grossOpportunities: number;
  netProfitableOpportunities: number;
  bestAdjustedReturn: number | null;
  bestOpportunityProfit: number;
  bestOpportunityMaxPairs: number;
  bestOpportunityMaxCapital: number;
  lastScanTime: string | null;
  apiStatus: string;
  needsManualReview: number;
}

export function SummaryCards({ data }: { data: OverviewData }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
      <Card label="Kalshi Markets" value={data.totalKalshiMarkets} />
      <Card label="Polymarket Markets" value={data.totalPolymarketMarkets} />
      <Card label="Matched Pairs" value={data.totalMatches} />
      <Card label="Gross Arbitrage" value={data.grossOpportunities} variant="profit" />
      <Card label="Net Profitable" value={data.netProfitableOpportunities} variant="profit" />
      <Card
        label="Best Adjusted Return"
        value={data.bestAdjustedReturn !== null ? formatPct(data.bestAdjustedReturn) : '—'}
        variant="profit"
      />
      <Card
        label="Best Opp. Profit (max size)"
        value={formatUsd(data.bestOpportunityProfit)}
        sub={
          data.bestOpportunityMaxPairs > 0
            ? `${Math.round(data.bestOpportunityMaxPairs).toLocaleString()} pairs · ${formatUsd(data.bestOpportunityMaxCapital)} capital`
            : 'No net-profitable opportunity'
        }
        variant="profit"
      />
      <Card label="Last Scan" value={formatDate(data.lastScanTime)} />
      <Card
        label="API Status"
        value={data.apiStatus}
        variant={data.apiStatus === 'mock' ? 'warning' : 'default'}
      />
      <Card
        label="Needs Review"
        value={data.needsManualReview}
        variant={data.needsManualReview > 0 ? 'warning' : 'default'}
      />
    </div>
  );
}
