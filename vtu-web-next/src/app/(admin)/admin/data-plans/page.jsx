'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw, X, Plus, Search } from 'lucide-react';
import { adminGetDataPlans, adminGetPricingRules, adminSyncDataPlans, adminUpdateDataPlan, adminDeleteDataPlan } from '@/lib/api';
import { filterAllowedAmigoPlans } from '@/lib/amigo-plan-policy';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { PremiumDataTable } from '@/components/admin/premium-data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  // Modal State
  const [editingPlan, setEditingPlan] = useState(null);
  const [displayPriceInput, setDisplayPriceInput] = useState('');
  const [agentPriceInput, setAgentPriceInput] = useState('');
  const [planNameInput, setPlanNameInput] = useState('');
  const [costPriceInput, setCostPriceInput] = useState('');
  const [dataSizeInput, setDataSizeInput] = useState('');
  const [validityInput, setValidityInput] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [promoActiveInput, setPromoActiveInput] = useState(false);
  const [promoOldPriceInput, setPromoOldPriceInput] = useState('');
  const [promoLabelInput, setPromoLabelInput] = useState('');
  const [fallbackProviderInput, setFallbackProviderInput] = useState('');
  const [fallbackPlanIdInput, setFallbackPlanIdInput] = useState('');

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
    if (!activeNetwork) return plans;
    return plans.filter((plan) => String(plan?.network || '').toLowerCase() === activeNetwork);
  }, [activeNetwork, plans]);

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

  const [cleaning, setCleaning] = useState(false);
  const handleCleanLegacy = useCallback(async () => {
    if (!window.confirm("This will permanently delete all old 'unknown' or broken data plans from the database. Are you sure?")) return;
    setCleaning(true);
    try {
      const { adminCleanLegacyDataPlans } = await import('@/lib/api');
      const res = await adminCleanLegacyDataPlans();
      alert(res.message || "Legacy plans deleted successfully");
      await load();
    } catch (err) {
      alert(err.message || "Failed to clean legacy plans");
    } finally {
      setCleaning(false);
    }
  }, [load]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    network: 'mtn',
    plan_code: '',
    plan_name: '',
    data_size: '',
    validity: '30 Days',
    base_price: '',
    provider: 'amigo',
    provider_plan_id: '',
    is_active: true
  });

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      const { adminCreateDataPlan } = await import('@/lib/api');
      await adminCreateDataPlan(newPlan);
      setIsAddModalOpen(false);
      setNewPlan({
        network: 'mtn',
        plan_code: '',
        plan_name: '',
        data_size: '',
        validity: '30 Days',
        base_price: '',
        provider: 'amigo',
        provider_plan_id: '',
        is_active: true
      });
      alert("Plan created successfully!");
      await load();
    } catch (err) {
      alert(err.message || "Failed to create plan");
    }
  };

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

  const handleOpenEditModal = (plan) => {
    setEditingPlan(plan);
    setPlanNameInput(plan.plan_name || '');
    setCostPriceInput(String(plan.base_price || ''));
    setDataSizeInput(plan.data_size || '');
    setValidityInput(plan.validity || '');
    setDisplayPriceInput(plan.display_price !== null ? String(plan.display_price) : '');
    setAgentPriceInput(plan.agent_price !== null && plan.agent_price !== undefined ? String(plan.agent_price) : '');
    setPromoActiveInput(plan.promo_active ?? false);
    setPromoOldPriceInput(plan.promo_old_price !== null ? String(plan.promo_old_price) : '');
    setPromoLabelInput(plan.promo_label || '');
    setFallbackProviderInput(plan.fallback_provider || 'none');
    setFallbackPlanIdInput(plan.fallback_provider_plan_id || '');
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    setIsSavingPlan(true);
    try {
      const payload = {
        plan_name: planNameInput.trim(),
        base_price: parseFloat(costPriceInput) || 0,
        data_size: dataSizeInput.trim(),
        validity: validityInput.trim(),
        promo_active: promoActiveInput
      };
      const val = displayPriceInput.trim();
      if (val === '') {
        payload.clear_display_price = true;
      } else {
        payload.display_price = parseFloat(val);
        if (isNaN(payload.display_price) || payload.display_price < 0) throw new Error('Invalid User price value');
      }
      
      const agentVal = agentPriceInput.trim();
      if (agentVal === '') {
        payload.clear_agent_price = true;
      } else {
        payload.agent_price = parseFloat(agentVal);
        if (isNaN(payload.agent_price) || payload.agent_price < 0) throw new Error('Invalid Agent price value');
      }

      const promoOldPriceVal = promoOldPriceInput.trim();
      if (promoOldPriceVal === '') {
        payload.clear_promo_old_price = true;
      } else {
        payload.promo_old_price = parseFloat(promoOldPriceVal);
        if (isNaN(payload.promo_old_price) || payload.promo_old_price < 0) throw new Error('Invalid Promo Old Price value');
      }

      const promoLabelVal = promoLabelInput.trim();
      if (promoLabelVal === '') {
        payload.clear_promo_label = true;
      } else {
        payload.promo_label = promoLabelVal;
      }
      
      const fbProvVal = fallbackProviderInput.trim();
      if (fbProvVal === '' || fbProvVal === 'none') {
        payload.clear_fallback_provider = true;
      } else {
        payload.fallback_provider = fbProvVal;
      }
      
      const fbPlanIdVal = fallbackPlanIdInput.trim();
      if (fbPlanIdVal === '') {
        payload.clear_fallback_provider_plan_id = true;
      } else {
        payload.fallback_provider_plan_id = fbPlanIdVal;
      }

      await adminUpdateDataPlan(editingPlan.id, payload);
      await load();
      setEditingPlan(null);
    } catch (err) {
      alert(err.message || 'Failed to update plan');
    } finally {
      setIsSavingPlan(false);
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

  const columns = useMemo(() => [
    { key: 'network', label: 'Network', sortable: true, render: (row) => <span className="font-semibold uppercase text-foreground">{row.network || 'other'}</span> },
    { key: 'plan_name', label: 'Plan / Size', sortable: true, render: (row) => <span className="font-medium text-foreground">{row.plan_name || row.data_size || '—'}</span> },
    { key: 'validity', label: 'Validity', sortable: false, render: (row) => <span className="text-muted-foreground">{row.validity || '—'}</span> },
    { key: 'base_price', label: 'Cost Price', sortable: true, render: (row) => <span className="text-muted-foreground">₦{formatMoney(row.base_price ?? 0)}</span> },
    { key: 'price', label: 'Selling Price', sortable: false, render: (row) => {
      const effective = calculateEffectivePrice(row);
      return (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground">₦{formatMoney(effective)}</span>
            {row.promo_active && (
              <span className="inline-flex items-center rounded-full bg-green-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-green-500">
                Promo
              </span>
            )}
          </div>
          {row.promo_active && row.promo_old_price && (
            <span className="text-[10px] text-muted-foreground line-through">₦{formatMoney(row.promo_old_price)}</span>
          )}
          {row.display_price !== null && row.display_price !== undefined ? (
            <span className="text-[9px] text-orange-500 font-medium tracking-widest uppercase mt-0.5">Override</span>
          ) : (
            <span className="text-[9px] text-muted-foreground tracking-widest uppercase mt-0.5">Margin</span>
          )}
        </div>
      );
    }},
    { key: 'agent_price', label: 'Agent Price', sortable: false, render: (row) => {
      return (
        <div className="flex flex-col">
          {row.agent_price !== null && row.agent_price !== undefined ? (
            <>
              <span className="font-medium text-orange-500">₦{formatMoney(row.agent_price)}</span>
              <span className="text-[9px] text-orange-500 font-medium tracking-widest uppercase mt-0.5">Explicit</span>
            </>
          ) : (
            <>
              <span className="font-medium text-muted-foreground">—</span>
              <span className="text-[9px] text-muted-foreground tracking-widest uppercase mt-0.5">Margin</span>
            </>
          )}
        </div>
      );
    }},
    { key: 'provider', label: 'API Provider', sortable: true, render: (row) => (
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase text-brand">{row.provider || 'unknown'}</span>
        <span className="font-mono text-[10px] text-muted-foreground mt-0.5 tracking-tight">ID: {row.provider_plan_id || row.plan_code || '—'}</span>
        {row.fallback_provider && row.fallback_provider !== 'none' && (
          <div className="mt-1.5 pt-1.5 border-t border-border/40">
            <span className="text-[10px] font-semibold uppercase text-orange-500 block leading-tight">Fallback: {row.fallback_provider}</span>
            <span className="font-mono text-[9px] text-muted-foreground tracking-tight">ID: {row.fallback_provider_plan_id || '—'}</span>
          </div>
        )}
      </div>
    )},
    { key: 'plan_code', label: 'System Code', sortable: true, render: (row) => <span className="font-mono text-[11px] text-muted-foreground">{row.plan_code || '—'}</span> },
    { key: 'enabled', label: 'Status', sortable: false, render: (row) => <StatusBadge status={row.is_active === false ? 'disabled' : 'active'} /> },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-8 rounded-xl"
            disabled={toggling === row.id || toggling === 'all'}
            onClick={async () => {
              setToggling(row.id);
              const newStatus = row.is_active === false ? true : false;
              // Optimistically update the UI to feel instant and avoid race conditions
              setPlans(prev => prev.map(p => p.id === row.id ? { ...p, is_active: newStatus } : p));
              try {
                await adminUpdateDataPlan(row.id, { is_active: newStatus });
              } catch (err) {
                // Revert on failure
                setPlans(prev => prev.map(p => p.id === row.id ? { ...p, is_active: !newStatus } : p));
                alert(err.message || 'Failed to toggle data plan');
              } finally {
                setToggling(null);
              }
            }}
          >
            {row.is_active === false ? 'Enable' : 'Disable'}
          </Button>
          <Button variant="secondary" size="sm" className="h-8 rounded-xl" onClick={() => handleOpenEditModal(row)}>
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={toggling === row.id || toggling === 'all'}
            onClick={async () => {
              if (!confirm(`Are you sure you want to permanently delete: ${row.plan_name || row.plan_code}?`)) return;
              setToggling(row.id);
              try {
                await adminDeleteDataPlan(row.id);
                await load();
              } catch (err) {
                alert(err.message || 'Failed to delete data plan');
              } finally {
                setToggling(null);
              }
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ], [pricing, toggling, load]);

  const FilterControls = (
    <div className="flex items-center gap-3">
      <select
        value={activeNetwork}
        onChange={(event) => setActiveNetwork(event.target.value)}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/50"
      >
        {NETWORKS.map((network) => (
          <option key={network || 'all'} value={network}>{network ? network.toUpperCase() : 'All networks'}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6 pb-8 relative">
      <AdminPageHeader
        eyebrow="Products"
        title="Data Plans Management"
        description="Filter network plans, inspect provider metadata, and sync plan catalog from backend provider rails."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button className="rounded-xl" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Manual Plan
            </Button>
            <Button variant="destructive" className="rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 border-none" onClick={handleCleanLegacy} disabled={cleaning || syncing || toggling === 'all'}>
              {cleaning ? 'Cleaning...' : 'Clean Old Plans'}
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDisableAll} disabled={cleaning || syncing || toggling === 'all'}>
              {toggling === 'all' ? 'Disabling...' : 'Disable All Active'}
            </Button>
            <Button variant="outline" className="rounded-xl bg-card/50 backdrop-blur-xl" onClick={handleSync} disabled={cleaning || syncing || toggling === 'all'}>
              <RefreshCw className={syncing ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
              {syncing ? 'Syncing...' : 'Sync plans'}
            </Button>
          </div>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['mtn', 'airtel', 'glo', '9mobile'].map((network, idx) => (
          <motion.div
            key={network}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-sm">
              <CardContent className="p-5">
                <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">{network}</div>
                <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">{byNetwork[network] || 0}</div>
                <div className="mt-1 text-xs text-muted-foreground">Plans available</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <PremiumDataTable 
          data={filtered} 
          columns={columns} 
          searchKey="plan_name"
          emptyMessage={loading ? 'Loading data plans...' : 'No plans available for the selected filter.'}
          headerActions={FilterControls}
        />
      </motion.div>

      <AnimatePresence>
        {editingPlan && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          >
            <Card className="w-full max-w-xl shadow-2xl rounded-3xl border-border/50">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-5 pt-6 px-6">
                <div>
                  <CardTitle className="text-xl">Edit Data Plan</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Modify pricing and metadata for {editingPlan.network.toUpperCase()}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary/50" onClick={() => setEditingPlan(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-6 px-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan Display Name</label>
                  <Input
                    placeholder="e.g. 1GB - 30 Days"
                    value={planNameInput}
                    onChange={(e) => setPlanNameInput(e.target.value)}
                    disabled={isSavingPlan}
                    className="h-11 rounded-xl bg-secondary/30"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost Price (₦)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Provider wholesale cost"
                    value={costPriceInput}
                    onChange={(e) => setCostPriceInput(e.target.value)}
                    disabled={isSavingPlan}
                    className="h-11 rounded-xl bg-secondary/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Size</label>
                    <Input
                      placeholder="e.g. 1GB"
                      value={dataSizeInput}
                      onChange={(e) => setDataSizeInput(e.target.value)}
                      disabled={isSavingPlan}
                      className="h-11 rounded-xl bg-secondary/30"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Validity</label>
                    <Input
                      placeholder="e.g. 30 Days"
                      value={validityInput}
                      onChange={(e) => setValidityInput(e.target.value)}
                      disabled={isSavingPlan}
                      className="h-11 rounded-xl bg-secondary/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User Price (₦)</label>
                    <Input
                      type="number"
                      placeholder="Leave empty for auto-margin"
                      value={displayPriceInput}
                      onChange={(e) => setDisplayPriceInput(e.target.value)}
                      disabled={isSavingPlan}
                      className="h-11 rounded-xl bg-secondary/30"
                    />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Overrides the dynamic margin logic for regular users.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent Price (₦)</label>
                    <Input
                      type="number"
                      placeholder="Leave empty for auto-margin"
                      value={agentPriceInput}
                      onChange={(e) => setAgentPriceInput(e.target.value)}
                      disabled={isSavingPlan}
                      className="h-11 rounded-xl bg-secondary/30"
                    />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Overrides the dynamic margin logic for resellers.</p>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fallback Provider</label>
                      <select
                        className="w-full h-11 px-3 rounded-xl bg-secondary/30 border border-input focus:ring-1 focus:ring-brand"
                        value={fallbackProviderInput}
                        onChange={(e) => setFallbackProviderInput(e.target.value)}
                        disabled={isSavingPlan}
                      >
                        <option value="none">None (No Fallback)</option>
                        <option value="amigo">Amigo</option>
                        <option value="smeplug">SMEPlug</option>
                        <option value="clubkonnect">ClubKonnect</option>
                      </select>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">Provider to try if primary fails.</p>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fallback Plan ID</label>
                      <Input
                        placeholder="e.g. 1001"
                        value={fallbackPlanIdInput}
                        onChange={(e) => setFallbackPlanIdInput(e.target.value)}
                        disabled={isSavingPlan}
                        className="h-11 rounded-xl bg-secondary/30"
                      />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">Plan ID for the fallback provider.</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-5 space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-brand/5 p-4 border border-brand/10">
                    <div>
                      <div className="text-sm font-semibold text-brand">Enable Promotional Pricing</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Shows a strike-through original price and badge</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={promoActiveInput} onChange={(e) => setPromoActiveInput(e.target.checked)} disabled={isSavingPlan} />
                      <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                    </label>
                  </div>

                  {promoActiveInput && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-5 pt-2">
                      <div className="space-y-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original Price (₦)</label>
                        <Input
                          type="number"
                          placeholder="e.g. 500"
                          value={promoOldPriceInput}
                          onChange={(e) => setPromoOldPriceInput(e.target.value)}
                          disabled={isSavingPlan}
                          className="h-11 rounded-xl bg-secondary/30"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Promo Label</label>
                        <Input
                          placeholder="e.g. 20% off"
                          value={promoLabelInput}
                          onChange={(e) => setPromoLabelInput(e.target.value)}
                          disabled={isSavingPlan}
                          className="h-11 rounded-xl bg-secondary/30"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 border-t border-border/50 p-6 bg-card/50 rounded-b-3xl">
                <Button variant="ghost" className="rounded-xl h-11 px-6" onClick={() => setEditingPlan(null)} disabled={isSavingPlan}>
                  Cancel
                </Button>
                <Button className="rounded-xl h-11 px-6" onClick={handleSavePlan} disabled={isSavingPlan}>
                  {isSavingPlan ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSavingPlan ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <Card className="w-full max-w-xl shadow-2xl my-8 rounded-3xl border-border/50">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-5 pt-6 px-6">
                <CardTitle className="text-xl">Add Manual Data Plan</CardTitle>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary/50" onClick={() => setIsAddModalOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <form onSubmit={handleCreatePlan}>
                <CardContent className="pt-6 px-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Network</label>
                      <select 
                        className="w-full h-11 px-3 rounded-xl border border-border bg-secondary/30 outline-none focus:ring-1 focus:ring-brand/50 focus:border-brand"
                        value={newPlan.network}
                        onChange={(e) => setNewPlan({...newPlan, network: e.target.value})}
                      >
                        <option value="mtn">MTN</option>
                        <option value="airtel">AIRTEL</option>
                        <option value="glo">GLO</option>
                        <option value="9mobile">9MOBILE</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider API</label>
                      <select 
                        className="w-full h-11 px-3 rounded-xl border border-border bg-secondary/30 outline-none focus:ring-1 focus:ring-brand/50 focus:border-brand"
                        value={newPlan.provider}
                        onChange={(e) => setNewPlan({...newPlan, provider: e.target.value})}
                      >
                        <option value="amigo">Amigo</option>
                        <option value="smeplug">SMEPlug</option>
                        <option value="clubkonnect">ClubKonnect</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan Name (Display)</label>
                    <Input 
                      placeholder="e.g. 1GB - 30 Days"
                      value={newPlan.plan_name}
                      onChange={(e) => setNewPlan({...newPlan, plan_name: e.target.value})}
                      required
                      className="h-11 rounded-xl bg-secondary/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Code</label>
                      <Input 
                        placeholder="e.g. amigo:mtn:1001"
                        value={newPlan.plan_code}
                        onChange={(e) => setNewPlan({...newPlan, plan_code: e.target.value})}
                        required
                        className="h-11 rounded-xl bg-secondary/30"
                      />
                      <p className="text-[10px] text-muted-foreground">Format: provider:network:id</p>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider Plan ID</label>
                      <Input 
                        placeholder="e.g. 1001"
                        value={newPlan.provider_plan_id}
                        onChange={(e) => setNewPlan({...newPlan, provider_plan_id: e.target.value})}
                        required
                        className="h-11 rounded-xl bg-secondary/30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost Price (₦)</label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={newPlan.base_price}
                        onChange={(e) => setNewPlan({...newPlan, base_price: e.target.value})}
                        required
                        className="h-11 rounded-xl bg-secondary/30"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Validity</label>
                      <Input 
                        placeholder="e.g. 30 Days"
                        value={newPlan.validity}
                        onChange={(e) => setNewPlan({...newPlan, validity: e.target.value})}
                        className="h-11 rounded-xl bg-secondary/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Size</label>
                    <Input 
                      placeholder="e.g. 1GB"
                      value={newPlan.data_size}
                      onChange={(e) => setNewPlan({...newPlan, data_size: e.target.value})}
                      className="h-11 rounded-xl bg-secondary/30"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3 border-t border-border/50 p-6 bg-card/50 rounded-b-3xl">
                  <Button variant="ghost" type="button" className="rounded-xl h-11 px-6" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="rounded-xl h-11 px-6">Create Plan</Button>
                </CardFooter>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
