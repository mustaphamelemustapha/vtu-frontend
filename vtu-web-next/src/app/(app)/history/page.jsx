'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileClock, RefreshCw } from 'lucide-react';
import { apiFetch, readScopedCache, writeScopedCache } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { TransactionReceiptModal } from '@/components/transaction-receipt-modal';
import { buildTransactionReceipt, downloadReceipt, shareReceipt } from '@/lib/receipt';
import { cn } from '@/lib/utils';

function txRecipientLabel(tx) {
  const recipient =
    tx?.meta?.recipient_phone ||
    tx?.meta?.phone_number ||
    tx?.meta?.phone ||
    tx?.meta?.recipient ||
    tx?.meta?.destination ||
    tx?.meta?.target ||
    tx?.meta?.customer ||
    tx?.meta?.meter_no ||
    tx?.meta?.meter_number ||
    tx?.meta?.smartcard_no ||
    tx?.meta?.smartcard ||
    tx?.meta?.iuc ||
    tx?.recipient ||
    tx?.phone_number ||
    tx?.phone ||
    tx?.destination;
  return recipient ? String(recipient) : '';
}

export default function HistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageQuery = String(searchParams.get('q') || '').trim().toLowerCase();
  const [transactions, setTransactions] = useState(() => readScopedCache('history_transactions', { maxAgeMs: 30 * 24 * 60 * 60 * 1000 }) || []);
  const [reports, setReports] = useState(() => readScopedCache('history_reports', { maxAgeMs: 30 * 24 * 60 * 60 * 1000 }) || []);
  const [loading, setLoading] = useState(() => !(readScopedCache('history_transactions', { maxAgeMs: 30 * 24 * 60 * 60 * 1000 }) || []).length);
  const [loadError, setLoadError] = useState('');

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

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

  const filteredTransactions = useMemo(() => {
    if (!pageQuery) return transactions;
    return transactions.filter((tx) => {
      const haystack = [
        tx?.reference,
        tx?.tx_type,
        txRecipientLabel(tx),
        tx?.meta?.customer_name,
        tx?.meta?.plan_name,
        tx?.meta?.network,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(pageQuery);
    });
  }, [pageQuery, transactions]);

  const handleTxClick = useCallback((tx) => {
    const metaArr = [];
    if (tx.meta) {
      if (tx.meta.plan_name) metaArr.push({ label: 'Plan', value: tx.meta.plan_name });
      if (tx.meta.token) metaArr.push({ label: 'Token', value: tx.meta.token });
      if (tx.meta.network) metaArr.push({ label: 'Network', value: String(tx.meta.network).toUpperCase() });
      if (tx.meta.customer_name) metaArr.push({ label: 'Customer Name', value: tx.meta.customer_name });
      if (tx.meta.provider_ref) metaArr.push({ label: 'Provider Ref', value: tx.meta.provider_ref });
      if (tx.meta.units) metaArr.push({ label: 'Units', value: tx.meta.units });
    }

    const receiptData = buildTransactionReceipt({
      service: String(tx.tx_type || 'Transaction').replace(/_/g, ' ').toUpperCase(),
      status: String(tx.status || 'pending').toLowerCase(),
      amount: tx.amount,
      reference: tx.reference,
      customer: txRecipientLabel(tx),
      meta: metaArr,
    });
    
    // Use actual transaction date instead of current date
    receiptData.createdAt = tx.created_at || receiptData.createdAt;

    setSelectedReceipt(receiptData);
    setReceiptModalOpen(true);
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="History"
        title="Operations timeline"
        description="A compact audit trail for account top-ups, data purchases, and service activity."
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
          <CardTitle>Service Orders</CardTitle>
          <CardDescription>Latest activity from the backend timeline.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <div className="text-sm text-muted-foreground">Loading history...</div> : null}
          {loadError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/35 dark:bg-rose-500/12 dark:text-rose-100">
              {loadError}
            </div>
          ) : null}
          {filteredTransactions.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-border bg-secondary p-4 text-sm text-muted-foreground">
              {pageQuery
                ? 'No orders matched your search.'
                : 'No orders yet. Your receipts will appear here after a purchase.'}
              <div className="mt-3">
                <Button size="sm" onClick={() => router.push('/buy-data')}>Buy data</Button>
              </div>
            </div>
          ) : null}
          {filteredTransactions.map((tx) => {
            const recipient = txRecipientLabel(tx);
            const status = String(tx.status || 'pending').toLowerCase();
            const typeLower = String(tx.tx_type || '').toLowerCase();
            return (
              <div 
                key={tx.reference || tx.id} 
                onClick={() => handleTxClick(tx)}
                className="flex items-center justify-between gap-4 rounded-[20px] border border-border bg-card p-4 cursor-pointer hover:bg-secondary/40 transition-all min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Circle Icon showing type prefix */}
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold font-mono",
                    typeLower.includes('data') ? "bg-blue-500/10 text-blue-500" :
                    typeLower.includes('airtime') ? "bg-green-500/10 text-green-500" :
                    typeLower.includes('funding') || typeLower.includes('deposit') || typeLower.includes('wallet') ? "bg-emerald-500/10 text-emerald-500" :
                    "bg-indigo-500/10 text-indigo-500"
                  )}>
                    {String(tx.tx_type || 'TX').slice(0, 2).toUpperCase()}
                  </div>
                  
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                      {String(tx.tx_type || 'Transaction').replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm font-extrabold text-foreground truncate">
                      {recipient ? `To ${recipient}` : String(tx.reference || '—')}
                    </div>
                    {recipient && (
                      <div className="text-[11px] text-muted-foreground/80 font-mono truncate">
                        Ref: {String(tx.reference || '—')}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      {formatDateTime(tx.created_at)}
                    </div>
                  </div>
                </div>
                
                <div className="text-right space-y-1.5 shrink-0">
                  <div className="text-sm font-black text-foreground">
                    ₦{formatMoney(tx.amount || 0)}
                  </div>
                  <div>
                    {status === 'success' || status === 'completed' ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-500 border border-emerald-500/20">
                        Success
                      </span>
                    ) : status === 'failed' || status === 'reversed' || status === 'cancelled' ? (
                      <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-500 border border-rose-500/20">
                        Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500 border border-amber-500/20">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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

      <TransactionReceiptModal
        open={receiptModalOpen}
        receipt={selectedReceipt}
        onClose={() => setReceiptModalOpen(false)}
        onDownload={(node) => (selectedReceipt ? downloadReceipt(selectedReceipt, node) : null)}
        onShare={(node) => (selectedReceipt ? shareReceipt(selectedReceipt, node) : null)}
      />
    </div>
  );
}
