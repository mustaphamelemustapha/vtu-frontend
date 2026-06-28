'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ADMIN_NOTES } from '@/lib/admin-placeholders';
import { formatDateTime } from '@/lib/format';
import { adminGetReferrals } from '@/lib/api';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { PremiumDataTable } from '@/components/admin/premium-data-table';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function AdminReferralsPage() {
  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [loading, setLoading] = useState(true);
  const activeRequestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = Date.now();
    activeRequestRef.current = requestId;
    setLoading(true);
    try {
      const response = await adminGetReferrals({ page, page_size: pageSize });
      if (activeRequestRef.current !== requestId) return;
      
      setRows(Array.isArray(response?.items) ? response.items : []);
      setTotalItems(Number(response?.total || 0));
    } catch {
      if (activeRequestRef.current !== requestId) return;
      setRows([]);
      setTotalItems(0);
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { key: 'referral_code', label: 'Referral Code', sortable: false, render: (row) => <span className="font-mono text-muted-foreground">{row.referrer?.referral_code || 'N/A'}</span> },
    { key: 'referrer', label: 'Referrer', sortable: false, render: (row) => <span className="font-medium text-foreground">{row.referrer?.email || 'Unknown'}</span> },
    { key: 'referred_user', label: 'Referred User', sortable: false, render: (row) => <span className="font-medium">{row.referred_user?.email || 'Unknown'}</span> },
    { key: 'status', label: 'Reward Status', sortable: false, render: (row) => <StatusBadge status={row.reward_status} /> },
    { key: 'rewarded_at', label: 'Rewarded Date', sortable: false, render: (row) => <span className="text-muted-foreground">{formatDateTime(row.created_at)}</span> },
  ];

  return (
    <div className="space-y-6 pb-8 relative">
      <AdminPageHeader
        eyebrow="Growth"
        title="Referral Management"
        description="Audit referral rewards, qualifying deposits, and duplicate reward protection status."
        actions={(
          <Button variant="outline" className="rounded-xl border-border bg-card/50 backdrop-blur-xl hover:bg-secondary" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            Refresh Data
          </Button>
        )}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="rounded-3xl border border-amber-300/80 bg-amber-500/10 backdrop-blur-sm shadow-sm overflow-hidden mb-6">
          <CardContent className="flex items-start gap-4 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-500/20 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-500">Referral System Notes</h4>
              <p className="mt-1 text-sm leading-relaxed text-amber-700/80 dark:text-amber-500/80">
                {ADMIN_NOTES.referrals}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <PremiumDataTable 
          data={rows} 
          columns={columns} 
          emptyMessage={loading ? "Loading referrals..." : "No referral rows available yet."}
          hideSearch={true}
          serverPagination={true}
          totalItems={totalItems}
          currentPage={page}
          itemsPerPage={pageSize}
          onPageChange={setPage}
          isLoading={loading}
        />
      </motion.div>
    </div>
  );
}
