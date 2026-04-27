'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { adminGetDataPlans, adminGetPricingRules, adminSyncDataPlans, adminUpdateDataPlan } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminTable } from '@/components/admin/admin-table';
import { FilterBar } from '@/components/admin/filter-bar';
import { StatusBadge } from '@/components/admin/status-badge';

const NETWORKS = ['', 'mtn', 'airtel', 'glo', '9mobile'];

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const list = value.data ?? value.items ?? value.plans;
    return Array.isArray(list) ? list : [];
  }
  return [];
}

export default function AdminDataPlansPage() {
  const [plans, setPlans] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [activeNetwork, setActiveNetwork] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, pricingRes] = await Promise.allSettled([
        adminGetDataPlans(),
        adminGetPricingRules(),
      ]);
      if (plansRes.status === 'fulfilled') setPlans(asList(plansRes.value));
      if (pricingRes.status === 'fulfilled') setPricing(Array.isArray(pricingRes.value?.items) ? pricingRes.value.items : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return plans.filter((plan) => {
      const network = String(plan?.network || '').toLowerCase();
      if (activeNetwork && network !== activeNetwork) return false;
      if (!needle) return true;
      return [plan?.plan_name, plan?.plan_code, plan?.data_size, plan?.validity]
        .map((item) => String(item || '').toLowerCase())
        .some((text) => text.includes(needle));
    });
  }, [activeNetwork, plans, query]);

  const byNetwork = useMemo(
    () => plans.reduce((acc, item) => {
      const key = String(item?.network || 'other').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    [plans]
  );

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await adminSyncDataPlans();
      await load();
    } finally {
      setSyncing(false);
    }
  }, [load]);

  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader
        title="Data plans management"
        description="Filter network plans, inspect provider metadata, and sync plan catalog from backend provider rails."
        actions={(
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={syncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {syncing ? 'Syncing...' : 'Sync plans from provider'}
          </Button>
        )}
      />

      <FilterBar searchValue={query} onSearchChange={setQuery} searchPlaceholder="Search by plan name or plan code">
        <select
          value={activeNetwork}
          onChange={(event) => setActiveNetwork(event.target.value)}
          className="h-11 rounded-2xl border border-border bg-card px-3 text-sm text-foreground"
        >
          {NETWORKS.map((network) => (
            <option key={network || 'all'} value={network}>{network ? network.toUpperCase() : 'All networks'}</option>
          ))}
        </select>
      </FilterBar>

      <div className="grid gap-4 md:grid-cols-4">
        {['mtn', 'airtel', 'glo', '9mobile'].map((network) => (
          <Card key={network}>
            <CardContent className="p-4">
              <div className="axis-label">{network.toUpperCase()}</div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{byNetwork[network] || 0}</div>
              <div className="text-xs text-muted-foreground">Plans available</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminTable
        columns={[
          { key: 'network', label: 'Network', render: (row) => String(row.network || 'other').toUpperCase() },
          { key: 'plan_name', label: 'Plan size/name', render: (row) => row.plan_name || row.data_size || '—' },
          { key: 'validity', label: 'Validity', render: (row) => row.validity || '—' },
          { key: 'base_price', label: 'Cost price', render: (row) => `₦${formatMoney(row.base_price ?? row.price ?? 0)}` },
          { key: 'price', label: 'Selling price', render: (row) => `₦${formatMoney(row.price ?? 0)}` },
          { key: 'plan_code', label: 'Provider code/id', render: (row) => <span className="font-mono text-xs">{row.plan_code || '—'}</span> },
          { key: 'enabled', label: 'State', render: (row) => <StatusBadge status={row.is_active === false ? 'disabled' : 'enabled'} /> },
          { key: 'updated_at', label: 'Last updated', render: (row) => formatDateTime(row.updated_at || row.created_at) },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex flex-wrap gap-1.5">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  disabled={toggling === row.id}
                  onClick={async () => {
                    setToggling(row.id);
                    try {
                      await adminUpdateDataPlan(row.id, { is_active: row.is_active === false ? true : false });
                      await load();
                    } catch (err) {
                      alert(err.message || 'Failed to toggle data plan');
                    } finally {
                      setToggling(null);
                    }
                  }}
                >
                  {row.is_active === false ? 'Enable' : 'Disable'}
                </Button>
                <Button variant="secondary" size="sm" disabled>Edit price</Button>
                <Button variant="secondary" size="sm" title={JSON.stringify(row)}>
                  <Database className="h-3.5 w-3.5" />
                  Metadata
                </Button>
              </div>
            ),
          },
        ]}
        rows={filtered}
        empty={loading ? 'Loading data plans...' : 'No plans available for the selected filter.'}
      />

      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Pricing rules loaded: <span className="font-medium text-foreground">{pricing.length}</span>. Plan enable/disable and direct price editing need dedicated backend endpoints before activation.
        </CardContent>
      </Card>
    </div>
  );
}
