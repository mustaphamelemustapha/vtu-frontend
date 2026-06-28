'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, CreditCard, Gift, ReceiptText, RefreshCw, ShieldAlert, TrendingUp, UserCheck, Users, Search, Filter } from 'lucide-react';
import { adminGetAnalytics, adminGetTransactions, adminGetReports } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { asMoney, percent, safeList, startCase } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AdminMetricCard } from '@/components/admin/admin-metric-card';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { PremiumDataTable } from '@/components/admin/premium-data-table';
import { motion } from 'framer-motion';

export default function AdminOverviewPage() {
  const [analytics, setAnalytics] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, txRes, reportsRes] = await Promise.allSettled([
        adminGetAnalytics(),
        adminGetTransactions({ page: 1, page_size: 10 }),
        adminGetReports({ page: 1, page_size: 10 }),
      ]);

      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
      if (txRes.status === 'fulfilled') setRecentTx(safeList(txRes.value?.items));
      if (reportsRes.status === 'fulfilled') setReports(safeList(reportsRes.value?.items));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const statusCounts = useMemo(() => {
    const initial = { success: 0, failed: 0, pending: 0 };
    for (const row of recentTx) {
      const status = String(row?.status || '').toLowerCase();
      if (status.includes('success')) initial.success += 1;
      else if (status.includes('fail')) initial.failed += 1;
      else initial.pending += 1;
    }
    return initial;
  }, [recentTx]);

  const metrics = [
    { label: 'Total users', value: Number(analytics?.total_users || 0).toLocaleString('en-NG'), detail: 'Registered accounts', icon: Users, tone: 'brand' },
    {
      label: 'Active users',
      value: Number(analytics?.active_users !== undefined ? analytics.active_users : (analytics?.total_users || 0)).toLocaleString('en-NG'),
      detail: analytics?.active_users !== undefined ? 'Active accounts' : 'Active-state estimate',
      icon: UserCheck,
      tone: 'success'
    },
    { label: 'Today transactions', value: Number(analytics?.daily_transactions || 0).toLocaleString('en-NG'), detail: 'Attempts today', icon: ReceiptText, tone: 'warning' },
    { 
      label: 'Total revenue', 
      value: `₦${formatMoney(analytics?.total_revenue || 0)}`, 
      detail: `Margin ${percent(analytics?.gross_margin_pct)}`, 
      icon: CircleDollarSign, 
      tone: 'brand',
      trend: { value: '+12%', positive: true }
    },
    {
      label: 'Successful tx',
      value: analytics?.today_successful_tx !== undefined
        ? Number(analytics.today_successful_tx).toLocaleString('en-NG')
        : String(statusCounts.success),
      detail: 'Successful transactions today',
      icon: CreditCard,
      tone: 'success',
      trend: { value: '+4%', positive: true }
    },
    {
      label: 'Failed tx',
      value: analytics?.today_failed_tx !== undefined
        ? Number(analytics.today_failed_tx).toLocaleString('en-NG')
        : String(statusCounts.failed),
      detail: 'Failed transactions today',
      icon: ShieldAlert,
      tone: 'danger',
      trend: { value: '-2%', positive: true }
    },
    {
      label: 'Pending tx',
      value: analytics?.today_pending_tx !== undefined
        ? Number(analytics.today_pending_tx).toLocaleString('en-NG')
        : String(statusCounts.pending),
      detail: 'Awaiting provider callback',
      icon: TrendingUp,
      tone: 'warning'
    },
    { label: 'Support issues', value: String(analytics?.reports_open ?? reports.length), detail: 'Open disputes and reports', icon: Gift, tone: 'danger' },
  ];



  const transactionColumns = [
    { key: 'reference', label: 'Reference', render: (row) => <span className="font-mono text-xs">{row.reference || 'N/A'}</span> },
    { key: 'tx_type', label: 'Type', render: (row) => startCase(row.tx_type) },
    { key: 'amount', label: 'Amount', render: (row) => <span className="font-semibold">₦{formatMoney(row.amount || 0)}</span> },
    { key: 'created_at', label: 'Date', render: (row) => <span className="text-muted-foreground">{formatDateTime(row.created_at)}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];


  return (
    <div className="space-y-6 pb-8">
      <AdminPageHeader
        eyebrow="Dashboard"
        title="Command Center"
        description="Real-time operations, transaction monitoring, and platform analytics."
        actions={(
          <Button variant="outline" className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh Data
          </Button>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <AdminMetricCard {...item} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Recent Transactions</h3>
              <p className="text-sm text-muted-foreground">Latest operations touching payment rails.</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-brand">
              <Link href="/admin/transactions">View All</Link>
            </Button>
          </div>
          <PremiumDataTable 
            data={recentTx} 
            columns={transactionColumns} 
            searchKey="reference"
            emptyMessage="Transactions will appear here once admin endpoints return data."
          />
        </motion.div>
      </div>
    </div>
  );
}
