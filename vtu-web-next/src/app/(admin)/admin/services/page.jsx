'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Cable, GraduationCap, RefreshCw, Smartphone, Wifi, Zap } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { filterAllowedAmigoPlans } from '@/lib/amigo-plan-policy';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { PremiumDataTable } from '@/components/admin/premium-data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { motion } from 'framer-motion';

function isEnabled(list) {
  return Array.isArray(list) && list.length > 0;
}

export default function AdminServicesPage() {
  const [catalog, setCatalog] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catalogRes, plansRes] = await Promise.allSettled([
        apiFetch('/services/catalog'),
        apiFetch('/data/plans'),
      ]);

      if (catalogRes.status === 'fulfilled') setCatalog(catalogRes.value || {});
      if (plansRes.status === 'fulfilled') {
        const source = Array.isArray(plansRes.value)
          ? plansRes.value
          : plansRes.value?.data ?? plansRes.value?.items ?? plansRes.value?.plans ?? [];
        const next = filterAllowedAmigoPlans(Array.isArray(source) ? source : []);
        setPlans(next);
        setLastSync(new Date().toISOString());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const rows = useMemo(() => {
    const plansByNetwork = Array.isArray(plans)
      ? plans.reduce((acc, item) => {
          const key = String(item?.network || '').toLowerCase() || 'other';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      : {};

    return [
      {
        id: 'data',
        icon: Wifi,
        service: 'Data',
        enabled: isEnabled(plans),
        providerStatus: Object.keys(plansByNetwork).length ? 'connected' : 'degraded',
        failureRate: Object.keys(plansByNetwork).length ? 'Low' : 'Unknown',
        lastSync,
      },
      {
        id: 'airtime',
        icon: Smartphone,
        service: 'Airtime',
        enabled: isEnabled(catalog?.airtime_networks),
        providerStatus: isEnabled(catalog?.airtime_networks) ? 'connected' : 'degraded',
        failureRate: 'Low',
        lastSync,
      },
      {
        id: 'electricity',
        icon: Zap,
        service: 'Electricity',
        enabled: isEnabled(catalog?.electricity_discos),
        providerStatus: isEnabled(catalog?.electricity_discos) ? 'connected' : 'degraded',
        failureRate: 'Medium',
        lastSync,
      },
      {
        id: 'cable',
        icon: Cable,
        service: 'Cable TV',
        enabled: isEnabled(catalog?.cable_providers),
        providerStatus: isEnabled(catalog?.cable_providers) ? 'connected' : 'degraded',
        failureRate: 'Low',
        lastSync,
      },
      {
        id: 'exam',
        icon: GraduationCap,
        service: 'Exam PINs',
        enabled: isEnabled(catalog?.exam_types),
        providerStatus: isEnabled(catalog?.exam_types) ? 'connected' : 'degraded',
        failureRate: 'Low',
        lastSync,
      },
    ];
  }, [catalog?.airtime_networks, catalog?.cable_providers, catalog?.electricity_discos, catalog?.exam_types, lastSync, plans]);

  const columns = [
    {
      key: 'service',
      label: 'Service',
      sortable: false,
      render: (row) => {
        const Icon = row.icon;
        return (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/50 bg-secondary/50 text-brand">
              <Icon className="h-5 w-5" />
            </span>
            <span className="font-semibold text-foreground tracking-tight">{row.service}</span>
          </div>
        );
      },
    },
    { key: 'enabled', label: 'Enabled/Disabled', sortable: false, render: (row) => <StatusBadge status={row.enabled ? 'enabled' : 'disabled'} /> },
    { key: 'providerStatus', label: 'Provider Connection', sortable: false, render: (row) => <StatusBadge status={row.providerStatus} /> },
    { key: 'lastSync', label: 'Last Sync', sortable: false, render: (row) => <span className="text-muted-foreground">{formatDateTime(row.lastSync)}</span> },
    { key: 'failureRate', label: 'Failure Rate', sortable: false, render: (row) => <span className="font-medium">{row.failureRate}</span> },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: () => (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="rounded-xl h-8" disabled>Enable/Disable</Button>
          <Button variant="secondary" size="sm" className="rounded-xl h-8" disabled>Diagnostics</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <AdminPageHeader
        eyebrow="Integrations"
        title="Services Management"
        description="Control service states, provider health visibility, and operational sync status."
        actions={(
          <Button variant="outline" className="rounded-xl border-border bg-card/50 backdrop-blur-xl hover:bg-secondary" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            Refresh Services
          </Button>
        )}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PremiumDataTable 
          data={rows} 
          columns={columns} 
          emptyMessage={loading ? 'Loading service statuses...' : 'No services available.'}
          serverPagination={false}
          hideSearch={true}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="rounded-3xl border border-amber-300/80 bg-amber-500/10 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardContent className="flex items-start gap-4 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/50 bg-amber-500/20 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-500">Service Controls Locked</h4>
              <p className="mt-1 text-sm leading-relaxed text-amber-700/80 dark:text-amber-500/80">
                Service toggles and hard provider failover controls are intentionally locked in UI until dedicated backend endpoints are exposed.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
