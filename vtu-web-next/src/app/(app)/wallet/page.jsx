'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, RefreshCw, Wallet2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [activeIndex, setActiveIndex] = useState(0);

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
      if (accountRes.status === 'fulfilled') {
        const accs = Array.isArray(accountRes.value?.accounts) ? accountRes.value.accounts : [];
        setAccounts(accs);
        setActiveIndex(0);
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

  const activeAccount = accounts[activeIndex] || accounts[0];

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-40px)] bg-background px-4 py-5 text-foreground md:-mx-6 md:-my-5 md:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10">
      <div className="space-y-6 pb-28 md:pb-8">
      <PageHeader
        eyebrow="Wallet"
        title="Balance, transfer details, and ledger"
        description="A focused wallet workspace with the information the user needs to fund accounts and review movements."
        actions={(
          <Button variant="secondary" onClick={() => load()} className="border-white/10 bg-background/50 text-muted-foreground hover:bg-card hover:text-foreground backdrop-blur-sm">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        )}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="relative overflow-hidden border border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/20 rounded-full blur-[4rem] pointer-events-none" />
          <CardHeader className="relative z-10">
            <CardTitle>Wallet overview</CardTitle>
            <CardDescription>Live balance and operational state.</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center justify-between rounded-[2rem] border border-primary/20 bg-card/60 backdrop-blur-3xl p-6 sm:p-8 shadow-[0_24px_50px_rgba(234,115,69,0.06)] overflow-hidden">
              <div className="relative z-10">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Available balance</div>
                <div className="mt-2 text-4xl sm:text-5xl font-mono font-semibold tracking-tight text-foreground">₦{formatMoney(wallet?.balance || 0)}</div>
                <div className="mt-3 text-sm text-muted-foreground">{loading ? 'Syncing wallet data...' : 'Wallet synced and secure.'}</div>
              </div>
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-inner">
                <Wallet2 className="h-8 w-8" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { label: 'Ledger entries', value: String(ledger.length) },
                { label: 'Transfer accounts', value: String(accounts.length) },
                { label: 'Status', value: wallet?.status || 'active' },
              ].map((item) => (
                <div key={item.label} className="group relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-background/50 p-5 transition-all hover:bg-background/80 hover:shadow-md">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">{item.label}</div>
                  <div className="mt-2 text-2xl font-bold text-foreground/90">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl">
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-primary/10 rounded-full blur-[4rem] pointer-events-none" />
          <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Funding details</CardTitle>
              <CardDescription>Dedicated top-up accounts.</CardDescription>
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
          <CardContent className="relative z-10 space-y-4">
            {activeAccount ? (
              <div className="rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 transition-all duration-300 hover:scale-[1.01] shadow-[0_12px_28px_rgba(234,115,69,0.12)] dark:shadow-[0_16px_36px_rgba(234,115,69,0.18)]">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-extrabold tracking-widest text-primary uppercase">{activeAccount.bank_name}</div>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                    Active
                  </span>
                </div>
                <div className="mt-4 text-3xl font-bold tracking-[0.16em] text-foreground font-mono">{activeAccount.account_number}</div>
                <div className="mt-4 text-[11px] font-black text-foreground/80 uppercase tracking-widest">ACCOUNT NAME: {String(activeAccount.account_name || 'MELE DATA Wallet').toUpperCase()}</div>
                <Button variant="secondary" className="mt-6 w-full rounded-2xl h-12 bg-background/50 hover:bg-background border-white/10" onClick={() => copy(activeAccount.account_number)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Account Number
                </Button>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-border/50 bg-secondary/30 p-6 text-sm text-muted-foreground text-center backdrop-blur-sm">
                Dedicated accounts will appear here once generated.
              </div>
            )}
            <div className="mt-4 p-5 border border-primary/10 rounded-[1.5rem] bg-primary/5 text-[11px] text-foreground/80 leading-relaxed flex gap-3 items-start backdrop-blur-sm">
              <span className="text-base select-none mt-0.5">🔒</span>
              <span>
                <strong>Privacy Guarantee:</strong> MELE DATA does <strong>NOT</strong> store or keep your BVN or NIN. This identity verification is securely routed directly to our central CBN-licensed payment partner (Monnify) to automatically generate your personalized funding accounts.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="relative overflow-hidden border border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">Ledger</CardTitle>
          <CardDescription>Wallet movements in clean chronological order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ledger.length === 0 ? <div className="text-sm text-muted-foreground">No ledger records yet.</div> : null}
          {ledger.map((item) => (
            <div key={item.id || item.reference} className="group relative overflow-hidden flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-background/50 p-4 transition-all hover:bg-background/80 hover:shadow-md">
              <div className="relative z-10">
                <div className="text-sm font-bold text-foreground/90">{item.description || item.reference || 'Wallet entry'}</div>
                <div className="text-[11px] text-muted-foreground/70 mt-1">{formatDateTime(item.created_at)}</div>
              </div>
              <div className={`relative z-10 text-[15px] font-extrabold tracking-tight ${String(item.entry_type || '').toLowerCase() === 'credit' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {String(item.entry_type || '').toLowerCase() === 'credit' ? '+' : '-'}₦{formatMoney(item.amount || 0)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
