'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw, X } from 'lucide-react';
import { adminGetDataPlans, adminGetPricingRules, adminSyncDataPlans, adminUpdateDataPlan } from '@/lib/api';
import { filterAllowedAmigoPlans } from '@/lib/amigo-plan-policy';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminTable } from '@/components/admin/admin-table';
import { FilterBar } from '@/components/admin/filter-bar';
import { StatusBadge } from '@/components/admin/status-badge';
import { Input } from '@/components/ui/input';

const NETWORKS = ['', 'mtn', 'airtel', 'glo', '9mobile'];

function asList(value) {
  if (Array.isArray(value)) return filterAllowedAmigoPlans(value);
  if (value && typeof value === 'object') {
    const list = value.data ?? value.items ?? value.plans;
    return Array.isArray(list) ? filterAllowedAmigoPlans(list) : [];
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

  // Modal State
  const [editingPriceFor, setEditingPriceFor] = useState(null);
  const [displayPriceInput, setDisplayPriceInput] = useState('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

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

  const calculateEffectivePrice = (plan) => {
    if (plan.display_price !== null && plan.display_price !== undefined) {
      return plan.display_price;
    }
    const rule = pricing.find(r => r.network === plan.network && r.role === 'user');
    const margin = rule ? parseFloat(rule.margin || 0) : 0;
    const marginType = rule?.margin_type || 'fixed';
    const base = parseFloat(plan.base_price || 0);
    if (marginType === 'percentage') {
      return base + (base * margin / 100);
    }
    return base + margin;
  };

  const handleOpenPriceModal = (plan) => {
    setEditingPriceFor(plan);
    setDisplayPriceInput(plan.display_price !== null ? String(plan.display_price) : '');
  };

  const handleSavePrice = async () => {
    if (!editingPriceFor) return;
    setIsSavingPrice(true);
    try {
      const payload = {};
      const val = displayPriceInput.trim();
      if (val === '') {
        payload.clear_display_price = true;
      } else {
        payload.display_price = parseFloat(val);
        if (isNaN(payload.display_price) || payload.display_price < 0) {
          throw new Error('Invalid price value');
        }
      }
      await adminUpdateDataPlan(editingPriceFor.id, payload);
      await load();
      setEditingPriceFor(null);
    } catch (err) {
      alert(err.message || 'Failed to update price');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleDisableAll = async () => {
    const activePlans = plans.filter((p) => p.is_active !== false);
    if (!activePlans.length) {
      alert('All plans are already disabled.');
      return;
    }
    if (!confirm(`Are you sure you want to disable all ${activePlans.length} active data plans?`)) return;
    
    setToggling('all');
    try {
      // Process in small batches to avoid overloading the browser or server
      const batchSize = 5;
      for (let i = 0; i < activePlans.length; i += batchSize) {
        const batch = activePlans.slice(i, i + batchSize);
        await Promise.all(batch.map(plan => adminUpdateDataPlan(plan.id, { is_active: false })));
      }
      alert(`Successfully disabled ${activePlans.length} plans.`);
      await load();
    } catch (err) {
      alert(err.message || 'An error occurred while disabling plans.');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-5 pb-8 relative">
      <AdminPageHeader
        title="Data plans management"
        description="Filter network plans, inspect provider metadata, and sync plan catalog from backend provider rails."
        actions={(
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDisableAll} disabled={syncing || toggling === 'all'}>
              {toggling === 'all' ? 'Disabling...' : 'Disable All Active'}
            </Button>
            <Button onClick={handleSync} disabled={syncing || toggling === 'all'}>
              <RefreshCw className={syncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {syncing ? 'Syncing...' : 'Sync plans'}
            </Button>
          </div>
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
          { key: 'base_price', label: 'Cost price', render: (row) => `₦${formatMoney(row.base_price ?? 0)}` },
          { key: 'price', label: 'Selling price', render: (row) => {
            const effective = calculateEffectivePrice(row);
            return (
              <div className="flex flex-col">
                <span className="font-medium text-foreground">₦{formatMoney(effective)}</span>
                {row.display_price !== null && row.display_price !== undefined ? (
                  <span className="text-[10px] text-orange-500 font-medium tracking-wider uppercase">Override</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground tracking-wider uppercase">Auto Margin</span>
                )}
              </div>
            );
          }},
          { key: 'plan_code', label: 'Provider code', render: (row) => <span className="font-mono text-xs">{row.plan_code || '—'}</span> },
          { key: 'enabled', label: 'State', render: (row) => <StatusBadge status={row.is_active === false ? 'disabled' : 'enabled'} /> },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex flex-wrap gap-1.5">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  disabled={toggling === row.id || toggling === 'all'}
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
                <Button variant="secondary" size="sm" onClick={() => handleOpenPriceModal(row)}>
                  Edit price
                </Button>
                <Button variant="secondary" size="sm" title={JSON.stringify(row)}>
                  <Database className="h-3.5 w-3.5" />
                  Meta
                </Button>
              </div>
            ),
          },
        ]}
        rows={filtered}
        empty={loading ? 'Loading data plans...' : 'No plans available for the selected filter.'}
      />

      {editingPriceFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
              <CardTitle className="text-lg">Edit Display Price</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setEditingPriceFor(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium text-foreground">{editingPriceFor.plan_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="font-medium text-foreground">{String(editingPriceFor.network).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost Price:</span>
                  <span className="font-medium text-foreground">₦{formatMoney(editingPriceFor.base_price)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Explicit Selling Price (₦)</label>
                <Input
                  type="number"
                  placeholder="Leave empty to use automatic margin"
                  value={displayPriceInput}
                  onChange={(e) => setDisplayPriceInput(e.target.value)}
                  disabled={isSavingPrice}
                />
                <p className="text-xs text-muted-foreground">
                  If set, this exact price will be charged to users, ignoring network margins.
                  Clear the input to revert to automatic margin calculation.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={() => setEditingPriceFor(null)} disabled={isSavingPrice}>
                  Cancel
                </Button>
                <Button onClick={handleSavePrice} disabled={isSavingPrice}>
                  {isSavingPrice ? 'Saving...' : 'Save Price'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
