'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  const [activeNetwork, setActiveNetwork] = useState('mtn');
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

  const activeGroup = useMemo(() => {
    if (activeNetwork === 'all') return null;
    return planGroups.find((group) => group.network === activeNetwork) || null;
  }, [activeNetwork, planGroups]);

  const visiblePlans = useMemo(() => {
    if (activeNetwork === 'all') {
      return planGroups.flatMap((group) => group.plans.map((plan) => ({ ...plan, __group: group.network })));
    }
    return activeGroup?.plans || [];
  }, [activeGroup, activeNetwork, planGroups]);

  const summaryNetwork = selected?.network || activeNetwork;
  const summaryPlanName = selected?.plan_name || selected?.plan_code || '—';
  const summaryPlanCode = selected?.plan_code || '—';
  const summaryPrice = selected?.price || 0;
  const canSubmit = Boolean(selected && phone.trim() && !busy);

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
    <div className="space-y-6 pb-8 text-slate-100">
      <div className="space-y-2">
        <div className="axis-label text-white/40">Services</div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Buy Data</h1>
            <p className="max-w-2xl text-sm leading-6 text-white/55">
              Affordable data bundles for MTN, Airtel, Glo, and 9mobile from one sharp purchase workspace.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => load()}
            className="border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh plans
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <CardContent className="space-y-8 p-6 md:p-7">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/35">Select network</div>
                  <div className="mt-2 text-sm text-white/55">Choose the bundle family you want to view.</div>
                </div>
                <Badge className="border-white/10 bg-white/[0.03] text-white/65">Live catalog</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {NETWORK_TABS.filter((tab) => tab.key !== 'all').map((tab) => {
                  const group = planGroups.find((item) => item.network === tab.key);
                  const count = group?.plans.length || 0;
                  const isActive = activeNetwork === tab.key;
                  const networkTone =
                    tab.key === 'mtn'
                      ? 'bg-amber-400 text-slate-950'
                      : tab.key === 'glo'
                        ? 'bg-emerald-500 text-white'
                        : tab.key === 'airtel'
                          ? 'bg-rose-500 text-white'
                          : 'bg-orange-500 text-white';

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveNetwork(tab.key)}
                      className={cn(
                        'group rounded-[22px] border px-4 py-5 text-left transition',
                        isActive
                          ? 'border-amber-400/40 bg-[#2b2318] shadow-[0_0_0_1px_rgba(245,158,11,0.14)]'
                          : 'border-white/8 bg-black/20 hover:border-white/12 hover:bg-white/[0.05]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={cn('flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold', networkTone)}>
                          {tab.key === '9mobile' ? '9' : tab.label.slice(0, 2).toUpperCase()}
                        </div>
                        <Badge className="border-white/10 bg-white/[0.03] text-white/55">
                          {count}
                        </Badge>
                      </div>
                      <div className="mt-4 text-sm font-semibold tracking-wide text-white">
                        {tab.label}
                      </div>
                      <div className="mt-1 text-xs text-white/45">
                        {count ? 'Available now' : 'No bundles visible'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/35">Available bundles</div>
                  <div className="mt-2 text-sm text-white/55">
                    {activeNetwork === 'all' ? 'All live bundles in one place.' : `${networkLabel(activeNetwork)} plans from the backend catalog.`}
                  </div>
                </div>
                <Badge className="border-white/10 bg-white/[0.03] text-white/65">
                  {activeNetwork === 'all' ? totalCuratedPlans : activeGroup?.plans.length || 0} plan{activeNetwork === 'all' ? (totalCuratedPlans === 1 ? '' : 's') : (activeGroup?.plans.length === 1 ? '' : 's')}
                </Badge>
              </div>

              {loading ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="h-32 animate-pulse rounded-[22px] border border-white/8 bg-white/[0.03]" />
                  ))}
                </div>
              ) : null}

              {!loading && !visiblePlans.length ? (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/50">
                  No bundles are available for this network right now.
                </div>
              ) : null}

              {!loading && visiblePlans.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {visiblePlans.map((plan) => {
                    const isActive = selected?.plan_code === plan.plan_code;
                    return (
                      <button
                        key={plan.plan_code}
                        type="button"
                        onClick={() => setSelected(plan)}
                        className={cn(
                          'rounded-[22px] border px-4 py-4 text-left transition',
                          isActive
                            ? 'border-amber-400/40 bg-[#2b2318] shadow-[0_0_0_1px_rgba(245,158,11,0.14)]'
                            : 'border-white/8 bg-black/20 hover:border-white/12 hover:bg-white/[0.05]'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-white">{plan.plan_name || plan.plan_code}</div>
                            <div className="mt-1 text-xs text-white/45">{plan.plan_code || 'Plan code unavailable'}</div>
                          </div>
                          <Badge className="border-white/10 bg-white/[0.03] text-white/60">
                            {plan.validity || 'Plan'}
                          </Badge>
                        </div>
                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">Price</div>
                            <div className="mt-1 text-lg font-semibold tracking-tight text-white">
                              ₦{formatMoney(plan.price || 0)}
                            </div>
                          </div>
                          <div className="text-sm text-white/50">{plan.data_size || '—'}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <section className="space-y-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/35">Phone number</div>
                <div className="mt-2 text-sm text-white/55">Enter the recipient line before placing the order.</div>
              </div>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08012345678 or 2348012345678"
                className="h-12 rounded-2xl border-white/8 bg-[#11161c] text-white placeholder:text-white/28 focus:border-amber-400/40 focus:ring-amber-500/10"
              />
              <Button
                className="h-12 w-full rounded-2xl bg-[#f97316] text-slate-950 shadow-[0_12px_24px_rgba(249,115,22,0.18)] transition hover:bg-[#ea6a11] active:scale-[0.98]"
                onClick={purchase}
                disabled={!canSubmit}
              >
                {busy ? 'Processing...' : selected ? `Buy Data — ₦${formatMoney(summaryPrice || 0)}` : 'Buy Data'}
                <ArrowRight className="h-4 w-4" />
              </Button>
              {message ? (
                <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/65">
                  {message}
                </div>
              ) : null}
            </section>
          </CardContent>
        </Card>

        <Card className="h-fit border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <CardHeader>
            <CardTitle className="text-white">Order Summary</CardTitle>
            <CardDescription className="text-white/45">Bundle delivery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold',
                  summaryNetwork === 'mtn'
                    ? 'bg-amber-400 text-slate-950'
                    : summaryNetwork === 'glo'
                      ? 'bg-emerald-500 text-white'
                      : summaryNetwork === 'airtel'
                        ? 'bg-rose-500 text-white'
                        : 'bg-orange-500 text-white'
                )}>
                  {networkLabel(summaryNetwork).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{networkLabel(summaryNetwork)} Data</div>
                  <div className="text-xs text-white/45">Bundle delivery</div>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[22px] border border-white/8 bg-black/20 p-4">
              {[
                { label: 'Network', value: networkLabel(summaryNetwork) },
                { label: 'Bundle type', value: 'Single' },
                { label: 'Plan', value: summaryPlanName },
                { label: 'Phone', value: phone.trim() || '—' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 border-b border-white/8 pb-3 last:border-0 last:pb-0">
                  <span className="text-sm text-white/45">{item.label}</span>
                  <span className="text-sm font-medium text-white">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-end justify-between gap-4 rounded-[22px] border border-white/8 bg-black/20 p-4">
              <div>
                <div className="text-sm text-white/45">Total</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-[#f97316]">
                  ₦{formatMoney(summaryPrice || 0)}
                </div>
              </div>
              <div className="text-right text-xs text-white/45">
                {summaryPlanCode !== '—' ? summaryPlanCode : 'Select a bundle to continue'}
              </div>
            </div>

            <div className="text-xs leading-6 text-white/40">
              Live bundles are loaded from the backend catalog. MTN and Glo plans are surfaced first when available.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
