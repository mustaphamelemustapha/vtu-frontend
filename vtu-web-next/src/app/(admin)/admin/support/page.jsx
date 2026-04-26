'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { adminGetBroadcasts, adminGetReports, adminUpdateReport } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { startCase } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { FilterBar } from '@/components/admin/filter-bar';
import { AdminTable } from '@/components/admin/admin-table';
import { StatusBadge } from '@/components/admin/status-badge';

const STATUS_OPTIONS = ['', 'open', 'resolved', 'rejected'];

export default function AdminSupportPage() {
  const [reports, setReports] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsRes, broadcastsRes] = await Promise.allSettled([
        adminGetReports({ q: query, status: status || undefined, page: 1, page_size: 80 }),
        adminGetBroadcasts(),
      ]);

      if (reportsRes.status === 'fulfilled') setReports(Array.isArray(reportsRes.value?.items) ? reportsRes.value.items : []);
      if (broadcastsRes.status === 'fulfilled') setBroadcasts(Array.isArray(broadcastsRes.value) ? broadcastsRes.value : []);
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load().catch(() => setLoading(false));
    }, 220);
    return () => clearTimeout(timer);
  }, [load]);

  const markStatus = useCallback(async (report, nextStatus) => {
    setBusyId(report.id);
    try {
      await adminUpdateReport(report.id, { status: nextStatus });
      await load();
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const columns = useMemo(() => [
    { key: 'user_email', label: 'User' },
    { key: 'transaction_reference', label: 'Subject', render: (row) => row.transaction_reference || `Issue #${row.id}` },
    { key: 'reason', label: 'Message', render: (row) => <span className="line-clamp-2">{row.reason || 'No message'}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created_at', label: 'Created', render: (row) => formatDateTime(row.created_at) },
    {
      key: 'actions',
      label: 'Action',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Button variant="secondary" size="sm" disabled={busyId === row.id} onClick={() => markStatus(row, 'open')}>Open</Button>
          <Button variant="secondary" size="sm" disabled={busyId === row.id} onClick={() => markStatus(row, 'resolved')}>Resolve</Button>
          <Button variant="secondary" size="sm" disabled={busyId === row.id} onClick={() => markStatus(row, 'rejected')}>Reject</Button>
        </div>
      ),
    },
  ], [busyId, markStatus]);

  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader
        title="Support inbox"
        description="Handle reported issues, complaints, and admin communication queue."
        actions={(
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </Button>
        )}
      />

      <FilterBar searchValue={query} onSearchChange={setQuery} searchPlaceholder="Search by reference, reason, or user email">
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-2xl border border-border bg-card px-3 text-sm text-foreground">
          {STATUS_OPTIONS.map((value) => (
            <option key={value || 'all'} value={value}>{value ? startCase(value) : 'All statuses'}</option>
          ))}
        </select>
      </FilterBar>

      <AdminTable columns={columns} rows={reports} empty={loading ? 'Loading support cases...' : 'No support issues found.'} />

      <Card>
        <CardHeader>
          <CardTitle>Broadcast announcements</CardTitle>
          <CardDescription>Messages sent to users from admin notification controls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {broadcasts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No broadcast messages created yet.</div>
          ) : broadcasts.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-secondary p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-foreground">{item.title || 'Broadcast'}</div>
                <StatusBadge status={item.is_active ? 'active' : 'inactive'} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.message || ''}</p>
              <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.created_at)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
