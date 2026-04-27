'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileClock, RefreshCw } from 'lucide-react';
import { apiFetch, readScopedCache, writeScopedCache } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

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

export default function HistoryPage() {
  const [transactions, setTransactions] = useState(() => readScopedCache('history_transactions', { maxAgeMs: 5 * 60 * 1000 }) || []);
  const [reports, setReports] = useState(() => readScopedCache('history_reports', { maxAgeMs: 5 * 60 * 1000 }) || []);
  const [loading, setLoading] = useState(() => !(readScopedCache('history_transactions', { maxAgeMs: 5 * 60 * 1000 }) || []).length);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setLoadError('');
    try {
      const [txRes, reportRes] = await Promise.allSettled([
        apiFetch('/transactions/me'),
        apiFetch('/transactions/reports/me'),
      ]);
      if (txRes.status === 'fulfilled') {
        const rows = Array.isArray(txRes.value) ? txRes.value : [];
        setTransactions(rows);
        writeScopedCache('history_transactions', rows);
      }
      if (reportRes.status === 'fulfilled') {
        const rows = Array.isArray(reportRes.value) ? reportRes.value : [];
        setReports(rows);
        writeScopedCache('history_reports', rows);
      }
      if (txRes.status === 'rejected' && reportRes.status === 'rejected') {
        setLoadError('Unable to load transaction history right now. Please refresh.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(transactions.length > 0 || reports.length > 0).catch(() => {});
  }, [load]);

  const summary = useMemo(() => {
    const success = transactions.filter((item) => String(item.status || '').toLowerCase() === 'success').length;
    const pending = transactions.filter((item) => String(item.status || '').toLowerCase() === 'pending').length;
    const total = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { success, pending, total };
  }, [transactions]);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="History"
        title="Operations timeline"
        description="A compact audit trail for wallet funding, data purchases, and service activity."
        actions={(
          <Button variant="secondary" onClick={() => load()}>
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
          <Card key={item.label}>
            <CardContent className="p-5">
              <div className="axis-label">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Latest movements from the backend timeline.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <div className="text-sm text-muted-foreground">Loading history...</div> : null}
          {loadError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/35 dark:bg-rose-500/12 dark:text-rose-100">
              {loadError}
            </div>
          ) : null}
          {transactions.length === 0 && !loading ? <div className="text-sm text-muted-foreground">No transactions yet.</div> : null}
          {transactions.map((tx) => (
            <div key={tx.reference || tx.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary p-4">
              <div>
                <div className="text-sm font-medium text-foreground">{String(tx.tx_type || 'Transaction').replace(/_/g, ' ')}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {txRecipientLabel(tx) ? `To ${txRecipientLabel(tx)}` : (tx.reference || '—')} • {formatDateTime(tx.created_at)}
                </div>
                {txRecipientLabel(tx) ? <div className="mt-1 text-xs text-muted-foreground/80">Ref: {tx.reference || '—'}</div> : null}
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={String(tx.status || '').toLowerCase() === 'success' ? 'success' : String(tx.status || '').toLowerCase() === 'failed' ? 'danger' : 'warning'}>{tx.status || 'pending'}</Badge>
                <div className="text-sm font-semibold text-foreground">₦{formatMoney(tx.amount || 0)}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>Service-level issue tracking and support history.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reports.length === 0 ? <div className="text-sm text-muted-foreground">No support reports yet.</div> : null}
          {reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-border bg-secondary p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-foreground">Report #{report.id}</div>
                <Badge tone={String(report.status || '').toLowerCase() === 'resolved' ? 'success' : 'warning'}>{report.status || 'open'}</Badge>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{report.message || report.summary || 'Support report details available in backend.'}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
