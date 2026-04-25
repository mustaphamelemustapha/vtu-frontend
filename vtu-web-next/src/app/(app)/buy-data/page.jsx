'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const NETWORK_ORDER = ['mtn', 'airtel', 'glo', '9mobile'];
const NETWORK_TABS = [
  { key: 'all', label: 'All networks' },
  { key: 'mtn', label: 'MTN' },
  { key: 'airtel', label: 'Airtel' },
  { key: 'glo', label: 'Glo' },
  { key: '9mobile', label: '9mobile' },
];

const BLOCK_KEYWORDS = ['night', 'social', 'weekend', 'daily', 'awoof', 'bonus', 'router', 'mifi', 'youtube', 'unlimited'];
const AIRTEL_VISIBLE_CAPACITIES = new Set(['2GB', '3GB', '4GB', '8GB', '10GB', '13GB', '18GB', '25GB']);

function parsePlansResponse(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const list = raw.data ?? raw.plans ?? raw.items;
  return Array.isArray(list) ? list : [];
}

function normalizeNetwork(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('9mobile') || raw.includes('etisalat') || raw === '9') return '9mobile';
  if (raw.includes('mtn')) return 'mtn';
  if (raw.includes('airtel')) return 'airtel';
  if (raw.includes('glo') || raw.includes('globacom')) return 'glo';
  return raw;
}

function networkLabel(value) {
  const normalized = normalizeNetwork(value);
  if (!normalized) return 'Other';
  if (normalized === '9mobile') return '9mobile';
  return normalized.toUpperCase();
}

function sanitizePlanText(value) {
  const text = String(value ?? '');
  if (!text.trim()) return '';
  return text
    .replace(/\(\s*direct\s+data\s*\)/gi, '')
    .replace(/\bdirect\s+data\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\-\s*/g, '')
    .replace(/\s*\-$/g, '')
    .trim();
}

function planPrice(plan) {
  const value = Number.parseFloat(plan?.price ?? '');
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function capacityKey(value) {
  const text = String(value ?? '').toUpperCase().replace(/\s+/g, '');
  if (!text) return '';
  const match = text.match(/(\d+(?:\.\d+)?)(GB|MB)/);
  return match ? `${match[1]}${match[2]}` : text;
}

function validityDays(value) {
  const text = String(value ?? '').toLowerCase();
  if (!text) return null;
  const match = text.match(/(\d+)\s*(d|day|days|month|months|week|weeks)/);
  if (!match) return null;
  const amount = Number.parseInt(match[1] || '', 10);
  if (!Number.isFinite(amount)) return null;
  const unit = match[2] || '';
  if (unit.startsWith('month')) return amount * 30;
  if (unit.startsWith('week')) return amount * 7;
  return amount;
}

function isNoisyPlan(plan) {
  if (!plan || typeof plan !== 'object') return false;
  const label = `${plan.plan_name || ''} ${plan.data_size || ''} ${plan.validity || ''}`.toLowerCase();
  return BLOCK_KEYWORDS.some((keyword) => label.includes(keyword));
}

function normalizePlan(raw) {
  const plan = { ...(raw || {}) };
  plan.plan_name = sanitizePlanText(plan.plan_name);
  plan.data_size = sanitizePlanText(plan.data_size);
  plan.network = normalizeNetwork(plan.network || plan.provider || plan.plan_code || '');

  if (!plan.network) {
    const networkHint = String(plan.plan_name || plan.data_size || '').toLowerCase();
    if (networkHint.includes('mtn')) plan.network = 'mtn';
    else if (networkHint.includes('airtel')) plan.network = 'airtel';
    else if (networkHint.includes('glo')) plan.network = 'glo';
    else if (networkHint.includes('9mobile') || networkHint.includes('etisalat')) plan.network = '9mobile';
  }

  return plan;
}

function filterAirtelPlans(plans) {
  return plans.filter((plan) => {
    const network = normalizeNetwork(plan.network);
    if (network !== 'airtel') return true;
    const capacity = capacityKey(plan.data_size || plan.plan_name);
    if (!AIRTEL_VISIBLE_CAPACITIES.has(capacity)) return false;
    return validityDays(plan.validity || plan.plan_name) === 30;
  });
}

function curatePlans(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const normalized = normalizePlan(row);
    const key = normalized.network || 'other';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(normalized);
  }

  const curatedGroups = [];
  for (const networkKey of [...NETWORK_ORDER, ...Array.from(grouped.keys()).filter((key) => !NETWORK_ORDER.includes(key) && key !== 'other'), 'other']) {
    const items = grouped.get(networkKey);
    if (!items || !items.length) continue;
    const clean = items.filter((plan) => !isNoisyPlan(plan));
    const source =
      networkKey === 'airtel'
        ? filterAirtelPlans(clean.length ? clean : items)
        : clean.length >= 4
          ? clean
          : items;
    if (!source.length) continue;
    curatedGroups.push({
      network: networkKey,
      plans: [...source].sort((a, b) => planPrice(a) - planPrice(b)).slice(0, 8),
    });
  }
  return curatedGroups;
}

export default function BuyDataPage() {
  const [plans, setPlans] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeNetwork, setActiveNetwork] = useState('all');
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

  const planGroups = useMemo(() => curatePlans(plans), [plans]);
  const totalCuratedPlans = useMemo(
    () => planGroups.reduce((total, group) => total + group.plans.length, 0),
    [planGroups]
  );

  const visibleGroups = useMemo(() => {
    if (activeNetwork === 'all') return planGroups;
    return planGroups.filter((group) => group.network === activeNetwork);
  }, [activeNetwork, planGroups]);

  useEffect(() => {
    if (activeNetwork !== 'all' && !planGroups.some((group) => group.network === activeNetwork)) {
      setActiveNetwork('all');
    }
  }, [activeNetwork, planGroups]);

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
        title="Live data bundles"
        description="Choose a network, review the available bundles, and complete your purchase in a simple flow."
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
            <CardTitle>Choose network</CardTitle>
            <CardDescription>MTN and Glo bundles remain visible alongside the other live networks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {NETWORK_TABS.map((tab) => {
                const count = tab.key === 'all'
                  ? totalCuratedPlans
                  : planGroups.find((group) => group.network === tab.key)?.plans.length || 0;
                const isActive = activeNetwork === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveNetwork(tab.key)}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm font-medium transition',
                      isActive
                        ? 'border-orange-200 bg-orange-50 text-slate-950'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {tab.label}
                    <span className="ml-2 text-xs text-slate-500">{count}</span>
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
          <CardDescription>Live bundles are grouped by network so the catalog stays easy to scan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? <div className="text-sm text-slate-600">Loading plans...</div> : null}
          {!loading && !planGroups.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-[#fcfbf8] p-5 text-sm text-slate-600">
              No data bundles are available right now.
            </div>
          ) : null}

          {visibleGroups.map((group) => (
            <section key={group.network} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-950">{networkLabel(group.network)} bundles</div>
                  <div className="text-xs text-slate-600">Live plans from the backend catalog.</div>
                </div>
                <Badge tone="neutral" className="border-slate-200 bg-white text-slate-600">
                  {group.plans.length} plan{group.plans.length === 1 ? '' : 's'}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.plans.map((plan) => {
                  const activeCard = selected?.plan_code === plan.plan_code;
                  return (
                    <button
                      key={plan.plan_code}
                      type="button"
                      onClick={() => setSelected(plan)}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition',
                        activeCard
                          ? 'border-orange-200 bg-orange-50'
                          : 'border-slate-200 bg-[#fcfbf8] hover:border-orange-200 hover:bg-orange-50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-slate-950">{plan.plan_name || plan.plan_code}</div>
                          <div className="mt-1 text-xs text-slate-600">{plan.plan_code || 'Plan code unavailable'}</div>
                        </div>
                        <Badge tone="neutral" className="border-slate-200 bg-white text-slate-600">
                          {plan.validity || 'Plan'}
                        </Badge>
                      </div>
                      <div className="mt-4 text-xl font-semibold text-slate-950">₦{formatMoney(plan.price || 0)}</div>
                      <div className="mt-1 text-sm text-slate-600">{plan.data_size || '—'}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {!loading && planGroups.length && !visibleGroups.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-[#fcfbf8] p-5 text-sm text-slate-600">
              No plans available for this network yet.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
