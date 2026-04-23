'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, RefreshCw, Wallet2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [walletRes, ledgerRes, accountRes] = await Promise.allSettled([
        apiFetch('/wallet/me'),
        apiFetch('/wallet/ledger'),
        apiFetch('/wallet/bank-transfer-accounts'),
      ]);
      if (walletRes.status === 'fulfilled') setWallet(walletRes.value);
      if (ledgerRes.status === 'fulfilled') setLedger(Array.isArray(ledgerRes.value) ? ledgerRes.value : []);
      if (accountRes.status === 'fulfilled') setAccounts(Array.isArray(accountRes.value?.accounts) ? accountRes.value.accounts : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const copy = async (value) => {
    await navigator.clipboard.writeText(String(value || ''));
  };

  const primary = accounts[0];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Wallet"
        title="Balance, transfer details, and ledger"
        description="A focused wallet workspace with the information the user needs to fund accounts and review movements."
        actions={(
          <Button variant="secondary" onClick={() => load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Wallet overview</CardTitle>
            <CardDescription>Live balance and operational state.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-5">
              <div>
                <div className="axis-label">Available balance</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-white">₦{formatMoney(wallet?.balance || 0)}</div>
                <div className="mt-2 text-sm text-slate-400">{loading ? 'Syncing wallet data...' : 'Wallet loaded from the existing API.'}</div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-500/15 text-brand-200">
                <Wallet2 className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                { label: 'Ledger entries', value: String(ledger.length) },
                { label: 'Transfer accounts', value: String(accounts.length) },
                { label: 'Status', value: wallet?.status || 'active' },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="axis-label">{item.label}</div>
                  <div className="mt-2 text-xl font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funding details</CardTitle>
            <CardDescription>Dedicated bank transfer account for top-ups.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {primary ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-medium text-white">{primary.bank_name}</div>
                <div className="mt-3 text-2xl font-semibold tracking-[0.18em] text-white">{primary.account_number}</div>
                <div className="mt-2 text-sm text-slate-400">{primary.account_name || 'AxisVTU Wallet'}</div>
                <Button variant="secondary" className="mt-4 w-full" onClick={() => copy(primary.account_number)}>
                  <Copy className="h-4 w-4" />
                  Copy account number
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">Dedicated accounts will appear here once generated.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
          <CardDescription>Wallet movements in clean chronological order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ledger.length === 0 ? <div className="text-sm text-slate-400">No ledger records yet.</div> : null}
          {ledger.map((item) => (
            <div key={item.id || item.reference} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/4 p-4">
              <div>
                <div className="text-sm font-medium text-white">{item.description || item.reference || 'Wallet entry'}</div>
                <div className="text-xs text-slate-500">{formatDateTime(item.created_at)}</div>
              </div>
              <div className={`text-sm font-semibold ${String(item.entry_type || '').toLowerCase() === 'credit' ? 'text-emerald-300' : 'text-rose-300'}`}>
                {String(item.entry_type || '').toLowerCase() === 'credit' ? '+' : '-'}₦{formatMoney(item.amount || 0)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
