'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ADMIN_NOTES, ADMIN_PLACEHOLDER } from '@/lib/admin-placeholders';
import { formatDateTime, formatMoney } from '@/lib/format';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminTable } from '@/components/admin/admin-table';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/admin/status-badge';

export default function AdminReferralsPage() {
  const rows = useMemo(() => ADMIN_PLACEHOLDER.referrals, []);

  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader
        title="Referral management"
        description="Audit referral rewards, qualifying deposits, and duplicate reward protection status."
      />

      <Card className="border-amber-300/80 bg-amber-50/70 dark:border-amber-400/30 dark:bg-amber-500/10">
        <CardContent className="flex items-start gap-3 p-4">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-amber-300 bg-card text-amber-700 dark:border-amber-400/30 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <p className="text-sm leading-6 text-muted-foreground">{ADMIN_NOTES.referrals}</p>
        </CardContent>
      </Card>

      <AdminTable
        columns={[
          { key: 'referral_code', label: 'Referral code' },
          { key: 'referrer', label: 'Referrer' },
          { key: 'referred_user', label: 'Referred user' },
          { key: 'first_deposit_amount', label: 'First deposit', render: (row) => `₦${formatMoney(row.first_deposit_amount || 0)}` },
          { key: 'reward_amount', label: '2% reward', render: (row) => `₦${formatMoney(row.reward_amount || 0)}` },
          { key: 'status', label: 'Reward status', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'rewarded_at', label: 'Rewarded date', render: (row) => formatDateTime(row.rewarded_at) },
          { key: 'actions', label: 'Actions', render: () => <span className="text-xs text-muted-foreground">Audit pending</span> },
        ]}
        rows={rows}
        empty="No referral rows available yet."
      />
    </div>
  );
}
