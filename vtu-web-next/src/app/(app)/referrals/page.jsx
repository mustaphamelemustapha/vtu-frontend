'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Link2, RefreshCw, Share2, Users } from 'lucide-react';
import { apiFetch, getProfile } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { buildReferralUrl } from '@/lib/site';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';

function referralTone(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'rewarded') return 'success';
  if (normalized === 'qualified') return 'warning';
  return 'neutral';
}

export default function ReferralsPage() {
  const profile = getProfile();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/referrals/me');
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const referralCode = data?.referral_code || profile?.referral_code || '—';
  const referralLink = buildReferralUrl(referralCode === '—' ? '' : referralCode);
  const rows = Array.isArray(data?.referrals) ? data.referrals : [];

  const stats = useMemo(
    () => [
      { label: 'Total referrals', value: data?.total_referrals ?? 0 },
      { label: 'Rewarded referrals', value: data?.rewarded_referrals ?? 0 },
      { label: 'Total earned', value: `₦${formatMoney(data?.total_earned || 0)}` },
      { label: 'Reward rule', value: '2% of first deposit' },
    ],
    [data?.rewarded_referrals, data?.total_earned, data?.total_referrals]
  );

  const copy = async (value) => {
    if (!value) return;
    await navigator.clipboard.writeText(String(value));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Growth"
        title="Referrals"
        description="Share your referral code, track first-deposit qualification, and monitor earned rewards."
        actions={
          <Button variant="secondary" onClick={load} className="border-border bg-card text-muted-foreground hover:bg-secondary">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <div className="axis-label">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Referral history</CardTitle>
            <CardDescription>Qualification and reward status for invited users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!rows.length ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary px-4 py-4 text-sm text-muted-foreground">
                No referrals yet. Share your code to start tracking rewards.
              </div>
            ) : null}

            {rows.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-secondary p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{item.referred_user_name || 'New user'}</div>
                    <div className="text-xs text-muted-foreground">Code used: {item.referral_code_used || '—'}</div>
                  </div>
                  <Badge tone={referralTone(item.status)}>{item.status || 'pending'}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">First deposit</div>
                    <div className="font-medium text-foreground">₦{formatMoney(item.first_deposit_amount || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Reward</div>
                    <div className="font-medium text-foreground">₦{formatMoney(item.reward_amount || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Updated</div>
                    <div className="font-medium text-foreground">{formatDateTime(item.updated_at || item.created_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Share your code</CardTitle>
            <CardDescription>Invite new users and earn after their first deposit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Your referral code</div>
                  <div className="text-xl font-semibold tracking-tight text-foreground">{referralCode}</div>
                </div>
              </div>
            </div>

            <Button variant="secondary" onClick={() => copy(referralCode)} className="w-full border-border bg-card text-muted-foreground hover:bg-secondary">
              <Copy className="h-4 w-4" />
              Copy code
            </Button>

            <Button variant="secondary" onClick={() => copy(referralLink)} className="w-full border-border bg-card text-muted-foreground hover:bg-secondary">
              <Link2 className="h-4 w-4" />
              Copy link
            </Button>

            <Button onClick={() => window.open(referralLink, '_blank', 'noopener,noreferrer')} className="w-full">
              <Share2 className="h-4 w-4" />
              Open referral link
            </Button>

            <div className="rounded-2xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground break-all">
              {referralLink || 'Referral link is not available yet.'}
            </div>

            {copied ? <div className="text-xs font-medium text-primary">Copied to clipboard.</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
