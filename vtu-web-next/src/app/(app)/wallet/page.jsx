'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy, RefreshCw, Wallet2, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch, readScopedCache, writeScopedCache } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

export default function WalletPage() {
  const searchParams = useSearchParams();
  const pageQuery = String(searchParams.get('q') || '').trim().toLowerCase();
  const [wallet, setWallet] = useState(() => readScopedCache('wallet_me', { maxAgeMs: 5 * 60 * 1000 }));
  const [ledger, setLedger] = useState(() => readScopedCache('wallet_ledger', { maxAgeMs: 5 * 60 * 1000 }) || []);
  const [accounts, setAccounts] = useState(() => readScopedCache('wallet_accounts', { maxAgeMs: 5 * 60 * 1000 }) || []);
  const [loading, setLoading] = useState(() => !(readScopedCache('wallet_me', { maxAgeMs: 5 * 60 * 1000 }) || (readScopedCache('wallet_ledger', { maxAgeMs: 5 * 60 * 1000 }) || []).length));
  const [loadError, setLoadError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setLoadError('');
    try {
      const [walletRes, ledgerRes, accountRes] = await Promise.allSettled([
        apiFetch('/wallet/me'),
        apiFetch('/wallet/ledger'),
        apiFetch('/wallet/bank-transfer-accounts'),
      ]);
      if (walletRes.status === 'fulfilled') {
        setWallet(walletRes.value);
        writeScopedCache('wallet_me', walletRes.value);
      }
      if (ledgerRes.status === 'fulfilled') {
        const rows = Array.isArray(ledgerRes.value) ? ledgerRes.value : [];
        setLedger(rows);
        writeScopedCache('wallet_ledger', rows);
      }
      if (accountRes.status === 'fulfilled') {
        const rows = Array.isArray(accountRes.value?.accounts) ? accountRes.value.accounts : [];
        setAccounts(rows);
        writeScopedCache('wallet_accounts', rows);
        setActiveIndex(0);
      }
      if (walletRes.status === 'rejected' && ledgerRes.status === 'rejected' && accountRes.status === 'rejected') {
        setLoadError('Unable to load wallet data right now. Please refresh.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(!!wallet || ledger.length > 0 || accounts.length > 0).catch(() => {});
  }, [load]);

  const copy = async (value) => {
    await navigator.clipboard.writeText(String(value || ''));
  };

  const activeAccount = accounts[activeIndex] || accounts[0];
  const filteredLedger = useMemo(() => {
    if (!pageQuery) return ledger;
    return ledger.filter((item) => {
      const haystack = [
        item?.description,
        item?.reference,
        item?.entry_type,
        item?.created_at,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(pageQuery);
    });
  }, [ledger, pageQuery]);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Account Credit"
        title="Balance, top-up details, and credit history"
        description="A focused workspace with the information you need to add credit and review movements."
        actions={(
          <Button variant="secondary" onClick={() => load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Credit overview</CardTitle>
            <CardDescription>Live balance and operational state.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-3xl border border-border bg-secondary p-5">
              <div>
                <div className="axis-label">Available credit</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">₦{formatMoney(wallet?.balance || 0)}</div>
                <div className="mt-2 text-sm text-muted-foreground">{loading ? 'Syncing credit data...' : 'Account loaded successfully.'}</div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-50 text-primary">
                <Wallet2 className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                { label: 'Credit entries', value: String(ledger.length) },
                { label: 'Top-up details', value: String(accounts.length) },
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Top-up details</CardTitle>
              <CardDescription>Dedicated details for adding credit.</CardDescription>
            </div>
            {accounts.length > 1 && (
              <div className="flex items-center gap-1.5 rounded-full border border-border bg-background p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-semibold px-1 select-none">
                  {activeIndex + 1}/{accounts.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  disabled={activeIndex === accounts.length - 1}
                  onClick={() => setActiveIndex((prev) => Math.min(accounts.length - 1, prev + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {activeAccount ? (
              <div className="rounded-3xl border border-border bg-secondary p-4 transition-all duration-300 hover:scale-[1.01]">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold tracking-wide text-foreground uppercase">{activeAccount.bank_name}</div>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Active
                  </span>
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-[0.15em] text-foreground font-mono">{activeAccount.account_number}</div>
                <div className="mt-2 text-sm text-muted-foreground">{activeAccount.account_name || 'AxisVTU Account'}</div>
                <Button variant="secondary" className="mt-4 w-full rounded-2xl" onClick={() => copy(activeAccount.account_number)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Account Number
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground text-center">
                Top-up details will appear here once generated.
              </div>
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
          <CardTitle>Credit History</CardTitle>
          <CardDescription>Credit movements in clean chronological order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredLedger.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {pageQuery ? 'No credit records matched your search.' : 'No history yet.'}
            </div>
          ) : null}
          {filteredLedger.map((item) => (
            <div key={item.id || item.reference} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary p-4">
              <div>
                <div className="text-sm font-medium text-foreground">{item.description || item.reference || 'Credit entry'}</div>
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
