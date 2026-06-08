'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Link2,
  History,
  Clock,
  BookOpen,
  Settings,
  Wifi,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';

const nav = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/opportunities', label: 'Live Opportunities', icon: TrendingUp },
  { href: '/matches', label: 'Market Matches', icon: Link2 },
  { href: '/scans', label: 'Scan History', icon: History },
  { href: '/history', label: 'Opportunity History', icon: Clock },
  { href: '/journal', label: 'Trade Journal', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/status', label: 'API Status', icon: Wifi },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [scanning, setScanning] = useState(false);

  async function runScan() {
    setScanning(true);
    try {
      await fetch('/api/scan', { method: 'POST' });
      window.location.reload();
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-card p-4 flex flex-col gap-1">
        <div className="mb-6 px-2">
          <h1 className="text-sm font-bold text-primary">Arb Scanner</h1>
          <p className="text-xs text-muted-foreground">Kalshi × Polymarket</p>
        </div>
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === href
                ? 'bg-primary/15 text-primary font-medium'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
        <button
          onClick={runScan}
          disabled={scanning}
          className="mt-auto flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', scanning && 'animate-spin')} />
          {scanning ? 'Scanning…' : 'Run Scan'}
        </button>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
