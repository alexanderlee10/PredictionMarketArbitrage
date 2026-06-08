import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = await updateSettings(body);
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid settings';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
