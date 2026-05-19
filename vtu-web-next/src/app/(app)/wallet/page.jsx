'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy, RefreshCw, Wallet2, ChevronLeft, ChevronRight, Sparkles, Landmark } from 'lucide-react';
import { apiFetch, getProfile, readScopedCache, writeScopedCache } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';

export default function WalletPage() {
  const searchParams = useSearchParams();
  const profile = getProfile();
  const pageQuery = String(searchParams.get('q') || '').trim().toLowerCase();
  const [wallet, setWallet] = useState(() => readScopedCache('wallet_me', { maxAgeMs: 30 * 24 * 60 * 60 * 1000 }));
  const [ledger, setLedger] = useState(() => readScopedCache('wallet_ledger', { maxAgeMs: 30 * 24 * 60 * 60 * 1000 }) || []);
  const [accounts, setAccounts] = useState(() => readScopedCache('wallet_accounts', { maxAgeMs: 30 * 24 * 60 * 60 * 1000 }) || []);
  const [loading, setLoading] = useState(() => !(readScopedCache('wallet_me', { maxAgeMs: 30 * 24 * 60 * 60 * 1000 }) || (readScopedCache('wallet_ledger', { maxAgeMs: 30 * 24 * 60 * 60 * 1000 }) || []).length));
  const [loadError, setLoadError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activationOption, setActivationOption] = useState('bvn');
  const [kycModalOpen, setKycModalOpen] = useState(false);

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

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    if (!bvn.trim() && !nin.trim()) {
      alert('Please enter your BVN or NIN.');
      return;
    }
    setVerifying(true);
    try {
      const res = await apiFetch('/wallet/bank-transfer-accounts', {
        method: 'POST',
        body: JSON.stringify({
          bvn: bvn.trim() || null,
          nin: nin.trim() || null,
        }),
      });
      if (Array.isArray(res?.accounts)) {
        setAccounts(res.accounts);
        writeScopedCache('wallet_accounts', res.accounts);
        setActiveIndex(0);
        setBvn('');
        setNin('');
        setKycModalOpen(false);
        alert('Dedicated accounts generated successfully!');
        await load(true);
      }
    } catch (err) {
      alert(err.message || 'Unable to generate Monnify accounts.');
    } finally {
      setVerifying(false);
    }
  };

  const accountsList = useMemo(() => {
    const list = Array.isArray(accounts) ? [...accounts] : [];
    list.sort((a, b) => {
      const aName = String(a.bank_name || '').toLowerCase();
      const bName = String(b.bank_name || '').toLowerCase();
      if (aName.includes('moniepoint') && !bName.includes('moniepoint')) return -1;
      if (!aName.includes('moniepoint') && bName.includes('moniepoint')) return 1;
      return 0;
    });
    return list;
  }, [accounts]);

  const activeAccount = accountsList[activeIndex] || accountsList[0];

  const accountHolderName = useMemo(() => {
    const baseName = activeAccount?.account_name || profile?.full_name || 'Customer';
    const rawName = String(baseName).trim();
    
    // Clean up legacy merchant/business prefixes beautifully using regex (e.g. MMTECHGLOBE, AXISVTU, AXISVTU/, MMTECHGLOBE -, etc.)
    const prefixPattern = /^(?:MMTECHGLOBE|AXISVTU)(?:\s*[-\/:]\s*|\s+)?/i;
    let cleanName = rawName.replace(prefixPattern, '').trim();
    if (!cleanName) {
      cleanName = rawName;
    }
    
    return `MMTECHGLOBE / ${cleanName}`;
  }, [profile?.full_name, activeAccount?.account_name]);

  const hasMonnify = accountsList.some(acc => {
    const name = String(acc.bank_name || '').toLowerCase();
    return name.includes('wema') || name.includes('sterling') || name.includes('monnify');
  });
  const hasMoniepoint = useMemo(() => {
    return accountsList.some(acc => {
      const name = String(acc.bank_name || '').toLowerCase();
      return name.includes('moniepoint');
    });
  }, [accountsList]);
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
              <CardTitle>Dedicated Accounts</CardTitle>
              <CardDescription>Transfer funds directly to any of your accounts below.</CardDescription>
            </div>
            {accountsList.length > 1 && (
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
                  {activeIndex + 1}/{accountsList.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  disabled={activeIndex === accountsList.length - 1}
                  onClick={() => setActiveIndex((prev) => Math.min(accountsList.length - 1, prev + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {accountsList.length > 0 ? (
              <div className="space-y-4">
                {activeAccount && (
                  <div className="rounded-3xl border border-border bg-secondary p-4 transition-all duration-300 hover:scale-[1.01]">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold tracking-wide text-foreground uppercase">{activeAccount.bank_name}</div>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    </div>
                    <div className="mt-3 text-2xl font-semibold tracking-[0.15em] text-foreground font-mono">{activeAccount.account_number}</div>
                    <div className="mt-2 text-sm text-muted-foreground">{accountHolderName}</div>
                    
                    <Button variant="secondary" className="mt-4 w-full rounded-2xl" onClick={() => copy(activeAccount.account_number)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Account Number
                    </Button>
                  </div>
                )}
                {!hasMoniepoint && (
                  <Button 
                    variant="outline" 
                    className="w-full rounded-2xl border-blue-500/35 text-blue-500 hover:bg-blue-500/10 flex items-center justify-center gap-1.5 py-5 text-xs font-bold"
                    onClick={() => setKycModalOpen(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
                    Activate Moniepoint Route
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-card p-5 space-y-4 text-center">
                <div className="h-10 w-10 rounded-2xl bg-orange-500/10 text-primary flex items-center justify-center mx-auto">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">Activate Dedicated Funding Accounts</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Link your BVN or NIN to instantly generate Wema, Sterling, and Moniepoint automated funding routes.
                  </p>
                </div>
                <Button 
                  onClick={() => setKycModalOpen(true)}
                  className="w-full rounded-2xl h-11 text-xs font-bold mt-2"
                >
                  Activate Accounts
                </Button>
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
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>A record of your balance updates and fund flows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredLedger.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {pageQuery ? 'No transactions matched your search.' : 'No history yet.'}
            </div>
          ) : null}
          {filteredLedger.map((item) => (
            <div key={item.id || item.reference} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary p-4">
              <div>
                <div className="text-sm font-medium text-foreground">{item.description || item.reference || 'Transaction'}</div>
                <div className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</div>
              </div>
              <div className={`text-sm font-semibold ${String(item.entry_type || '').toLowerCase() === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {String(item.entry_type || '').toLowerCase() === 'credit' ? '+' : '-'}₦{formatMoney(item.amount || 0)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {kycModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-[32px] border border-border bg-card p-6 md:p-8 shadow-2xl transition-all duration-300 my-auto">
            {/* Glowing Accent */}
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground font-black">Generate Dedicated Account</h3>
                  <p className="text-xs text-muted-foreground">Verification required by CBN regulations</p>
                </div>
              </div>
              <button 
                onClick={() => setKycModalOpen(false)}
                className="h-8 w-8 rounded-full border border-border bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                ×
              </button>
            </div>

            {/* Privacy & Regulatory Trust Disclosure */}
            <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs leading-relaxed text-muted-foreground space-y-2.5">
              <div className="flex items-center gap-2 text-blue-500 font-extrabold tracking-wide uppercase">
                <Sparkles className="h-4 w-4" />
                Zero-Storage Privacy Policy
              </div>
              <p>
                To generate automated funding accounts, the <strong>Central Bank of Nigeria (CBN)</strong> requires identity validation matching your credentials.
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>AxisVTU does NOT store or save your BVN/NIN.</strong> It is instantly encrypted and sent directly to Moniepoint/Monnify.</li>
                <li>This process strictly validates your legal name to secure your dedicated virtual bank accounts.</li>
                <li>Your data remains 100% private and protected.</li>
              </ul>
            </div>

            {/* Selector */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1 mt-6">
              <button
                type="button"
                onClick={() => { setActivationOption('bvn'); setBvn(''); setNin(''); }}
                className={cn(
                  "rounded-lg py-2 text-xs font-semibold transition-all",
                  activationOption === 'bvn' 
                    ? "bg-background text-foreground shadow-sm font-bold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                BVN Option
              </button>
              <button
                type="button"
                onClick={() => { setActivationOption('nin'); setBvn(''); setNin(''); }}
                className={cn(
                  "rounded-lg py-2 text-xs font-semibold transition-all",
                  activationOption === 'nin' 
                    ? "bg-background text-foreground shadow-sm font-bold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                NIN Option
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleKycSubmit} className="space-y-4 mt-6">
              {activationOption === 'bvn' ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bank Verification Number (11 Digits)</label>
                  <input
                    type="text"
                    maxLength={11}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Enter 11-digit BVN"
                    value={bvn}
                    onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">National Identification Number (11 Digits)</label>
                  <input
                    type="text"
                    maxLength={11}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Enter 11-digit NIN"
                    value={nin}
                    onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setKycModalOpen(false)}
                  className="flex-1 rounded-xl h-11 text-xs font-bold border border-border"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 rounded-xl h-11 text-xs font-bold" 
                  disabled={verifying}
                >
                  {verifying ? 'Activating...' : 'Activate Route'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
