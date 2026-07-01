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

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [txRes, reportRes] = await Promise.allSettled([
        apiFetch('/transactions/me'),
        apiFetch('/transactions/reports/me'),
      ]);
      if (txRes.status === 'fulfilled') setTransactions(Array.isArray(txRes.value) ? txRes.value : []);
      if (reportRes.status === 'fulfilled') setReports(Array.isArray(reportRes.value) ? reportRes.value : []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  // Auto-refresh if there are pending transactions
  useEffect(() => {
    const hasPending = transactions.some((tx) => String(tx.status || '').toLowerCase() === 'pending');
    if (!hasPending) return;

    const interval = setInterval(() => {
      load(true).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [transactions, load]);

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
        <CardContent className="relative z-10">
          {loading ? <div className="text-sm text-muted-foreground p-4">Loading history...</div> : null}
          {transactions.length === 0 && !loading ? <div className="text-sm text-muted-foreground p-4">No transactions yet.</div> : null}
          
          {transactions.length > 0 && (
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
                  {transactions.map((tx, idx) => {
                    const isSuccess = tx.status === 'success' || tx.status === 'delivered';
                    const isPending = tx.status === 'pending' || tx.status === 'processing';
                    const statusColor = isSuccess ? 'text-emerald-500' : isPending ? 'text-amber-500' : 'text-red-500';
                    const statusBg = isSuccess ? 'bg-emerald-500/10' : isPending ? 'bg-amber-500/10' : 'bg-red-500/10';
                    
                    const tType = String(tx.tx_type || '').toLowerCase();
                    const meta = tx.meta || {};
                    
                    const recipient = tx.customer || tx.recipient_phone || meta.recipient_phone || meta.phone_number || meta.phone || meta.smartcard_number || meta.meter_number || '—';
                    
                    let capacity = '—';
                    if (tType === 'data' || tType === 'cable') capacity = tx.data_plan_code || meta.package_code || '—';
                    else capacity = `₦${formatMoney(tx.amount || 0)}`;

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
