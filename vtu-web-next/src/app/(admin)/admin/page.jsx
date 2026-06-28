'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, CreditCard, Gift, ReceiptText, RefreshCw, ShieldAlert, TrendingUp, UserCheck, Users, Search, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { adminGetAnalytics, adminGetTransactions, adminGetReports } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { asMoney, percent, safeList, startCase } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AdminMetricCard } from '@/components/admin/admin-metric-card';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { PremiumDataTable } from '@/components/admin/premium-data-table';
import { ProfitMetricsCard } from '@/components/admin/profit-metrics-card';
import { motion } from 'framer-motion';

export default function AdminOverviewPage() {
  const [analytics, setAnalytics] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txDate, setTxDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, txRes, reportsRes] = await Promise.allSettled([
        adminGetAnalytics(),
        adminGetTransactions({ page: 1, page_size: 10, from: txDate || undefined, to: txDate || undefined }),
        adminGetReports({ page: 1, page_size: 10 }),
      ]);

      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
      if (txRes.status === 'fulfilled') setRecentTx(safeList(txRes.value?.items));
      if (reportsRes.status === 'fulfilled') setReports(safeList(reportsRes.value?.items));
    } finally {
      setLoading(false);
    }
  }, [txDate]);

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
    { label: 'Data revenue', value: `₦${formatMoney(analytics?.data_revenue || 0)}`, detail: 'Total data sales volume', icon: ReceiptText, tone: 'success' },
    {
      label: 'Data margin',
      value: `₦${formatMoney(analytics?.gross_profit_estimate || 0)}`,
      detail: `~${Number(analytics?.gross_margin_pct || 0).toFixed(1)}% gross margin`,
      icon: CircleDollarSign,
      tone: 'success'
    },
    { label: 'Service revenue', value: `₦${formatMoney(analytics?.service_revenue || 0)}`, detail: 'Airtime, Cable, Bills', icon: ReceiptText, tone: 'brand' },
    { label: 'Service margin', value: `₦${formatMoney(analytics?.service_profit_estimate || 0)}`, detail: 'Est. profit from services', icon: CircleDollarSign, tone: 'brand' },
    {
      label: 'Today’s volume',
      value: String(analytics?.daily_transactions || 0),
      detail: `${analytics?.today_successful_tx || 0} success, ${analytics?.today_failed_tx || 0} failed`,
      icon: CreditCard,
      tone: 'brand'
    },
    {
      label: 'API success rate',
      value: percent(analytics?.api_success, (analytics?.api_success || 0) + (analytics?.api_failed || 0)),
      detail: `Out of ${(analytics?.api_success || 0) + (analytics?.api_failed || 0)} calls`,
      icon: ShieldAlert,
      tone: (analytics?.api_success || 0) > (analytics?.api_failed || 0) ? 'success' : 'danger'
    },
    {
      label: 'Recent tx success',
      value: String(statusCounts.success),
      detail: 'Last 10 payload distribution',
      icon: TrendingUp,
      tone: 'success'
    },
    {
      label: 'Recent tx failed',
      value: String(statusCounts.failed),
      detail: 'Failed or refunded',
      icon: TrendingUp,
      tone: 'danger'
    },
    {
      label: 'Recent tx pending',
      value: String(statusCounts.pending),
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

  const DateFilter = (
    <div className="relative">
      <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input 
        type="date" 
        value={txDate} 
        onChange={(e) => setTxDate(e.target.value)} 
        className="h-10 rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/50" 
      />
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      <AdminPageHeader
        eyebrow="Dashboard"
        title="Command Center"
        description="Real-time operations, transaction monitoring, and platform analytics."
        actions={(
          <Button variant="outline" className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm hover:bg-secondary" onClick={load} disabled={loading}>
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
          <ProfitMetricsCard profitData={analytics?.profit_period_estimates} />
        </motion.div>
      </div>

      <div className="grid gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
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
            headerActions={DateFilter}
          />
        </motion.div>
      </div>
    </div>
  );
}
