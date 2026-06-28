'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, Calendar as CalendarIcon, Search } from 'lucide-react';
import { adminFailAndRefundPending, adminFailAndRefundPendingBulk, adminGetAuditLogs, adminGetTransactionDetails, adminGetTransactions, adminReconcileDelivered, adminReconcileDeliveredBulk } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { startCase } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { PremiumDataTable } from '@/components/admin/premium-data-table';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_FILTERS = ['', 'success', 'pending', 'failed', 'refunded'];
const TYPE_FILTERS = ['', 'data', 'airtime', 'electricity', 'cable', 'exam', 'deposit'];

export default function AdminTransactionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [selected, setSelected] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [selectedDetailsLoading, setSelectedDetailsLoading] = useState(false);
  const [selectedDetailsError, setSelectedDetailsError] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [reconcileConfirmOpen, setReconcileConfirmOpen] = useState(false);
  const [reconcileBusy, setReconcileBusy] = useState(false);
  const [reconcileError, setReconcileError] = useState('');
  const [reconcileSuccess, setReconcileSuccess] = useState('');
  
  const [bulkReferences, setBulkReferences] = useState('');
  const [bulkNote, setBulkNote] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [bulkFailBusy, setBulkFailBusy] = useState(false);
  const [bulkFailError, setBulkFailError] = useState('');
  const [bulkFailSuccess, setBulkFailSuccess] = useState('');
  const [failRefundConfirmOpen, setFailRefundConfirmOpen] = useState(false);
  const [failRefundBusy, setFailRefundBusy] = useState(false);
  const [failRefundError, setFailRefundError] = useState('');
  const [failRefundSuccess, setFailRefundSuccess] = useState('');

  const activeRequestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    const requestId = Date.now();
    activeRequestRef.current = requestId;
    setLoading(true);
    try {
      const txParams = {
        q: debouncedQuery || undefined,
        status: status || undefined,
        tx_type: type || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page: page,
        page_size: pageSize,
      };
      const result = await adminGetTransactions(txParams);
      if (activeRequestRef.current !== requestId) return;

      setRows(Array.isArray(result?.items) ? result.items : []);
      setTotalRows(Number(result?.total || 0));
    } catch (err) {
      if (activeRequestRef.current === requestId) {
        setRows([]);
        setTotalRows(0);
      }
      console.error('Admin transactions load failed:', err);
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [debouncedQuery, fromDate, status, toDate, type, page]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const columns = useMemo(() => [
    { key: 'reference', label: 'Reference', sortable: false, render: (row) => <span className="font-mono text-[13px]">{row.reference}</span> },
    { key: 'user_email', label: 'User', sortable: false },
    { key: 'tx_type', label: 'Service', sortable: false, render: (row) => startCase(row.tx_type) },
    { key: 'network', label: 'Provider', sortable: false, render: (row) => row.network || '—' },
    { key: 'amount', label: 'Amount', sortable: false, render: (row) => <span className="font-semibold">₦{formatMoney(row.amount || 0)}</span> },
    { key: 'status', label: 'Status', sortable: false, render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created_at', label: 'Date/Time', sortable: false, render: (row) => <span className="text-muted-foreground">{formatDateTime(row.created_at)}</span> },
    {
      key: 'actions',
      label: 'Action',
      sortable: false,
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          className="rounded-xl"
          onClick={async () => {
            setSelected(row);
            setSelectedDetails(null);
            setSelectedDetailsError('');
            setSelectedDetailsLoading(true);
            try {
              const [details, auditRes] = await Promise.allSettled([
                adminGetTransactionDetails(row.reference),
                adminGetAuditLogs({ reference: row.reference, page_size: 5 }),
              ]);
              const detailsData = details.status === 'fulfilled' ? (details.value || null) : null;
              const latestAudit = auditRes.status === 'fulfilled'
                ? (Array.isArray(auditRes.value?.items) ? auditRes.value.items[0] || null : null)
                : null;
              setSelectedDetails(detailsData ? { ...detailsData, audit: latestAudit } : null);
              if (details.status === 'rejected') {
                setSelectedDetailsError(details.reason?.message || 'Unable to load provider details.');
              }
            } catch (err) {
              setSelectedDetailsError(err?.message || 'Unable to load provider details.');
            } finally {
              setSelectedDetailsLoading(false);
            }
          }}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          View
        </Button>
      ),
    },
  ], []);

  const Filters = (
    <div className="flex flex-wrap items-center gap-3">
      <select 
        value={status} 
        onChange={(e) => { setStatus(e.target.value); setPage(1); }} 
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/50"
      >
        {STATUS_FILTERS.map((value) => (
          <option key={value || 'all'} value={value}>{value ? startCase(value) : 'All status'}</option>
        ))}
      </select>
      <select 
        value={type} 
        onChange={(e) => { setType(e.target.value); setPage(1); }} 
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/50"
      >
        {TYPE_FILTERS.map((value) => (
          <option key={value || 'all'} value={value}>{value ? startCase(value) : 'All services'}</option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input 
            type="date" 
            value={fromDate} 
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }} 
            className="h-10 rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/50" 
          />
        </div>
        <span className="text-muted-foreground text-sm">to</span>
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input 
            type="date" 
            value={toDate} 
            onChange={(e) => { setToDate(e.target.value); setPage(1); }} 
            className="h-10 rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/50" 
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      <AdminPageHeader
        eyebrow="Operations"
        title="Transactions"
        description={`Inspect status, provider, references, and audit activity.`}
        actions={(
          <Button variant="outline" className="rounded-xl border-border bg-card/50 backdrop-blur-xl hover:bg-secondary" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            Refresh
          </Button>
        )}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative">
          <PremiumDataTable 
            data={rows} 
            columns={columns} 
            emptyMessage={loading ? 'Loading transactions...' : 'No transactions for this filter.'}
            serverPagination={true}
            totalItems={totalRows}
            currentPage={page}
            itemsPerPage={pageSize}
            onPageChange={setPage}
            isLoading={loading}
            headerActions={Filters}
            serverSearchTerm={query}
            onServerSearchChange={setQuery}
            searchPlaceholder="Search reference or user email..."
          />
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-3xl border border-border/50 bg-card/50 backdrop-blur-xl p-5 shadow-sm"
        >
          <h3 className="text-base font-semibold text-foreground">Bulk Reconcile Delivered</h3>
          <p className="mt-1 text-sm text-muted-foreground">Use only when customers confirmed delivery.</p>
          <div className="mt-4 space-y-3">
            <textarea
              value={bulkReferences}
              onChange={(e) => setBulkReferences(e.target.value)}
              placeholder={'DATA_ABC...\nDATA_DEF...'}
              className="min-h-[110px] w-full rounded-2xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand/50"
            />
            <Input
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              placeholder="Audit note (optional)"
              className="rounded-xl border-border bg-background/50"
            />
            <Button
              className="w-full rounded-xl"
              disabled={bulkBusy}
              onClick={async () => {
                const refs = bulkReferences.split('\n').map((item) => item.trim()).filter(Boolean);
                if (!refs.length) {
                  setBulkError('Please add at least one reference.');
                  setBulkSuccess('');
                  return;
                }
                setBulkBusy(true); setBulkError(''); setBulkSuccess('');
                try {
                  const result = await adminReconcileDeliveredBulk({ references: refs, note: bulkNote || undefined });
                  setBulkSuccess(`Processed ${result?.processed || refs.length}. Succeeded: ${result?.succeeded || 0}, Failed: ${result?.failed || 0}.`);
                  await load();
                } catch (err) {
                  setBulkError(err?.message || 'Bulk reconcile failed.');
                } finally {
                  setBulkBusy(false);
                }
              }}
            >
              {bulkBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Run Bulk Reconcile
            </Button>
          </div>
          {bulkError && <div className="mt-3 text-sm font-medium text-destructive">{bulkError}</div>}
          {bulkSuccess && <div className="mt-3 text-sm font-medium text-emerald-500">{bulkSuccess}</div>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-3xl border border-border/50 bg-card/50 backdrop-blur-xl p-5 shadow-sm"
        >
          <h3 className="text-base font-semibold text-foreground">Bulk Fail & Refund</h3>
          <p className="mt-1 text-sm text-muted-foreground">For provider-confirmed failures. Refunds users.</p>
          <div className="mt-4 space-y-3">
            <textarea
              value={bulkReferences} // using same input for simplicity or can create separate
              onChange={(e) => setBulkReferences(e.target.value)}
              placeholder={'DATA_ABC...\nDATA_DEF...'}
              className="min-h-[110px] w-full rounded-2xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand/50"
            />
            <Button
              variant="destructive"
              className="w-full rounded-xl"
              disabled={bulkFailBusy}
              onClick={async () => {
                const refs = bulkReferences.split('\n').map((item) => item.trim()).filter(Boolean);
                if (!refs.length) {
                  setBulkFailError('Please add at least one reference.');
                  setBulkFailSuccess('');
                  return;
                }
                setBulkFailBusy(true); setBulkFailError(''); setBulkFailSuccess('');
                try {
                  const result = await adminFailAndRefundPendingBulk({ references: refs, note: bulkNote || undefined });
                  let msg = `Processed ${result?.processed || refs.length}. Succeeded: ${result?.succeeded || 0}, Failed: ${result?.failed || 0}.`;
                  if (result?.failed > 0 && Array.isArray(result.results)) {
                    const errs = result.results.filter(r => !r.ok).map(r => `${r.reference}: ${r.detail}`).join(' | ');
                    msg += ` Errors: ${errs}`;
                  }
                  setBulkFailSuccess(msg);
                  await load();
                } catch (err) {
                  setBulkFailError(err?.message || 'Bulk fail + refund failed.');
                } finally {
                  setBulkFailBusy(false);
                }
              }}
            >
              {bulkFailBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Run Bulk Fail + Refund
            </Button>
          </div>
          {bulkFailError && <div className="mt-3 text-sm font-medium text-destructive">{bulkFailError}</div>}
          {bulkFailSuccess && <div className="mt-3 text-sm font-medium text-emerald-500">{bulkFailSuccess}</div>}
        </motion.div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/50 bg-card p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold tracking-tight">Transaction Details</h3>
                <Button variant="ghost" className="rounded-xl" onClick={() => setSelected(null)}>Close</Button>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(selected).map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-border/50 bg-secondary/50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">{startCase(key)}</div>
                    <div className="text-sm font-medium break-all">{value == null || value === '' ? '—' : String(value)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-border/50 bg-secondary/50 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground mb-3">Provider Raw Response</div>
                {selectedDetailsLoading ? (
                  <div className="flex items-center text-sm text-muted-foreground"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading payload...</div>
                ) : selectedDetailsError ? (
                  <div className="text-sm text-destructive font-medium">{selectedDetailsError}</div>
                ) : selectedDetails?.provider_payload_pretty ? (
                  <pre className="max-h-64 overflow-auto rounded-xl border border-border bg-background p-4 text-[13px] leading-relaxed font-mono text-muted-foreground">
                    {selectedDetails.provider_payload_pretty}
                  </pre>
                ) : (
                  <div className="text-sm text-muted-foreground">No provider payload captured.</div>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-border/50 bg-secondary/50 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground mb-3">Latest Audit</div>
                {selectedDetailsLoading ? (
                  <div className="text-sm text-muted-foreground flex items-center"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading audit...</div>
                ) : selectedDetails?.audit ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="text-sm"><span className="text-muted-foreground">Action:</span> {startCase(selectedDetails.audit.action || 'updated')}</div>
                    <div className="text-sm"><span className="text-muted-foreground">Time:</span> {formatDateTime(selectedDetails.audit.created_at)}</div>
                    <div className="text-sm md:col-span-2 break-all"><span className="text-muted-foreground">Admin:</span> {selectedDetails.audit.admin_email || '—'}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No audit entry recorded yet.</div>
                )}
              </div>

              <div className="mt-6 grid gap-4 border-t border-border/50 pt-6 md:grid-cols-[1fr_auto]">
                <div className="space-y-3">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Manual Override</div>
                  <Input
                    value={reconcileNote}
                    onChange={(e) => setReconcileNote(e.target.value)}
                    placeholder="Note (e.g. Delivered confirmed by customer)"
                    className="rounded-xl bg-background border-border/50"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    variant="secondary"
                    className="rounded-xl"
                    disabled={failRefundBusy || reconcileBusy || !selected?.reference || String(selected?.status || '').toLowerCase() !== 'pending'}
                    onClick={() => setFailRefundConfirmOpen(true)}
                  >
                    Fail & Refund
                  </Button>
                  <Button
                    variant="default"
                    className="rounded-xl"
                    disabled={reconcileBusy || failRefundBusy || !selected?.reference}
                    onClick={() => setReconcileConfirmOpen(true)}
                  >
                    Reconcile Delivered
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={reconcileConfirmOpen}
        title="Reconcile to success?"
        description="Mark transaction as delivered success. If refunded, wallet refund reversal will be attempted."
        confirmLabel="Yes, reconcile"
        busy={reconcileBusy}
        onCancel={() => setReconcileConfirmOpen(false)}
        onConfirm={async () => {
          if (!selected?.reference) return;
          setReconcileBusy(true);
          try {
            const result = await adminReconcileDelivered({ reference: selected.reference, note: reconcileNote || undefined });
            setSelected((prev) => (prev ? { ...prev, status: result.new_status } : prev));
            setReconcileConfirmOpen(false);
            await load();
          } catch (err) {
            console.error(err);
          } finally {
            setReconcileBusy(false);
          }
        }}
      />
      <ConfirmDialog
        open={failRefundConfirmOpen}
        title="Fail & refund?"
        description="For provider-confirmed failures. Credits user wallet and marks as refunded."
        confirmLabel="Yes, fail + refund"
        busy={failRefundBusy}
        onCancel={() => setFailRefundConfirmOpen(false)}
        onConfirm={async () => {
          if (!selected?.reference) return;
          setFailRefundBusy(true);
          try {
            const result = await adminFailAndRefundPending({ reference: selected.reference, note: reconcileNote || undefined });
            setSelected((prev) => (prev ? { ...prev, status: result.new_status } : prev));
            setFailRefundConfirmOpen(false);
            await load();
          } catch (err) {
            console.error(err);
          } finally {
            setFailRefundBusy(false);
          }
        }}
      />
    </div>
  );
}
