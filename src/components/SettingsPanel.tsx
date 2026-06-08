'use client';

import { useState } from 'react';
import type { AppSettings } from '@/lib/config';

export function SettingsPanel({ initial }: { initial: AppSettings }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    setSaving(true);
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) setMessage('Settings saved.');
    else setMessage('Failed to save settings.');
  }

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings({ ...settings, [key]: value });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm">
          <span className="text-muted-foreground">Mock Data Mode</span>
          <select
            className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
            value={settings.useMockData ? 'true' : 'false'}
            onChange={(e) => update('useMockData', e.target.value === 'true')}
          >
            <option value="true">Mock (no API keys)</option>
            <option value="false">Live APIs</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Min Match Confidence</span>
          <input type="number" step="0.05" min="0" max="1" className="mt-1 w-full rounded border border-input bg-background px-3 py-2" value={settings.minMatchConfidence} onChange={(e) => update('minMatchConfidence', parseFloat(e.target.value))} />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Min Adjusted Return</span>
          <input type="number" step="0.01" className="mt-1 w-full rounded border border-input bg-background px-3 py-2" value={settings.minAdjustedReturn} onChange={(e) => update('minAdjustedReturn', parseFloat(e.target.value))} />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Max Spread Allowed</span>
          <input type="number" step="0.01" className="mt-1 w-full rounded border border-input bg-background px-3 py-2" value={settings.maxSpreadAllowed} onChange={(e) => update('maxSpreadAllowed', parseFloat(e.target.value))} />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Min Liquidity ($)</span>
          <input type="number" className="mt-1 w-full rounded border border-input bg-background px-3 py-2" value={settings.minLiquidity} onChange={(e) => update('minLiquidity', parseFloat(e.target.value))} />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Slippage (bps)</span>
          <input type="number" className="mt-1 w-full rounded border border-input bg-background px-3 py-2" value={settings.defaultSlippageBps} onChange={(e) => update('defaultSlippageBps', parseFloat(e.target.value))} />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Kalshi Fee (bps)</span>
          <input type="number" className="mt-1 w-full rounded border border-input bg-background px-3 py-2" value={settings.kalshiFeeBps} onChange={(e) => update('kalshiFeeBps', parseFloat(e.target.value))} />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Polymarket Fee (bps)</span>
          <input type="number" className="mt-1 w-full rounded border border-input bg-background px-3 py-2" value={settings.polymarketFeeBps} onChange={(e) => update('polymarketFeeBps', parseFloat(e.target.value))} />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Gas Cost (USD)</span>
          <input type="number" step="0.01" className="mt-1 w-full rounded border border-input bg-background px-3 py-2" value={settings.gasCostUsd} onChange={(e) => update('gasCostUsd', parseFloat(e.target.value))} />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Refresh Interval (sec)</span>
          <input type="number" className="mt-1 w-full rounded border border-input bg-background px-3 py-2" value={settings.refreshIntervalSeconds} onChange={(e) => update('refreshIntervalSeconds', parseInt(e.target.value, 10))} />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Max Markets Per Scan</span>
          <input type="number" className="mt-1 w-full rounded border border-input bg-background px-3 py-2" value={settings.maxMarketsPerScan} onChange={(e) => update('maxMarketsPerScan', parseInt(e.target.value, 10))} />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Manual Review Threshold</span>
          <input type="number" step="0.05" min="0" max="1" className="mt-1 w-full rounded border border-input bg-background px-3 py-2" value={settings.manualReviewThreshold} onChange={(e) => update('manualReviewThreshold', parseFloat(e.target.value))} />
        </label>
      </div>
      <button onClick={save} disabled={saving} className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
