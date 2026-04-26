'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Wallet2 } from 'lucide-react';
import { adminGetTransactions, adminGetUserDetails, adminGetUsers } from '@/lib/api';
import { ADMIN_NOTES } from '@/lib/admin-placeholders';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminTable } from '@/components/admin/admin-table';
import { StatusBadge } from '@/components/admin/status-badge';

export default function AdminWalletsPage() {
  const [walletRows, setWalletRows] = useState([]);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const users = await adminGetUsers({ page: 1, page_size: 18 });
      const baseUsers = Array.isArray(users?.items) ? users.items : [];

      const detailsSettled = await Promise.allSettled(baseUsers.map((user) => adminGetUserDetails(user.id)));
      const balances = baseUsers.map((user, index) => {
        const detail = detailsSettled[index];
        const walletBalance = detail?.status === 'fulfilled' ? Number(detail.value?.wallet?.balance || 0) : 0;
        return {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          balance: walletBalance,
          status: user.is_active ? 'active' : 'suspended',
          updated_at: detail?.status === 'fulfilled' ? detail.value?.wallet?.updated_at : null,
        };
      });
      setWalletRows(balances);

      const ledger = await adminGetTransactions({ page: 1, page_size: 60 });
      setLedgerRows(Array.isArray(ledger?.items) ? ledger.items : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const totalBalance = useMemo(() => walletRows.reduce((sum, row) => sum + Number(row.balance || 0), 0), [walletRows]);

  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader
        title="Wallets and ledger"
        description="Monitor user balances, credit/debit events, funding inflow, and audit-sensitive wallet operations."
        actions={(
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </Button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="axis-label">Tracked wallets</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{walletRows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="axis-label">Aggregate balance</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">₦{formatMoney(totalBalance)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="axis-label">Ledger records</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{ledgerRows.length}</div>
          </CardContent>
        </Card>
      </div>

      <AdminTable
        columns={[
          { key: 'full_name', label: 'User' },
          { key: 'email', label: 'Email' },
          { key: 'phone_number', label: 'Phone' },
          { key: 'balance', label: 'Wallet balance', render: (row) => `₦${formatMoney(row.balance || 0)}` },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'updated_at', label: 'Updated', render: (row) => formatDateTime(row.updated_at) },
        ]}
        rows={walletRows}
        empty={loading ? 'Loading wallets...' : 'No wallet rows available.'}
      />

      <Card>
        <CardHeader>
          <CardTitle>Ledger events</CardTitle>
          <CardDescription>Funding events, service debits, and referral rewards from transaction rails.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ledgerRows.slice(0, 18).map((row) => (
            <div key={row.reference || row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary p-3">
              <div>
                <div className="text-sm font-medium text-foreground">{row.reference}</div>
                <div className="text-xs text-muted-foreground">{row.user_email} • {formatDateTime(row.created_at)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-foreground">₦{formatMoney(row.amount || 0)}</div>
                <StatusBadge status={row.status} />
              </div>
            </div>
          ))}
          {!ledgerRows.length && !loading ? <div className="text-sm text-muted-foreground">No ledger rows available.</div> : null}
        </CardContent>
      </Card>

      <Card className="border-amber-300/80 bg-amber-50/60 dark:border-amber-400/30 dark:bg-amber-500/10">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300 bg-card text-amber-700 dark:border-amber-400/30 dark:text-amber-200">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground">Manual wallet adjustment (protected)</div>
              <p className="text-sm text-muted-foreground">{ADMIN_NOTES.walletAdjustments}</p>
              <Button variant="secondary" disabled>
                <Wallet2 className="h-4 w-4" />
                Adjustment locked
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
