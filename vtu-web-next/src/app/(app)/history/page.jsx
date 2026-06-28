'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileClock, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

export default function HistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, reportRes] = await Promise.allSettled([
        apiFetch('/transactions/me'),
        apiFetch('/transactions/reports/me'),
      ]);
      if (txRes.status === 'fulfilled') setTransactions(Array.isArray(txRes.value) ? txRes.value : []);
      if (reportRes.status === 'fulfilled') setReports(Array.isArray(reportRes.value) ? reportRes.value : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const summary = useMemo(() => {
    const success = transactions.filter((item) => String(item.status || '').toLowerCase() === 'success').length;
    const pending = transactions.filter((item) => String(item.status || '').toLowerCase() === 'pending').length;
    const total = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { success, pending, total };
  }, [transactions]);

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-40px)] bg-background px-4 py-5 text-foreground md:-mx-6 md:-my-5 md:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10">
      <div className="space-y-6 pb-28 md:pb-8">
      <PageHeader
        eyebrow="History"
        title="Operations timeline"
        description="A compact audit trail for wallet funding, data purchases, and service activity."
        actions={(
          <Button variant="secondary" onClick={() => load()} className="border-white/10 bg-background/50 text-muted-foreground hover:bg-card hover:text-foreground backdrop-blur-sm">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Successful', value: String(summary.success) },
          { label: 'Pending', value: String(summary.pending) },
          { label: 'Volume', value: `₦${formatMoney(summary.total)}` },
        ].map((item) => (
          <div key={item.label} className="group relative overflow-hidden rounded-[1.5rem] border border-border/40 bg-card/40 p-5 transition-all hover:bg-card/60 hover:shadow-md backdrop-blur-2xl shadow-lg">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-[3rem] pointer-events-none" />
            <div className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">{item.label}</div>
            <div className="relative z-10 mt-2 text-3xl font-bold text-foreground">{item.value}</div>
          </div>
        ))}
      </div>

      <Card className="relative overflow-hidden border border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl">
        <CardHeader className="relative z-10">
          <CardTitle className="text-xl font-bold tracking-tight">Transactions</CardTitle>
          <CardDescription>Latest movements from the backend timeline.</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 space-y-4">
          {loading ? <div className="text-sm text-muted-foreground">Loading history...</div> : null}
          {transactions.length === 0 && !loading ? <div className="text-sm text-muted-foreground">No transactions yet.</div> : null}
          {transactions.map((tx) => (
            <div key={tx.reference || tx.id} className="group relative overflow-hidden flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/5 bg-background/50 p-5 transition-all hover:bg-background/80 hover:shadow-md">
              <div className="relative z-10">
                <div className="text-[15px] font-bold text-foreground/90 uppercase tracking-wide">{String(tx.tx_type || 'Transaction').replace(/_/g, ' ')}</div>
                <div className="mt-1.5 text-xs text-muted-foreground font-mono bg-black/20 dark:bg-black/40 px-2 py-0.5 rounded-md inline-block">{tx.reference || '—'}</div>
                <div className="mt-1.5 text-[11px] text-muted-foreground/70 font-medium">{formatDateTime(tx.created_at)}</div>
              </div>
              <div className="relative z-10 flex flex-col items-end gap-2">
                <div className="text-lg font-bold text-foreground font-mono">₦{formatMoney(tx.amount || 0)}</div>
                <Badge className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-opacity-10 shadow-none border-transparent" tone={String(tx.status || '').toLowerCase() === 'success' ? 'success' : String(tx.status || '').toLowerCase() === 'failed' ? 'danger' : 'warning'}>{tx.status || 'pending'}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl mt-6">
        <CardHeader className="relative z-10">
          <CardTitle className="text-xl font-bold tracking-tight">Reports</CardTitle>
          <CardDescription>Service-level issue tracking and support history.</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 space-y-4">
          {reports.length === 0 ? <div className="text-sm text-muted-foreground">No support reports yet.</div> : null}
          {reports.map((report) => (
            <div key={report.id} className="rounded-[1.5rem] border border-white/5 bg-background/50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-foreground/90 uppercase tracking-wide">Report #{report.id}</div>
                <Badge className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-opacity-10 shadow-none border-transparent" tone={String(report.status || '').toLowerCase() === 'resolved' ? 'success' : 'warning'}>{report.status || 'open'}</Badge>
              </div>
              <div className="mt-3 text-[13px] leading-relaxed text-muted-foreground/80 bg-black/10 dark:bg-black/20 p-3 rounded-xl font-medium">{report.message || report.summary || 'Support report details available in backend.'}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
