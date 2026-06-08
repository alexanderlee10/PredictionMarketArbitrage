import { NextResponse } from 'next/server';
import { runScan } from '@/server/scanner';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await runScan();
    return NextResponse.json({
      success: true,
      scanId: result.scanId,
      opportunityCount: result.opportunities.length,
      netProfitableCount: result.opportunities.filter((o) => o.calculation.netProfitable).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
