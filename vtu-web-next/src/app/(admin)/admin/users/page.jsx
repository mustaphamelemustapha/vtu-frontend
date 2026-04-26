'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, PauseCircle, PlayCircle, RefreshCw, Wallet } from 'lucide-react';
import {
  adminActivateUser,
  adminGetUserDetails,
  adminGetUsers,
  adminSuspendUser,
} from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { FilterBar } from '@/components/admin/filter-bar';
import { AdminTable } from '@/components/admin/admin-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { EmptyState } from '@/components/admin/empty-state';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminGetUsers({ q: query, page: 1, page_size: 60 });
      setUsers(Array.isArray(response?.items) ? response.items : []);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers().catch(() => setLoading(false));
    }, 220);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const openUser = useCallback(async (user) => {
    setSelectedUser(user);
    setSelectedDetails(null);
    try {
      const details = await adminGetUserDetails(user.id);
      setSelectedDetails(details);
    } catch {
      setSelectedDetails({ user, wallet: { balance: 0 }, recent_transactions: [] });
    }
  }, []);

  const runAction = useCallback(async () => {
    if (!confirmAction) return;
    setBusy(true);
    try {
      if (confirmAction.type === 'suspend') {
        await adminSuspendUser(confirmAction.user.id);
      } else {
        await adminActivateUser(confirmAction.user.id);
      }
      await loadUsers();
      if (selectedUser?.id === confirmAction.user.id) {
        const details = await adminGetUserDetails(confirmAction.user.id);
        setSelectedDetails(details);
      }
      setConfirmAction(null);
    } finally {
      setBusy(false);
    }
  }, [confirmAction, loadUsers, selectedUser?.id]);

  const columns = useMemo(() => [
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone_number', label: 'Phone' },
    {
      key: 'wallet_balance',
      label: 'Wallet balance',
      render: (row) => <span className="font-medium">{selectedDetails?.user?.id === row.id ? `₦${formatMoney(selectedDetails?.wallet?.balance || 0)}` : 'Open user'}</span>,
    },
    { key: 'is_verified', label: 'Verification', render: (row) => <StatusBadge status={row.is_verified ? 'verified' : 'pending'} /> },
    { key: 'is_active', label: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'suspended'} /> },
    { key: 'created_at', label: 'Joined', render: (row) => <span className="text-muted-foreground">{formatDateTime(row.created_at)}</span> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => openUser(row)}>
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="border-border"
            onClick={() => setConfirmAction({ type: row.is_active ? 'suspend' : 'activate', user: row })}
          >
            {row.is_active ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
            {row.is_active ? 'Suspend' : 'Activate'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openUser(row)}>
            <Wallet className="h-3.5 w-3.5" />
            Wallet ledger
          </Button>
        </div>
      ),
    },
  ], [openUser, selectedDetails?.user?.id, selectedDetails?.wallet?.balance]);

  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader
        title="Users management"
        description="Review accounts, verification status, and suspend or re-enable users with confirmation."
        actions={(
          <Button variant="secondary" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh users
          </Button>
        )}
      />

      <FilterBar
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by name, email, or phone"
      />

      <AdminTable columns={columns} rows={users} empty={loading ? 'Loading users...' : 'No users found.'} />

      {selectedUser ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">{selectedUser.full_name}</h3>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
              <StatusBadge status={selectedUser.is_active ? 'active' : 'suspended'} />
            </div>

            {!selectedDetails ? (
              <div className="text-sm text-muted-foreground">Loading user details...</div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-secondary p-3">
                  <div className="axis-label">Wallet balance</div>
                  <div className="mt-2 text-xl font-semibold text-foreground">₦{formatMoney(selectedDetails?.wallet?.balance || 0)}</div>
                </div>
                <div className="rounded-2xl border border-border bg-secondary p-3">
                  <div className="axis-label">Recent transactions</div>
                  <div className="mt-2 text-xl font-semibold text-foreground">{(selectedDetails?.recent_transactions || []).length}</div>
                </div>
              </div>
            )}

            {selectedDetails?.recent_transactions?.length ? (
              <div className="space-y-2 rounded-2xl border border-border bg-secondary p-3">
                {selectedDetails.recent_transactions.slice(0, 5).map((tx) => (
                  <div key={`${tx.reference}-${tx.id}`} className="flex items-center justify-between gap-3 border-b border-border/70 pb-2 last:border-0 last:pb-0">
                    <div className="text-sm">
                      <div className="font-medium text-foreground">{tx.reference}</div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">₦{formatMoney(tx.amount || 0)}</div>
                      <StatusBadge status={tx.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <EmptyState title="Select a user" description="Use View action to inspect wallet and recent transactions." />
      )}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={`${confirmAction?.type === 'suspend' ? 'Suspend' : 'Activate'} user account`}
        description={`You are about to ${confirmAction?.type || 'update'} ${confirmAction?.user?.email || 'this account'}. This action is logged for audit.`}
        confirmLabel={confirmAction?.type === 'suspend' ? 'Suspend user' : 'Activate user'}
        busy={busy}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runAction}
      />
    </div>
  );
}
