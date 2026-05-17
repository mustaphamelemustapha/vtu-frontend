'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, ChevronLeft, ChevronRight, CircleDollarSign, Copy, Gift, Landmark, Package2, RefreshCw, Sparkles } from 'lucide-react';
import { apiFetch, getProfile, readScopedCache, writeScopedCache } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { quickActions } from '@/lib/nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MetricCard } from '@/components/metric-card';
import { PageHeader } from '@/components/page-header';
import { buildReferralUrl } from '@/lib/site';
import { cn } from '@/lib/utils';

function emptyOrRows(value) {
  return Array.isArray(value) ? value : [];
}

function txRecipientLabel(tx) {
  const recipient =
    tx?.meta?.recipient_phone ||
    tx?.meta?.phone_number ||
    tx?.meta?.customer ||
    tx?.meta?.meter_no ||
    tx?.meta?.meter_number ||
    tx?.meta?.smartcard_no ||
    tx?.meta?.smartcard ||
    tx?.meta?.iuc;
  return recipient ? String(recipient) : '';
}

const actionDetails = {
  '/buy-data': {
    kicker: 'Most used',
    description: 'Purchase mobile data with a guided flow and clean confirmation.',
    cta: 'Buy data',
    tone: 'from-orange-500/16 via-orange-500/8 to-transparent border-orange-300/70',
    iconTone: 'bg-orange-500 text-white shadow-orange-500/20',
  },
  '/services': {
    kicker: 'Catalog',
    description: 'Browse available AxisVTU services from one organized page.',
    cta: 'Open services',
    tone: 'from-sky-500/14 via-sky-500/7 to-transparent border-sky-300/70',
    iconTone: 'bg-sky-500 text-white shadow-sky-500/20',
  },
  '/wallet': {
    kicker: 'Top-up',
    description: 'Check balance, view account credit details, and add credit.',
    cta: 'Open account',
    tone: 'from-emerald-500/14 via-emerald-500/7 to-transparent border-emerald-300/70',
    iconTone: 'bg-emerald-500 text-white shadow-emerald-500/20',
  },
  '/history': {
    kicker: 'Records',
    description: 'Review recent purchases, payments, and transaction status.',
    cta: 'View history',
    tone: 'from-amber-500/14 via-amber-500/7 to-transparent border-amber-300/70',
    iconTone: 'bg-amber-500 text-white shadow-amber-500/20',
  },
  '/referrals': {
    kicker: 'Growth',
    description: 'Share your referral code and track invite activity.',
    cta: 'Open referrals',
    tone: 'from-violet-500/14 via-violet-500/7 to-transparent border-violet-300/70',
    iconTone: 'bg-violet-500 text-white shadow-violet-500/20',
  },
  '/profile': {
    kicker: 'Account',
    description: 'Manage your profile, account details, and security settings.',
    cta: 'View profile',
    tone: 'from-slate-500/12 via-slate-500/6 to-transparent border-border',
    iconTone: 'bg-slate-800 text-white shadow-slate-900/10 dark:bg-slate-200 dark:text-slate-950',
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const profile = getProfile();
  const [summary, setSummary] = useState(() => readScopedCache('dashboard_summary', { maxAgeMs: 4 * 60 * 1000 }));
  const [referrals, setReferrals] = useState(() => readScopedCache('dashboard_referrals', { maxAgeMs: 4 * 60 * 1000 }));
  const [loading, setLoading] = useState(() => !(readScopedCache('dashboard_summary', { maxAgeMs: 4 * 60 * 1000 }) || readScopedCache('dashboard_referrals', { maxAgeMs: 4 * 60 * 1000 })));
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showStartHere, setShowStartHere] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    if (!quiet) setLoadError('');
    try {
      const [dash, refs] = await Promise.allSettled([
        apiFetch('/dashboard/summary'),
        apiFetch('/referrals/me'),
      ]);
      if (dash.status === 'fulfilled') {
        setSummary(dash.value);
        writeScopedCache('dashboard_summary', dash.value);
      }
      if (refs.status === 'fulfilled') {
        setReferrals(refs.value);
        writeScopedCache('dashboard_referrals', refs.value);
      }
      if (dash.status !== 'fulfilled' && refs.status !== 'fulfilled') {
        setLoadError('Unable to refresh dashboard right now. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(!!(summary || referrals)).catch(() => {});
  }, [load]);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem('axisvtu_start_here_dismissed');
      setShowStartHere(dismissed !== '1');
    } catch {
      setShowStartHere(true);
    }
  }, []);

  const wallet = summary?.wallet || {};
  const txs = emptyOrRows(summary?.transactions).slice(0, 6);
  const announcements = emptyOrRows(summary?.announcements).slice(0, 3);
  const bankTransfer = summary?.bank_transfer_accounts || {};
  
  const bankAccounts = useMemo(() => {
    const list = Array.isArray(bankTransfer?.accounts) ? [...bankTransfer.accounts] : [];
    if (list.length === 1) {
      list.push({
        isPlaceholder: true,
        bank_name: 'Sterling Bank',
        account_number: 'PENDING',
        account_name: `MMTECHGLOBE/${profile?.full_name || 'Customer'}`.toUpperCase(),
      });
    }
    return list;
  }, [bankTransfer?.accounts, profile?.full_name]);

  const primaryFundingAccount = bankAccounts[activeIndex] || bankAccounts[0] || null;

  const accountHolderName = useMemo(() => {
    const baseName = profile?.full_name || primaryFundingAccount?.account_name || 'Customer';
    const cleanName = String(baseName).trim().toUpperCase();
    if (cleanName.startsWith('MMTECHGLOBE')) {
      return cleanName.replace('MMTECHGLOBE/', 'MMTECHGLOBE / ');
    }
    return `MMTECHGLOBE / ${cleanName}`;
  }, [profile?.full_name, primaryFundingAccount?.account_name]);

  const referralCode = referrals?.referral_code || profile?.referral_code || '—';
  const referralLink = buildReferralUrl(referrals?.referral_code || profile?.referral_code || '');
  const quickStats = useMemo(() => [
    { label: 'Available credit', value: `₦${formatMoney(wallet.balance || 0)}`, detail: 'Live available balance', icon: CircleDollarSign, tone: 'brand' },
    { label: 'Rewards earned', value: `₦${formatMoney(referrals?.total_earned ?? 0)}`, detail: 'Referral revenue', icon: Gift, tone: 'violet' },
  ], [wallet.balance, referrals?.total_earned]);

  const copyFundingAccount = useCallback(async () => {
    const accountNumber = primaryFundingAccount?.account_number;
    if (!accountNumber || primaryFundingAccount?.isPlaceholder) return;
    try {
      await navigator.clipboard.writeText(String(accountNumber));
      setCopiedAccount(true);
      window.setTimeout(() => setCopiedAccount(false), 1800);
    } catch {
      setCopiedAccount(false);
    }
  }, [primaryFundingAccount?.account_number, primaryFundingAccount?.isPlaceholder]);

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden pb-8">
      <PageHeader
        eyebrow="Overview"
        title={`Welcome, ${String(profile?.full_name || profile?.email || 'User').split(' ')[0]}`}
        description="Your dashboard to add money, purchase mobile services, and track transaction history."
        actions={(
          <>
            <Button variant="secondary" onClick={() => load(true)} className="border-border bg-card text-muted-foreground hover:bg-secondary">
              <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Refresh
            </Button>
            <Button onClick={() => router.push('/buy-data')}>
              <Package2 className="h-4 w-4" />
              Data Bundles
            </Button>
          </>
        )}
      />

      {loadError ? (
        <div className="rounded-2xl border border-amber-300/50 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-100">
          {loadError}
        </div>
      ) : null}

      {showStartHere ? (
        <Card className="border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="axis-label text-primary">Get Started</div>
                <div className="mt-1 text-lg font-semibold tracking-tight text-foreground">Three simple steps to start using Axis</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-border bg-secondary px-3 py-1 text-muted-foreground">1. Add Money</span>
                  <span className="rounded-full border border-border bg-secondary px-3 py-1 text-muted-foreground">2. Purchase Data</span>
                  <span className="rounded-full border border-border bg-secondary px-3 py-1 text-muted-foreground">3. Track Transaction</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => router.push('/wallet')}>Add money</Button>
                <Button onClick={() => router.push('/buy-data')}>Purchase data</Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowStartHere(false);
                    try { window.localStorage.setItem('axisvtu_start_here_dismissed', '1'); } catch {}
                  }}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {quickStats.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <Card className="overflow-hidden border-none bg-secondary/30 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_40px_80px_-16px_rgba(249,115,22,0.08)] dark:bg-slate-900/40">
        <CardContent className="grid min-w-0 gap-8 p-6 lg:grid-cols-[1fr_420px] lg:items-center sm:p-8">
          <div className="flex min-w-0 items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(249,115,22,0.3)]">
              <Landmark className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/80">Add Money</div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">Your Funding Accounts</h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                Transfer funds to your dedicated accounts below to top up your balance. Your account will be funded automatically.
              </p>
            </div>
          </div>

          {primaryFundingAccount ? (
            <div className="group relative min-w-0 overflow-hidden rounded-[32px] border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-2xl shadow-primary/5">
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition-all duration-500 group-hover:scale-150" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active & Ready</span>
                </div>
                {bankAccounts.length > 1 ? (
                  <div className="flex items-center gap-1 rounded-full border border-border/80 bg-background/90 p-0.5 scale-90">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-secondary"
                      disabled={activeIndex === 0}
                      onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-[9px] font-extrabold px-1 select-none">
                      {activeIndex + 1}/{bankAccounts.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-secondary"
                      disabled={activeIndex === bankAccounts.length - 1}
                      onClick={() => setActiveIndex((prev) => Math.min(bankAccounts.length - 1, prev + 1))}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary">MMTECHGLOBE Payments</div>
                )}
              </div>

              <div className="relative mt-8">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Account Number</div>
                <div className="mt-1 flex items-center justify-between gap-4">
                  <div className="font-mono text-3xl font-bold tracking-[0.12em] text-foreground sm:text-4xl">
                    {primaryFundingAccount.account_number}
                  </div>
                  {!primaryFundingAccount?.isPlaceholder && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className={cn(
                        "h-12 w-12 shrink-0 rounded-2xl border transition-all duration-300",
                        copiedAccount 
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600" 
                          : "border-primary/20 bg-primary/10 text-primary hover:scale-110 hover:bg-primary/20"
                      )}
                      onClick={copyFundingAccount}
                    >
                      {copiedAccount ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </Button>
                  )}
                </div>
              </div>

              <div className="relative mt-10 grid gap-6 border-t border-border/60 pt-6 sm:grid-cols-2 sm:items-center">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Bank Name</div>
                  <div className="mt-1 text-lg font-black tracking-tight text-foreground">
                    {primaryFundingAccount.bank_name || 'Funding Partner'}
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Account Holder</div>
                  <div className="mt-1 break-words text-sm font-bold text-foreground">
                    {accountHolderName}
                  </div>
                </div>
              </div>

              {primaryFundingAccount?.isPlaceholder && (
                <div className="mt-4 rounded-2xl border border-dashed border-primary/25 bg-primary/5 p-3 text-center text-xs leading-relaxed text-muted-foreground">
                  Activation in progress. Your second virtual account will appear here automatically.
                </div>
              )}

              {copiedAccount && !primaryFundingAccount?.isPlaceholder && (
                <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2">
                  <div className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold text-white shadow-lg">
                    Copied to clipboard
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="min-w-0 rounded-[32px] border border-dashed border-border/60 bg-card/50 p-8 text-center transition-all hover:bg-card">
              <Landmark className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {bankTransfer?.message || 'We are generating your dedicated funding accounts. This will take just a moment.'}
              </p>
              <Button variant="outline" className="mt-6 w-full rounded-2xl border-primary/20 text-primary" onClick={() => router.push('/wallet')}>
                Check Progress
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border bg-gradient-to-r from-secondary to-card">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Quick Services
              </div>
              <CardTitle>Services</CardTitle>
              <CardDescription>Access your primary mobile services and account tools.</CardDescription>
            </div>
            <Badge tone="neutral" className="hidden sm:inline-flex">Responsive</Badge>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3 2xl:grid-cols-3">
              {quickActions.map((item) => {
                const Icon = item.icon;
                const detail = actionDetails[item.href] || actionDetails['/profile'];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex min-h-[198px] flex-col overflow-hidden rounded-3xl border bg-gradient-to-br ${detail.tone} p-3.5 text-left ring-1 ring-primary/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/25 dark:hover:shadow-[0_18px_45px_rgba(0,0,0,0.22)] sm:min-h-[212px] sm:p-4`}
                  >
                    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/35 blur-2xl dark:bg-white/5" />
                    <div className="relative flex items-start justify-between gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-lg ${detail.iconTone} sm:h-11 sm:w-11`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="rounded-full border border-border bg-card/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:px-2.5 sm:text-[10px] sm:tracking-[0.16em]">
                        {detail.kicker}
                      </span>
                    </div>
                    <div className="relative mt-4">
                      <div className="text-[15px] font-semibold tracking-tight text-foreground sm:text-base">{item.label}</div>
                      <p className="mt-1.5 min-h-[52px] text-xs leading-5 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-6">{detail.description}</p>
                      <div className="mt-auto pt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary sm:pt-4 sm:text-sm">
                        {detail.cta}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invite & Earn</CardTitle>
            <CardDescription>Earn rewards when your friends register and add money.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-border bg-secondary p-4">
              <div className="axis-label">Your code</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{referralCode}</div>
              <div className="mt-2 text-sm text-muted-foreground">Share your code with friends. You both get rewarded upon their first fund deposit.</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" onClick={() => router.push('/profile')} className="border-border bg-card text-muted-foreground hover:bg-secondary">
                View profile
              </Button>
              <Button onClick={() => router.push('/referrals')}>Open referrals</Button>
            </div>
            {referralLink ? <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground break-all">{referralLink}</div> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your most recent transactions and payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-2xl border border-border bg-secondary" />
                <div className="h-20 animate-pulse rounded-2xl border border-border bg-secondary" />
                <div className="h-20 animate-pulse rounded-2xl border border-border bg-secondary" />
              </div>
            ) : null}
            {txs.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary p-4 text-sm text-muted-foreground">
                No transactions recorded yet.
                <div className="mt-3">
                  <Button size="sm" onClick={() => router.push('/buy-data')}>Purchase Data</Button>
                </div>
              </div>
            ) : null}
            {txs.map((tx) => (
              <div key={tx.reference || tx.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary p-4">
                <div>
                  <div className="text-sm font-medium text-foreground">{String(tx.tx_type || 'Transaction').replace(/_/g, ' ')}</div>
                  <div className="text-xs text-muted-foreground">
                    {txRecipientLabel(tx) ? `To ${txRecipientLabel(tx)}` : String(tx.reference || '—')}
                  </div>
                  {txRecipientLabel(tx) ? <div className="text-xs text-muted-foreground/80">Ref: {String(tx.reference || '—')}</div> : null}
                  <div className="text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">₦{formatMoney(tx.amount || 0)}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{String(tx.status || 'pending')}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
              <CardDescription>Operational updates from the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.length === 0 ? <div className="text-sm text-muted-foreground">No active announcements.</div> : null}
              {announcements.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-secondary p-4">
                  <div className="text-sm font-medium text-foreground">{item.title || 'Update'}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.message || item.text || ''}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
