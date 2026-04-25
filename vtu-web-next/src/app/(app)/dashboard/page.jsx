'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, CircleDollarSign, Gift, Package2, RefreshCw, TrendingUp, Users } from 'lucide-react';
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

export default function DashboardPage() {
  const router = useRouter();
  const profile = getProfile();
  const [summary, setSummary] = useState(null);
  const [referrals, setReferrals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
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

  const wallet = summary?.wallet || {};
  const txs = emptyOrRows(summary?.transactions).slice(0, 6);
  const announcements = emptyOrRows(summary?.announcements).slice(0, 3);
  const bankTransfer = summary?.bank_transfer_accounts || {};
  const referralCode = referrals?.referral_code || profile?.referral_code || '—';
  const referralLink = buildReferralUrl(referrals?.referral_code || profile?.referral_code || '');
  const quickStats = useMemo(() => [
    { label: 'Wallet balance', value: `₦${formatMoney(wallet.balance || 0)}`, detail: 'Live available balance', icon: CircleDollarSign, tone: 'brand' },
    { label: 'Total referrals', value: String(referrals?.total_referrals ?? 0), detail: 'Friends brought in', icon: Users, tone: 'emerald' },
    { label: 'Rewards earned', value: `₦${formatMoney(referrals?.total_earned ?? 0)}`, detail: 'Referral revenue', icon: Gift, tone: 'violet' },
    { label: 'Recent tx', value: String(txs.length), detail: 'Latest transactions in view', icon: TrendingUp, tone: 'amber' },
  ], [wallet.balance, referrals?.total_referrals, referrals?.total_earned, txs.length]);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Dashboard"
        title={`Good to see you, ${String(profile?.full_name || profile?.email || 'User').split(' ')[0]}`}
        description="A calm, desktop-native command center for AxisVTU operations, balances, and referral activity."
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

      <div className="grid gap-4 xl:grid-cols-4">
        {quickStats.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Core operations surfaced at the top of the workspace.</CardDescription>
            </div>
            <Badge tone="neutral">Desktop-first</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className="group rounded-3xl border border-border bg-secondary p-4 text-left transition hover:border-orange-200 hover:bg-orange-50"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="mt-4 text-sm font-semibold text-foreground">{item.label}</div>
                    <div className="mt-1 text-sm text-muted-foreground">Open workspace</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referral position</CardTitle>
            <CardDescription>Invite-first deposit rewards, surfaced directly on the dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-border bg-secondary p-4">
              <div className="axis-label">Your code</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{referralCode}</div>
              <div className="mt-2 text-sm text-muted-foreground">Share this code with new users to earn rewards after their first deposit.</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" onClick={() => router.push('/profile')} className="border-border bg-card text-muted-foreground hover:bg-secondary">
                View profile
              </Button>
              <Button onClick={() => router.push('/profile')}>Open referrals</Button>
            </div>
            {referralLink ? <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground break-all">{referralLink}</div> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest wallet and service movements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? <div className="text-sm text-muted-foreground">Loading transactions...</div> : null}
            {txs.length === 0 && !loading ? <div className="text-sm text-muted-foreground">No recent activity yet.</div> : null}
            {txs.map((tx) => (
              <div key={tx.reference || tx.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary p-4">
                <div>
                  <div className="text-sm font-medium text-foreground">{String(tx.tx_type || 'Transaction').replace(/_/g, ' ')}</div>
                  <div className="text-xs text-muted-foreground">{String(tx.reference || '—')}</div>
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
              <CardTitle>Funding account</CardTitle>
              <CardDescription>Dedicated transfer details for wallet top-ups.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bankTransfer?.accounts?.[0] ? (
                <>
                  <div className="rounded-3xl border border-border bg-secondary p-4">
                    <div className="axis-label">Bank</div>
                    <div className="mt-2 text-lg font-semibold text-foreground">{bankTransfer.accounts[0].bank_name}</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[0.24em] text-foreground">{bankTransfer.accounts[0].account_number}</div>
                    <div className="mt-2 text-sm text-muted-foreground">{bankTransfer.accounts[0].account_name || 'AxisVTU Wallet'}</div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                  {bankTransfer?.message || 'Wallet transfer accounts will appear here.'}
                </div>
              )}
              <Button className="w-full border-border bg-card text-muted-foreground hover:bg-secondary" variant="secondary" onClick={() => router.push('/wallet')}>
                Open wallet
              </Button>
            </CardContent>
          </Card>

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
