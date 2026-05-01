'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { adminGetTransactionDetails, adminGetTransactions, adminReconcileDelivered } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { startCase } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { FilterBar } from '@/components/admin/filter-bar';
import { AdminTable } from '@/components/admin/admin-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';

const STATUS_FILTERS = ['', 'success', 'pending', 'failed', 'refunded'];
const TYPE_FILTERS = ['', 'data', 'airtime', 'electricity', 'cable', 'exam', 'deposit'];

export default function AdminTransactionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [selectedDetailsLoading, setSelectedDetailsLoading] = useState(false);
  const [selectedDetailsError, setSelectedDetailsError] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [reconcileConfirmOpen, setReconcileConfirmOpen] = useState(false);
  const [reconcileBusy, setReconcileBusy] = useState(false);
  const [reconcileError, setReconcileError] = useState('');
  const [reconcileSuccess, setReconcileSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminGetTransactions({
        q: query,
        status: status || undefined,
        tx_type: type || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        page: 1,
        page_size: 100,
      });
      setRows(Array.isArray(result?.items) ? result.items : []);
    } finally {
      setLoading(false);
    }
  }, [fromDate, query, status, toDate, type]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const columns = useMemo(() => [
    { key: 'reference', label: 'Reference' },
    { key: 'user_email', label: 'User' },
    { key: 'tx_type', label: 'Service', render: (row) => startCase(row.tx_type) },
    { key: 'network', label: 'Provider/Network', render: (row) => row.network || '—' },
    { key: 'amount', label: 'Amount', render: (row) => `₦${formatMoney(row.amount || 0)}` },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created_at', label: 'Date/time', render: (row) => formatDateTime(row.created_at) },
    {
      key: 'actions',
      label: 'Action',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            setSelected(row);
            setSelectedDetails(null);
            setSelectedDetailsError('');
            setSelectedDetailsLoading(true);
            try {
              const details = await adminGetTransactionDetails(row.reference);
              setSelectedDetails(details || null);
            } catch (err) {
              setSelectedDetailsError(err?.message || 'Unable to load provider details.');
            } finally {
              setSelectedDetailsLoading(false);
            }
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View details
        </Button>
      ),
    },
  ], []);

  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader
        title="Transactions management"
        description="Inspect status, provider, and references. Use filters to focus success, pending, failed, and refunded events."
        actions={(
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </Button>
        )}
      />

      <FilterBar searchValue={query} onSearchChange={setQuery} searchPlaceholder="Search by reference or user email">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-2xl border border-border bg-card px-3 text-sm text-foreground">
          {STATUS_FILTERS.map((value) => (
            <option key={value || 'all'} value={value}>{value ? startCase(value) : 'All status'}</option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-11 rounded-2xl border border-border bg-card px-3 text-sm text-foreground">
          {TYPE_FILTERS.map((value) => (
            <option key={value || 'all'} value={value}>{value ? startCase(value) : 'All services'}</option>
          ))}
        </select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-11 rounded-2xl border border-border bg-card px-3 text-sm text-foreground" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-11 rounded-2xl border border-border bg-card px-3 text-sm text-foreground" />
      </FilterBar>

      <AdminTable columns={columns} rows={rows} empty={loading ? 'Loading transactions...' : 'No transactions for this filter.'} />

      {selected ? (
        <div className="rounded-3xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Transaction details</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelected(null);
                setSelectedDetails(null);
                setSelectedDetailsError('');
              }}
            >
              Close
            </Button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(selected).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-border bg-secondary p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{startCase(key)}</div>
                <div className="mt-1 text-sm text-foreground break-all">{value == null || value === '' ? '—' : String(value)}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-secondary p-3 text-sm text-muted-foreground">
            Use reconciliation only when customer confirms service delivery but system status is wrong.
          </div>
          <div className="mt-3 rounded-2xl border border-border bg-secondary p-3">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Provider raw response</div>
            {selectedDetailsLoading ? (
              <div className="mt-2 text-sm text-muted-foreground">Loading provider payload...</div>
            ) : selectedDetailsError ? (
              <div className="mt-2 text-sm font-medium text-destructive">{selectedDetailsError}</div>
            ) : selectedDetails?.provider_payload_pretty ? (
              <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-border bg-background p-3 text-xs leading-5 text-foreground">
                {selectedDetails.provider_payload_pretty}
              </pre>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">No provider payload captured for this transaction.</div>
            )}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Audit note</div>
              <Input
                value={reconcileNote}
                onChange={(e) => setReconcileNote(e.target.value)}
                placeholder="Delivered confirmed by customer"
              />
              {reconcileError ? <div className="text-xs font-medium text-destructive">{reconcileError}</div> : null}
              {reconcileSuccess ? <div className="text-xs font-medium text-emerald-600 dark:text-emerald-300">{reconcileSuccess}</div> : null}
            </div>
            <Button
              variant="default"
              disabled={reconcileBusy || !selected?.reference}
              onClick={() => {
                setReconcileError('');
                setReconcileSuccess('');
                setReconcileConfirmOpen(true);
              }}
            >
              Reconcile delivered
            </Button>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={reconcileConfirmOpen}
        title="Reconcile transaction to success?"
        description="This will mark the transaction as delivered success. If it was refunded, wallet refund reversal will be attempted and logged."
        confirmLabel="Yes, reconcile"
        busy={reconcileBusy}
        onCancel={() => setReconcileConfirmOpen(false)}
        onConfirm={async () => {
          if (!selected?.reference) return;
          setReconcileBusy(true);
          setReconcileError('');
          setReconcileSuccess('');
          try {
            const result = await adminReconcileDelivered({
              reference: selected.reference,
              note: reconcileNote || undefined,
            });
            setSelected((prev) => (prev ? { ...prev, status: result.new_status } : prev));
            setReconcileSuccess(`Reconciled ${result.reference} successfully.`);
            setReconcileConfirmOpen(false);
            await load();
          } catch (err) {
            setReconcileError(err?.message || 'Failed to reconcile this transaction.');
          } finally {
            setReconcileBusy(false);
          }
        }}
      />
    </div>
  );
}
