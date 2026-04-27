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
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [walletRes, ledgerRes, accountRes] = await Promise.allSettled([
        apiFetch('/wallet/me'),
        apiFetch('/wallet/ledger'),
        apiFetch('/wallet/bank-transfer-accounts'),
      ]);
      if (walletRes.status === 'fulfilled') setWallet(walletRes.value);
      if (ledgerRes.status === 'fulfilled') setLedger(Array.isArray(ledgerRes.value) ? ledgerRes.value : []);
      if (accountRes.status === 'fulfilled') setAccounts(Array.isArray(accountRes.value?.accounts) ? accountRes.value.accounts : []);
      if (walletRes.status === 'rejected' && ledgerRes.status === 'rejected' && accountRes.status === 'rejected') {
        setLoadError('Unable to load wallet data right now. Please refresh.');
      }
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
            <div className="flex items-center justify-between rounded-3xl border border-border bg-secondary p-5">
              <div>
                <div className="axis-label">Available balance</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">₦{formatMoney(wallet?.balance || 0)}</div>
                <div className="mt-2 text-sm text-muted-foreground">{loading ? 'Syncing wallet data...' : 'Wallet loaded from the existing API.'}</div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-50 text-primary">
                <Wallet2 className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                { label: 'Ledger entries', value: String(ledger.length) },
                { label: 'Transfer accounts', value: String(accounts.length) },
                { label: 'Status', value: wallet?.status || 'active' },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-border bg-secondary p-4">
                  <div className="axis-label">{item.label}</div>
                  <div className="mt-2 text-xl font-semibold text-foreground">{item.value}</div>
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
              <div className="rounded-3xl border border-border bg-secondary p-4">
                <div className="text-sm font-medium text-foreground">{primary.bank_name}</div>
                <div className="mt-3 text-2xl font-semibold tracking-[0.18em] text-foreground">{primary.account_number}</div>
                <div className="mt-2 text-sm text-muted-foreground">{primary.account_name || 'AxisVTU Wallet'}</div>
                <Button variant="secondary" className="mt-4 w-full" onClick={() => copy(primary.account_number)}>
                  <Copy className="h-4 w-4" />
                  Copy account number
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">Dedicated accounts will appear here once generated.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/35 dark:bg-rose-500/12 dark:text-rose-100">
          {loadError}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
          <CardDescription>Wallet movements in clean chronological order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ledger.length === 0 ? <div className="text-sm text-muted-foreground">No ledger records yet.</div> : null}
          {ledger.map((item) => (
            <div key={item.id || item.reference} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary p-4">
              <div>
                <div className="text-sm font-medium text-foreground">{item.description || item.reference || 'Wallet entry'}</div>
                <div className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</div>
              </div>
              <div className={`text-sm font-semibold ${String(item.entry_type || '').toLowerCase() === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {String(item.entry_type || '').toLowerCase() === 'credit' ? '+' : '-'}₦{formatMoney(item.amount || 0)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
