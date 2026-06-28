'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, PauseCircle, PlayCircle, RefreshCw, Wallet, X, Search } from 'lucide-react';
import {
  adminActivateUser,
  adminDeleteUser,
  adminGetUserDetails,
  adminGetUsers,
  adminSuspendUser,
  adminUpdateUserRole,
} from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { PremiumDataTable } from '@/components/admin/premium-data-table';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [busy, setBusy] = useState(false);

  const activeRequestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const loadUsers = useCallback(async () => {
    const requestId = Date.now();
    activeRequestRef.current = requestId;
    setLoading(true);
    try {
      const response = await adminGetUsers({ q: debouncedQuery || undefined, page, page_size: pageSize });
      if (activeRequestRef.current !== requestId) return;
      setUsers(Array.isArray(response?.items) ? response.items : []);
      setTotalRows(Number(response?.total || 0));
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [debouncedQuery, page]);

  useEffect(() => {
    loadUsers().catch(() => setLoading(false));
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
      } else if (confirmAction.type === 'delete') {
        await adminDeleteUser(confirmAction.user.id);
      } else if (confirmAction.type === 'upgrade_reseller' || confirmAction.type === 'downgrade_user') {
        await adminUpdateUserRole({ 
          user_id: confirmAction.user.id, 
          role: confirmAction.type === 'upgrade_reseller' ? 'reseller' : 'user' 
        });
      } else if (confirmAction.type === 'approve_developer') {
        const { adminApproveDeveloper } = await import('@/lib/api');
        await adminApproveDeveloper(confirmAction.user.id);
      } else if (confirmAction.type === 'suspend_developer') {
        const { adminSuspendDeveloper } = await import('@/lib/api');
        await adminSuspendDeveloper(confirmAction.user.id);
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
    { key: 'full_name', label: 'Name', sortable: false, render: (row) => <span className="font-medium">{row.full_name}</span> },
    { key: 'email', label: 'Email', sortable: false },
    { key: 'phone_number', label: 'Phone', sortable: false },
    {
      key: 'wallet_balance',
      label: 'Wallet balance',
      sortable: false,
      render: (row) => <span className="font-semibold text-brand">{selectedDetails?.user?.id === row.id ? `₦${formatMoney(selectedDetails?.wallet?.balance || 0)}` : 'Open user'}</span>,
    },
    {
      key: 'referral_count',
      label: 'Referrals',
      sortable: false,
      render: (row) => <span className="text-muted-foreground">{row.referral_count || 0} referred</span>,
    },
    { key: 'is_active', label: 'Status', sortable: false, render: (row) => <StatusBadge status={row.is_active ? 'active' : 'suspended'} /> },
    { key: 'created_at', label: 'Joined', sortable: false, render: (row) => <span className="text-muted-foreground">{formatDateTime(row.created_at)}</span> },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="h-8 rounded-xl" onClick={() => openUser(row)}>
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 rounded-xl"
            onClick={() => setConfirmAction({ type: row.is_active ? 'suspend' : 'activate', user: row })}
          >
            {row.is_active ? <PauseCircle className="mr-1.5 h-3.5 w-3.5" /> : <PlayCircle className="mr-1.5 h-3.5 w-3.5" />}
            {row.is_active ? 'Suspend' : 'Activate'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmAction({ type: 'delete', user: row })}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ], [openUser, selectedDetails?.user?.id, selectedDetails?.wallet?.balance]);

  return (
    <div className="space-y-6 pb-8">
      <AdminPageHeader
        eyebrow="Accounts"
        title="Users Management"
        description="Review accounts, manage permissions, and track user activity."
        actions={(
          <Button variant="outline" className="rounded-xl border-border bg-card/50 backdrop-blur-xl hover:bg-secondary" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            Refresh users
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
            data={users} 
            columns={columns} 
            emptyMessage={loading ? 'Loading users...' : 'No users found.'}
            serverPagination={true}
            totalItems={totalRows}
            currentPage={page}
            itemsPerPage={pageSize}
            onPageChange={setPage}
            isLoading={loading}
            serverSearchTerm={query}
            onServerSearchChange={setQuery}
            searchPlaceholder="Search by name, email, or phone"
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/50 bg-card p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">User Details</h3>
                  <p className="text-sm text-muted-foreground">Detailed view for {selectedUser.full_name}</p>
                </div>
                <Button variant="ghost" className="rounded-xl" onClick={() => setSelectedUser(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border/50 bg-secondary/30 p-5">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{selectedUser.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.phone_number}</p>
                  </div>
                  <div className="text-left sm:text-right space-y-3 w-full sm:w-auto">
                    <div><StatusBadge status={selectedUser.is_active ? 'active' : 'suspended'} /></div>
                    <div className="pt-3 border-t border-border/50 flex flex-col gap-3 items-start sm:items-end w-full">
                      {String(selectedDetails?.user?.role || selectedUser?.role).toLowerCase() !== 'reseller' ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-brand text-white w-full sm:w-auto rounded-xl"
                          onClick={() => setConfirmAction({ type: 'upgrade_reseller', user: selectedUser })}
                        >
                          Upgrade to Agent
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full sm:w-auto rounded-xl"
                          onClick={() => setConfirmAction({ type: 'downgrade_user', user: selectedUser })}
                        >
                          Downgrade to User
                        </Button>
                      )}

                      <div className="w-full flex items-center justify-start sm:justify-end gap-3 mt-1">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-muted-foreground block leading-none uppercase tracking-wider">API Access</span>
                          <span className="font-semibold text-foreground uppercase text-xs tracking-wider leading-none mt-1 block">
                            {selectedDetails?.user?.developer_status || selectedUser?.developer_status || 'none'}
                          </span>
                        </div>
                        {(selectedDetails?.user?.developer_status || selectedUser?.developer_status) === 'applied' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-green-600/30 text-green-500 hover:bg-green-500/10 rounded-xl h-8"
                            onClick={() => setConfirmAction({ type: 'approve_developer', user: selectedUser })}
                          >
                            Approve API
                          </Button>
                        )}
                        {(selectedDetails?.user?.developer_status || selectedUser?.developer_status) === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-red-600/30 text-red-500 hover:bg-red-500/10 rounded-xl h-8"
                            onClick={() => setConfirmAction({ type: 'suspend_developer', user: selectedUser })}
                          >
                            Suspend API
                          </Button>
                        )}
                        {((selectedDetails?.user?.developer_status || selectedUser?.developer_status) === 'none' || (selectedDetails?.user?.developer_status || selectedUser?.developer_status) === 'suspended') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-green-600/30 text-green-500 hover:bg-green-500/10 rounded-xl h-8"
                            onClick={() => setConfirmAction({ type: 'approve_developer', user: selectedUser })}
                          >
                            Enable API
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {!selectedDetails ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground rounded-2xl border border-border/50 bg-secondary/30">
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Loading complete profile...
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        { label: 'Wallet Balance', value: `₦${formatMoney(selectedDetails?.wallet?.balance || 0)}` },
                        { label: 'Referral Code', value: selectedDetails?.user?.referral_code || 'N/A', mono: true },
                        { label: 'Total Transactions', value: (selectedDetails?.recent_transactions || []).length },
                        { label: 'Total Referred', value: (selectedDetails?.referred_users || []).length },
                      ].map((stat, i) => (
                        <div key={i} className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
                          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">{stat.label}</div>
                          <div className={`text-2xl font-semibold tracking-tight text-foreground ${stat.mono ? 'font-mono' : ''}`}>{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {selectedDetails?.recent_transactions?.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Transactions</h4>
                        <div className="rounded-2xl border border-border/50 bg-background overflow-hidden">
                          {selectedDetails.recent_transactions.slice(0, 10).map((tx, idx) => (
                            <div key={`${tx.reference}-${tx.id}`} className={`flex items-center justify-between gap-4 p-4 ${idx !== 0 ? 'border-t border-border/50' : ''}`}>
                              <div>
                                <div className="font-mono text-sm font-medium text-foreground">{tx.reference}</div>
                                <div className="text-xs text-muted-foreground capitalize mt-1">{tx.tx_type} • {tx.network || 'Wallet'}</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">{formatDateTime(tx.created_at)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-foreground">₦{formatMoney(tx.amount || 0)}</div>
                                <div className="mt-1.5"><StatusBadge status={tx.status} /></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDetails?.referred_users?.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Referred Users</h4>
                        <div className="rounded-2xl border border-border/50 bg-background overflow-hidden">
                          {selectedDetails.referred_users.map((ref, idx) => (
                            <div key={ref.id} className={`flex items-center justify-between gap-4 p-4 ${idx !== 0 ? 'border-t border-border/50' : ''}`}>
                              <div>
                                <div className="text-sm font-medium text-foreground">{ref.referred_name || 'No Name'}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{ref.referred_email}</div>
                                {ref.referred_phone && <div className="text-xs text-muted-foreground mt-0.5">{ref.referred_phone}</div>}
                                <div className="text-[11px] text-muted-foreground mt-1">Joined {formatDateTime(ref.created_at)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-foreground">₦{formatMoney(ref.reward_amount || 0)}</div>
                                <div className="mt-1.5">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                                    ref.status === 'rewarded' ? 'bg-green-500/10 text-green-500' :
                                    ref.status === 'qualified' ? 'bg-blue-500/10 text-blue-500' :
                                    'bg-amber-500/10 text-amber-500'
                                  }`}>
                                    {ref.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={`${
          confirmAction?.type === 'suspend' ? 'Suspend' : 
          confirmAction?.type === 'delete' ? 'Permanently Delete' : 
          confirmAction?.type === 'approve_developer' ? 'Approve Developer API' :
          confirmAction?.type === 'suspend_developer' ? 'Suspend Developer API' :
          'Activate'
        } User Account`}
        description={
          confirmAction?.type === 'delete'
            ? `Are you absolutely sure you want to delete ${confirmAction?.user?.email}? This will suffix their credentials and they will no longer be able to log in. This action is irreversible.`
            : confirmAction?.type === 'approve_developer'
            ? `You are about to approve developer API key access for ${confirmAction?.user?.email}. They will receive reseller privileges.`
            : confirmAction?.type === 'suspend_developer'
            ? `You are about to suspend developer API access for ${confirmAction?.user?.email}. This will immediately revoke their active integration keys.`
            : `You are about to ${confirmAction?.type || 'update'} ${confirmAction?.user?.email || 'this account'}. This action is logged for audit.`
        }
        confirmLabel={
          confirmAction?.type === 'suspend'
            ? 'Suspend user'
            : confirmAction?.type === 'delete'
            ? 'Yes, delete user'
            : confirmAction?.type === 'approve_developer'
            ? 'Approve API'
            : confirmAction?.type === 'suspend_developer'
            ? 'Suspend API'
            : 'Activate user'
        }
        variant={confirmAction?.type === 'delete' || confirmAction?.type === 'suspend_developer' ? 'destructive' : 'default'}
        busy={busy}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runAction}
      />
    </div>
  );
}
