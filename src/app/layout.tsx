import type { Metadata } from 'next';
import './globals.css';
import { DashboardLayout } from '@/components/DashboardLayout';

export const metadata: Metadata = {
  title: 'Prediction Market Arbitrage Scanner',
  description: 'Kalshi vs Polymarket arbitrage detection dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}
