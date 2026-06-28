'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, CreditCard, Gift, ReceiptText, RefreshCw, ShieldAlert, TrendingUp, UserCheck, Users, Search, Filter } from 'lucide-react';
import { adminGetAnalytics, adminGetTransactions, adminGetReports } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { asMoney, percent, safeList, startCase } from '@/lib/admin-utils';
import { adminQuickLinks } from '@/lib/admin-nav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminMetricCard } from '@/components/admin/admin-metric-card';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { PremiumDataTable } from '@/components/admin/premium-data-table';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

  // Dummy chart data (replace with actual analytics when available)
  const chartData = [
    { name: 'Mon', revenue: 4000, profit: 2400 },
    { name: 'Tue', revenue: 3000, profit: 1398 },
    { name: 'Wed', revenue: 2000, profit: 9800 },
    { name: 'Thu', revenue: 2780, profit: 3908 },
    { name: 'Fri', revenue: 1890, profit: 4800 },
    { name: 'Sat', revenue: 2390, profit: 3800 },
    { name: 'Sun', revenue: 3490, profit: 4300 },
  ];

  const transactionColumns = [
    { key: 'reference', label: 'Reference', render: (row) => <span className="font-mono text-xs">{row.reference || 'N/A'}</span> },
    { key: 'tx_type', label: 'Type', render: (row) => startCase(row.tx_type) },
    { key: 'amount', label: 'Amount', render: (row) => <span className="font-semibold">₦{formatMoney(row.amount || 0)}</span> },
    { key: 'created_at', label: 'Date', render: (row) => <span className="text-muted-foreground">{formatDateTime(row.created_at)}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const supportColumns = [
    { key: 'id', label: 'ID', render: (row) => <span className="font-mono text-xs">#{row.id}</span> },
    { key: 'transaction_reference', label: 'Reference', render: (row) => <span className="font-mono text-xs text-muted-foreground">{row.transaction_reference}</span> },
    { key: 'user_email', label: 'User', render: (row) => row.user_email || 'Unknown' },
    { key: 'reason', label: 'Issue', render: (row) => <span className="max-w-[200px] truncate block">{row.reason}</span> },
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

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="h-full border-border/50 bg-card/50 backdrop-blur-xl shadow-sm">
            <CardHeader>
              <CardTitle>Revenue vs Profit Trends</CardTitle>
              <CardDescription>7-day rolling window of financial performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => `₦${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                      itemStyle={{ fontSize: '14px' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                    <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="h-full border-border/50 bg-card/50 backdrop-blur-xl shadow-sm flex flex-col">
            <CardHeader>
              <CardTitle>Transaction Volume</CardTitle>
              <CardDescription>Daily success vs failure distribution.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="h-[200px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-auto grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                {adminQuickLinks.map((item) => (
                  <Button key={item.href} asChild variant="outline" className="justify-start rounded-xl border-border/50 bg-background/50 hover:bg-secondary">
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
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
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Support Inbox</h3>
              <p className="text-sm text-muted-foreground">Active disputes and user complaints.</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-brand">
              <Link href="/admin/support">View Inbox</Link>
            </Button>
          </div>
          <PremiumDataTable 
            data={reports} 
            columns={supportColumns} 
            searchKey="transaction_reference"
            emptyMessage="Support cases are clear or endpoint data is not available yet."
          />
        </motion.div>
      </div>
    </div>
  );
}
