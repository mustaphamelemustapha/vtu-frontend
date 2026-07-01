'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, CircleDollarSign, Copy, Gift, Landmark, Package2, RefreshCw, Sparkles, Smartphone, Zap, Tv2, GraduationCap } from 'lucide-react';
import { apiFetch, getProfile } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { quickActions } from '@/lib/nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MetricCard } from '@/components/metric-card';
import { PageHeader } from '@/components/page-header';
import { buildReferralUrl } from '@/lib/site';

function emptyOrRows(value) {
  return Array.isArray(value) ? value : [];
}

const actionDetails = {
  '/buy-data': {
    kicker: 'Most used',
    description: 'Purchase mobile data with a guided flow and clean confirmation.',
    cta: 'Buy data',
    tone: 'from-blue-500/16 via-blue-500/8 to-transparent border-blue-300/70',
    iconTone: 'bg-blue-500 text-white shadow-blue-500/20',
  },
  '/services': {
    kicker: 'Catalog',
    description: 'Browse available MELE DATA services from one organized page.',
    cta: 'Open services',
    tone: 'from-sky-500/14 via-sky-500/7 to-transparent border-sky-300/70',
    iconTone: 'bg-sky-500 text-white shadow-sky-500/20',
  },
  '/wallet': {
    kicker: 'Funding',
    description: 'Check balance, view account details, and fund your wallet.',
    cta: 'Open wallet',
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
  const [summary, setSummary] = useState(null);
  const [fastWallet, setFastWallet] = useState(null);
  const [referrals, setReferrals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);

    apiFetch('/wallet/me').then(setFastWallet).catch(() => {});

    try {
      const [dash, refs] = await Promise.allSettled([
        apiFetch('/dashboard/summary'),
        apiFetch('/referrals/me'),
      ]);
      if (dash.status === 'fulfilled') setSummary(dash.value);
      if (refs.status === 'fulfilled') setReferrals(refs.value);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const wallet = fastWallet || summary?.wallet || {};
  const txs = emptyOrRows(summary?.transactions).slice(0, 6);
  const announcements = emptyOrRows(summary?.announcements).slice(0, 3);
  const bankTransfer = summary?.bank_transfer_accounts || {};
  const primaryFundingAccount = bankTransfer?.accounts?.[0] || null;
  const referralCode = referrals?.referral_code || profile?.referral_code || '—';
  const referralLink = buildReferralUrl(referrals?.referral_code || profile?.referral_code || '');
  const quickStats = useMemo(() => [
    { label: 'Wallet balance', value: wallet.balance !== undefined ? `₦${formatMoney(wallet.balance || 0)}` : '₦...', detail: 'Live available balance', icon: CircleDollarSign, tone: 'brand' },
    { label: 'Rewards earned', value: loading && !referrals ? '₦...' : `₦${formatMoney(referrals?.total_earned ?? 0)}`, detail: 'Referral revenue', icon: Gift, tone: 'violet' },
  ], [wallet.balance, referrals?.total_earned, loading, referrals]);

  const copyFundingAccount = useCallback(async () => {
    const accountNumber = primaryFundingAccount?.account_number;
    if (!accountNumber) return;
    try {
      await navigator.clipboard.writeText(String(accountNumber));
      setCopiedAccount(true);
      window.setTimeout(() => setCopiedAccount(false), 1800);
    } catch {
      setCopiedAccount(false);
    }
  }, [primaryFundingAccount?.account_number]);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Dashboard"
        title={`Good to see you, ${String(profile?.full_name || profile?.email || 'User').split(' ')[0]}`}
        description="A calm command center for MELE DATA operations, balances, and referral activity."
        actions={(
          <>
            <Button variant="secondary" onClick={() => load(true)} className="border-border bg-card text-muted-foreground hover:bg-secondary">
              <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Refresh
            </Button>
            <Button onClick={() => router.push('/buy-data')}>
              <Package2 className="h-4 w-4" />
              Buy Data
            </Button>
          </>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {quickStats.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card shadow-[0_24px_70px_rgba(234,115,69,0.10)]">
        <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-blue-500/20">
              <Landmark className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="axis-label text-primary">Fund your wallet</div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground md:text-2xl">Dedicated funding account</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Transfer to this account to fund your MELE DATA wallet. Copy the account number and send money from your bank app.
              </p>
            </div>
          </div>

          {primaryFundingAccount ? (
            <div className="relative w-full rounded-[2rem] border border-primary/20 bg-card/60 backdrop-blur-3xl p-5 sm:p-6 shadow-[0_24px_50px_rgba(234,115,69,0.06)] overflow-hidden md:min-w-[390px] md:max-w-[520px]">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/20 rounded-full blur-[4rem] pointer-events-none" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Account number</div>
                  <div className="mt-2 break-all font-mono text-3xl font-semibold tracking-[0.16em] text-foreground sm:text-4xl">
                    {primaryFundingAccount.account_number}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-11 w-11 shrink-0 border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
                  onClick={copyFundingAccount}
                  aria-label="Copy funding account number"
                  title="Copy account number"
                >
                  {copiedAccount ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-2xl border border-border bg-secondary p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Bank</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{primaryFundingAccount.bank_name || 'Bank account'}</div>
                </div>
                <div className="min-w-0 rounded-2xl border border-border bg-secondary p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Account name</div>
                  <div className="mt-1 break-words text-sm font-semibold text-foreground">{primaryFundingAccount.account_name || 'MELE DATA Wallet'}</div>
                </div>
              </div>
              <div className="mt-3 text-xs font-medium text-primary">
                {copiedAccount ? 'Account number copied.' : 'Tap copy, then transfer from your bank app.'}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card/85 p-5 text-sm leading-6 text-muted-foreground md:min-w-[360px]">
              {bankTransfer?.message || 'Wallet transfer account will appear here once it is available.'}
              <Button className="mt-4 w-full" onClick={() => router.push('/wallet')}>
                Open wallet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="relative overflow-hidden border border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[4rem] -z-10" />
          <CardHeader className="relative z-10 border-b border-white/5 bg-gradient-to-r from-secondary/30 to-transparent py-4 px-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-bold tracking-tight">Quick Services</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: 'Data', href: '/buy-data', icon: Package2, color: 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/20' },
                { label: 'Airtime', href: '/airtime', icon: Smartphone, color: 'text-sky-500 bg-sky-500/10 dark:bg-sky-500/20' },
                { label: 'Cable TV', href: '/cable-tv', icon: Tv2, color: 'text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20' },
                { label: 'Electricity', href: '/electricity', icon: Zap, color: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20' },
                { label: 'Exam PINs', href: '/exam-pins', icon: GraduationCap, color: 'text-violet-500 bg-violet-500/10 dark:bg-violet-500/20' },
                { label: 'Wallet', href: '/wallet', icon: CircleDollarSign, color: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group relative overflow-hidden flex flex-col items-center justify-center rounded-[1.5rem] border border-white/10 bg-background/40 p-5 text-center transition-all duration-400 hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100 from-white/5 to-transparent" />
                    <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-[1.2rem] shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${item.color}`}>
                      <Icon className="h-7 w-7 drop-shadow-sm" />
                    </div>
                    <span className="relative z-10 text-sm font-bold tracking-tight text-foreground/90 transition-colors duration-200 group-hover:text-primary">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

              </div>

      <div className="space-y-6">
        <Card className="relative overflow-hidden border border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl">
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-[4rem] -z-10" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-xl font-bold tracking-tight">Recent Activity</CardTitle>
            <CardDescription>Latest wallet and service movements.</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            {loading ? <div className="text-sm text-muted-foreground p-4">Loading transactions...</div> : null}
            {txs.length === 0 && !loading ? <div className="text-sm text-muted-foreground p-4">No recent activity yet.</div> : null}
            
            {txs.length > 0 && (
              <div className="w-full overflow-x-auto pb-2">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-muted-foreground border-b border-border/50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">#</th>
                      <th className="px-4 py-3 font-semibold">Phone / Recipient</th>
                      <th className="px-4 py-3 font-semibold">Capacity / Plan</th>
                      <th className="px-4 py-3 font-semibold">Network</th>
                      <th className="px-4 py-3 font-semibold">When</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Tx ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {txs.map((tx, idx) => {
                      const isSuccess = tx.status === 'success' || tx.status === 'delivered';
                      const isPending = tx.status === 'pending' || tx.status === 'processing';
                      const statusColor = isSuccess ? 'text-emerald-500' : isPending ? 'text-amber-500' : 'text-red-500';
                      const statusBg = isSuccess ? 'bg-emerald-500/10' : isPending ? 'bg-amber-500/10' : 'bg-red-500/10';
                      
                      const tType = String(tx.tx_type || '').toLowerCase();
                      const meta = tx.meta || {};
                      
                      const recipient = tx.customer || tx.recipient_phone || meta.recipient_phone || meta.phone_number || meta.phone || meta.smartcard_number || meta.meter_number || '—';
                      
                      let capacity = '—';
                      if (tType === 'data') {
                        const rawPlan = String(tx.data_plan_code || meta.package_code || '');
                        const match = rawPlan.match(/(\d+(?:\.\d+)?\s*(?:GB|MB|TB))/i);
                        capacity = match ? match[1].toUpperCase().replace(/\s/g, '') : (rawPlan || '—');
                      } else if (tType === 'cable') {
                        capacity = tx.data_plan_code || meta.package_code || '—';
                      } else {
                        capacity = `₦${formatMoney(tx.amount || 0)}`;
                      }

                      const network = (tx.network || meta.network || meta.provider || meta.disco || meta.exam || '—').toString().toUpperCase();
                      let netColor = 'text-foreground';
                      let netDot = 'bg-foreground';
                      if (network === 'MTN') { netColor = 'text-yellow-500'; netDot = 'bg-yellow-500'; }
                      else if (network === 'GLO') { netColor = 'text-green-500'; netDot = 'bg-green-500'; }
                      else if (network === 'AIRTEL') { netColor = 'text-red-500'; netDot = 'bg-red-500'; }
                      else if (network === '9MOBILE') { netColor = 'text-emerald-700'; netDot = 'bg-emerald-700'; }

                      const d = new Date(tx.created_at || tx.timestamp);
                      const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString("en-GB").replace(/\//g, '-') : '—';
                      const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : '';

                      return (
                        <tr key={tx.reference || tx.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-4 text-muted-foreground">{idx + 1}</td>
                          <td className="px-4 py-4 font-bold text-foreground">{recipient}</td>
                          <td className="px-4 py-4 font-bold text-foreground">{capacity}</td>
                          <td className="px-4 py-4">
                            {network !== '—' ? (
                              <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-2.5 py-0.5 text-xs font-semibold shadow-sm">
                                <div className={`h-1.5 w-1.5 rounded-full ${netDot}`} />
                                <span className={netColor}>{network}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-foreground">{dateStr}</div>
                            <div className="text-xs text-muted-foreground">{timeStr}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${statusColor} ${statusBg}`}>
                              {String(tx.status || 'pending')}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-xs font-mono text-muted-foreground">
                            #{String(tx.reference || '').substring(0, 8)}...
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
