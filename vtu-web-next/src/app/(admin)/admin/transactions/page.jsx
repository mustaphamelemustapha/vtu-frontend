'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { adminGetTransactions } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { startCase } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { FilterBar } from '@/components/admin/filter-bar';
import { AdminTable } from '@/components/admin/admin-table';
import { StatusBadge } from '@/components/admin/status-badge';

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
        <Button variant="secondary" size="sm" onClick={() => setSelected(row)}>
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
            <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>Close</Button>
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
            Retry/check status and receipt regeneration are backend-dependent. This page shows details safely without destructive actions.
          </div>
        </div>
      ) : null}
    </div>
  );
}
