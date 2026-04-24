'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, Wifi, Smartphone, Tv2, Zap } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';

const serviceTabs = [
  { key: 'data', label: 'Data', icon: Wifi },
  { key: 'airtime', label: 'Airtime', icon: Smartphone },
  { key: 'cable', label: 'Cable', icon: Tv2 },
  { key: 'electricity', label: 'Electricity', icon: Zap },
];

export default function BuyDataPage() {
  const [active, setActive] = useState('data');
  const [plans, setPlans] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, walletRes] = await Promise.allSettled([
        apiFetch('/data/plans'),
        apiFetch('/wallet/me'),
      ]);
      if (plansRes.status === 'fulfilled') setPlans(Array.isArray(plansRes.value) ? plansRes.value : []);
      if (walletRes.status === 'fulfilled') setWallet(walletRes.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const curatedPlans = useMemo(() => plans.slice(0, 12), [plans]);

  const purchase = async () => {
    if (!selected || !phone.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      const payload = {
        plan_code: selected.plan_code,
        phone_number: phone.trim(),
        network: selected.network,
      };
      const res = await apiFetch('/data/purchase', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setMessage(`${res?.message || 'Purchase submitted.'} Ref: ${res?.reference || '—'}`);
    } catch (err) {
      setMessage(err?.message || 'Purchase failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Buy Data"
        title="High-trust purchase workspace"
        description="A more mature purchase surface with direct plan discovery, wallet visibility, and a clear execution flow."
        actions={(
          <Button variant="secondary" onClick={() => load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh plans
          </Button>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_350px]">
        <Card>
          <CardHeader>
            <CardTitle>Choose service</CardTitle>
            <CardDescription>Structured by category, not by clutter.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
          {serviceTabs.map((tab) => {
            const Icon = tab.icon;
            const activeTab = active === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={`rounded-3xl border p-4 text-left transition ${activeTab ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-[#fcfbf8] hover:border-orange-200 hover:bg-orange-50'}`}
              >
                <Icon className="h-5 w-5 text-orange-600" />
                <div className="mt-4 text-sm font-medium text-slate-950">{tab.label}</div>
                <div className="mt-1 text-xs text-slate-600">Open purchase flow</div>
              </button>
            );
          })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase panel</CardTitle>
            <CardDescription>Enter the recipient and select a plan to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="axis-label">Wallet balance</div>
              <div className="text-2xl font-semibold text-slate-950">₦{formatMoney(wallet?.balance || 0)}</div>
            </div>
            <div className="space-y-2">
              <div className="axis-label">Phone number</div>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" />
            </div>
            <div className="space-y-2">
              <div className="axis-label">Selected plan</div>
              <div className="rounded-2xl border border-slate-200 bg-[#fcfbf8] p-3 text-sm text-slate-700">
                {selected ? `${selected.plan_name || selected.plan_code} • ₦${formatMoney(selected.price || 0)}` : 'Pick a plan from the list'}
              </div>
            </div>
            <Button className="w-full" onClick={purchase} disabled={busy || !selected || !phone.trim()}>
              {busy ? 'Processing...' : 'Submit purchase'}
              <ArrowRight className="h-4 w-4" />
            </Button>
            {message ? <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">{message}</div> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available plans</CardTitle>
          <CardDescription>Pulling directly from the existing backend catalog.</CardDescription>
        </CardHeader>
          <CardContent>
          {loading ? <div className="text-sm text-slate-600">Loading plans...</div> : null}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {curatedPlans.map((plan) => {
              const activeCard = selected?.plan_code === plan.plan_code;
              return (
                <button
                  key={plan.plan_code}
                  onClick={() => setSelected(plan)}
                  className={`rounded-3xl border p-4 text-left transition ${activeCard ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-[#fcfbf8] hover:border-orange-200 hover:bg-orange-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-950">{plan.plan_name || plan.plan_code}</div>
                      <div className="mt-1 text-xs text-slate-600">{plan.network || 'Network'}</div>
                    </div>
                    <Badge tone="neutral">{plan.validity || 'Plan'}</Badge>
                  </div>
                  <div className="mt-4 text-xl font-semibold text-slate-950">₦{formatMoney(plan.price || 0)}</div>
                  <div className="mt-1 text-sm text-slate-600">{plan.data_size || ''}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
