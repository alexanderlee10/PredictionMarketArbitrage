'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function JournalForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    actionType: 'paper_trade',
    notes: '',
    kalshiStake: '',
    polymarketStake: '',
    kalshiPrice: '',
    polymarketPrice: '',
    result: 'pending',
    profitLoss: '',
    mistakes: '',
    opportunityId: '',
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        kalshiStake: form.kalshiStake ? parseFloat(form.kalshiStake) : null,
        polymarketStake: form.polymarketStake ? parseFloat(form.polymarketStake) : null,
        kalshiPrice: form.kalshiPrice ? parseFloat(form.kalshiPrice) : null,
        polymarketPrice: form.polymarketPrice ? parseFloat(form.polymarketPrice) : null,
        profitLoss: form.profitLoss ? parseFloat(form.profitLoss) : null,
        opportunityId: form.opportunityId || null,
      }),
    });
    setLoading(false);
    router.refresh();
    setForm({ ...form, notes: '', mistakes: '', profitLoss: '' });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold">Add Journal Entry</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs">
          Action Type
          <select
            className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            value={form.actionType}
            onChange={(e) => setForm({ ...form, actionType: e.target.value })}
          >
            <option value="paper_trade">Paper Trade</option>
            <option value="manual_review">Manual Review</option>
            <option value="ignore">Ignore</option>
            <option value="note">Note</option>
            <option value="executed_manually">Executed Manually</option>
          </select>
        </label>
        <label className="text-xs">
          Result
          <select
            className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            value={form.result}
            onChange={(e) => setForm({ ...form, result: e.target.value })}
          >
            <option value="pending">Pending</option>
            <option value="profit">Profit</option>
            <option value="loss">Loss</option>
            <option value="voided">Voided</option>
          </select>
        </label>
        <label className="text-xs">
          Kalshi Stake ($)
          <input type="number" step="0.01" className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm" value={form.kalshiStake} onChange={(e) => setForm({ ...form, kalshiStake: e.target.value })} />
        </label>
        <label className="text-xs">
          Polymarket Stake ($)
          <input type="number" step="0.01" className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm" value={form.polymarketStake} onChange={(e) => setForm({ ...form, polymarketStake: e.target.value })} />
        </label>
        <label className="col-span-2 text-xs">
          Notes
          <textarea className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <label className="col-span-2 text-xs">
          Mistakes / Lessons
          <textarea className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm" rows={2} value={form.mistakes} onChange={(e) => setForm({ ...form, mistakes: e.target.value })} />
        </label>
      </div>
      <button type="submit" disabled={loading} className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
        {loading ? 'Saving…' : 'Save Entry'}
      </button>
    </form>
  );
}
