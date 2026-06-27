'use client';

import Image from 'next/image';
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
  { key: 'mtn', label: 'MTN' },
  { key: 'airtel', label: 'Airtel' },
  { key: 'glo', label: 'Glo' },
  { key: '9mobile', label: '9mobile' },
];

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

function networkLogoSrc(value) {
  const normalized = normalizeNetwork(value);
  if (normalized === 'mtn') return '/brand/networks/mtn.png';
  if (normalized === 'airtel') return '/brand/networks/airtel.png';
  if (normalized === 'glo') return '/brand/networks/glo.png';
  if (normalized === '9mobile') return '/brand/networks/9mobile.png';
  return '/brand/networks/mtn.png';
}

function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidNigerianPhone(value) {
  const digits = phoneDigits(value);
  return /^0[789][01]\d{8}$/.test(digits) || /^234[789][01]\d{8}$/.test(digits);
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

function normalizePlan(raw) {
  const plan = { ...(raw || {}) };
  plan.plan_name = sanitizePlanText(plan.plan_name);
  plan.data_size = sanitizePlanText(plan.data_size);
  plan.network = normalizeNetwork(plan.network || plan.provider || plan.plan_code || '');
  return plan;
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
  const keys = [...NETWORK_ORDER, ...Array.from(grouped.keys()).filter((key) => !NETWORK_ORDER.includes(key) && key !== 'other'), 'other'];
  
  for (const networkKey of keys) {
    const items = grouped.get(networkKey);
    if (!items || !items.length) continue;
    
    curatedGroups.push({
      network: networkKey,
      plans: [...items].sort((a, b) => planPrice(a) - planPrice(b)),
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
      
      if (plansRes.status === 'fulfilled') {
        const val = plansRes.value;
        const list = Array.isArray(val) ? val : (val?.items || val?.data || val?.plans || []);
        setPlans(Array.isArray(list) ? list : []);
      }
      
      if (walletRes.status === 'fulfilled') setWallet(walletRes.value);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const planGroups = useMemo(() => curatePlans(plans), [plans]);
  const totalPlansCount = useMemo(
    () => planGroups.reduce((total, group) => total + group.plans.length, 0),
    [planGroups]
  );

  useEffect(() => {
    if (activeNetwork !== 'all' && !planGroups.some((group) => group.network === activeNetwork)) {
      if (planGroups.length > 0) {
        // Only switch if the currently active network has no plans but others do
      }
    }
  }, [activeNetwork, planGroups]);

  const activeGroup = useMemo(() => {
    return planGroups.find((group) => group.network === activeNetwork) || null;
  }, [activeNetwork, planGroups]);

  const visiblePlans = useMemo(() => {
    return activeGroup?.plans || [];
  }, [activeGroup]);

  const summaryNetwork = selected?.network || activeNetwork;
  const summaryPlanName = selected?.plan_name || selected?.plan_code || '—';
  const summaryPlanCode = selected?.plan_code || '—';
  const summaryPrice = selected?.price || 0;
  const normalizedPhone = phoneDigits(phone);
  const phoneError = normalizedPhone && !isValidNigerianPhone(phone) ? 'Enter a valid Nigerian phone number.' : '';
  const canSubmit = Boolean(selected && normalizedPhone && !phoneError && !busy);

  const purchase = async () => {
    if (!selected || !normalizedPhone || phoneError) return;
    setBusy(true);
    setMessage('');
    try {
      const payload = {
        plan_code: selected.plan_code,
        phone_number: normalizedPhone,
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
    <div className="-mx-4 -my-5 min-h-[calc(100vh-40px)] bg-background px-4 py-5 text-foreground md:-mx-6 md:-my-5 md:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10">
      <div className="space-y-6 pb-28 md:pb-8">
        <div className="space-y-2">
        <div className="axis-label text-muted-foreground">Services</div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Buy Data</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Affordable data bundles for MTN, Airtel, Glo, and 9mobile. All plans are synced in real-time from our providers.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => load()}
            className="border-border bg-secondary text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh plans
          </Button>
        </div>
      </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden border-border bg-card shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <CardContent className="space-y-6 p-4 md:space-y-8 md:p-7">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Select network</div>
                  <div className="mt-2 text-sm text-muted-foreground">Choose your network to see all active plans.</div>
                </div>
                <Badge className="border-border bg-secondary text-muted-foreground">Live catalog</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {NETWORK_TABS.map((tab) => {
                  const group = planGroups.find((item) => item.network === tab.key);
                  const count = group?.plans.length || 0;
                  const isActive = activeNetwork === tab.key;
                  const networkTone =
                    tab.key === 'mtn'
                      ? 'bg-amber-400 text-slate-950'
                      : tab.key === 'glo'
                        ? 'bg-emerald-500 text-foreground'
                        : tab.key === 'airtel'
                          ? 'bg-rose-500 text-foreground'
                          : 'bg-blue-500 text-foreground';

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveNetwork(tab.key)}
                      className={cn(
                        'group rounded-[20px] border px-3 py-4 text-left transition md:rounded-[22px] md:px-4 md:py-5',
                        isActive
                          ? 'border-primary/45 bg-primary/12 shadow-[0_0_0_1px_rgba(245,158,11,0.14)]'
                          : 'border-border bg-secondary hover:border-border hover:bg-secondary'
                      )}
                      >
                      <div className="flex items-start justify-between gap-3">
                        <div className={cn('flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-secondary p-1 ring-1 ring-border md:h-12 md:w-12', networkTone)}>
                          <Image
                            src={networkLogoSrc(tab.key)}
                            alt={`${tab.label} logo`}
                            width={44}
                            height={44}
                            className="h-full w-full object-contain"
                            unoptimized
                          />
                        </div>
                        <Badge className="border-border bg-secondary text-muted-foreground">
                          {count}
                        </Badge>
                      </div>
                      <div className="mt-4 text-sm font-semibold tracking-wide text-foreground">
                        {tab.label}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {count ? 'Available now' : 'No plans enabled'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Phone number</div>
                <div className="mt-2 text-sm text-muted-foreground">Enter the recipient phone number.</div>
              </div>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="08012345678"
                className="h-[52px] rounded-2xl border-border bg-input text-base text-foreground placeholder:text-muted-foreground focus:border-primary/45 focus:ring-amber-500/10 md:h-12"
              />
              {phoneError ? (
                <p className="text-xs font-medium text-rose-300">{phoneError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Format: 080... or 234...</p>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Select plan</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    All plans are managed via the Admin Dashboard.
                  </div>
                </div>
                <Badge className="border-border bg-secondary text-muted-foreground">
                  {visiblePlans.length} plan{visiblePlans.length === 1 ? '' : 's'}
                </Badge>
              </div>

              {loading ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="h-32 animate-pulse rounded-[22px] border border-border bg-secondary" />
                  ))}
                </div>
              ) : null}

              {!loading && !visiblePlans.length ? (
                <div className="rounded-[22px] border border-dashed border-border bg-secondary px-4 py-10 text-center text-sm text-muted-foreground">
                  No bundles are enabled for {networkLabel(activeNetwork)} right now.
                </div>
              ) : null}

              {!loading && visiblePlans.length ? (
                <div className="grid grid-cols-2 gap-3.5 md:gap-4 lg:grid-cols-3">
                  {visiblePlans.map((plan) => {
                    const isActive = selected?.plan_code === plan.plan_code;
                    const isPromo = plan.promo_active;
                    return (
                      <button
                        key={plan.plan_code}
                        type="button"
                        onClick={() => setSelected(plan)}
                        className={cn(
                          'group relative flex flex-col items-center justify-center rounded-[28px] border px-4 py-6 text-center transition-all duration-300 min-h-[160px]',
                          isActive
                            ? 'border-primary/50 bg-primary/10 shadow-[0_12px_28px_rgba(249,115,22,0.12)] ring-1 ring-primary/30'
                            : 'border-border/60 bg-card hover:border-primary/30 hover:bg-secondary/40'
                        )}
                      >
                        {/* 1. Capacity / Name */}
                        <div className="text-lg font-black tracking-tight text-foreground md:text-xl">
                          {plan.plan_name || plan.data_size}
                        </div>

                        {/* 2. Price (current + previous line-through) */}
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <span className={cn("text-base font-extrabold text-foreground", isActive ? "text-primary" : "")}>
                            ₦{formatMoney(plan.price || 0)}
                          </span>
                          {isPromo && plan.promo_old_price && (
                            <span className="text-xs text-muted-foreground line-through decoration-muted-foreground/60">
                              ₦{formatMoney(plan.promo_old_price)}
                            </span>
                          )}
                        </div>

                        {/* 3. Validity & Promo Label row */}
                        <div className="mt-3.5 flex items-center justify-center gap-1.5 flex-wrap">
                          <span className="rounded-full border border-border bg-secondary/30 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {plan.validity || '30 days'}
                          </span>
                          {isPromo && plan.promo_label && (
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500">
                              {plan.promo_label}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>
          </CardContent>
        </Card>

        <Card className="h-fit border-border bg-card shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <CardHeader>
            <CardTitle className="text-foreground">Order Summary</CardTitle>
            <CardDescription className="text-muted-foreground">Confirm details before purchase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[22px] border border-border bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white p-1 ring-1 ring-border">
                  <Image
                    src={networkLogoSrc(summaryNetwork)}
                    alt={`${networkLabel(summaryNetwork)} logo`}
                    width={44}
                    height={44}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{networkLabel(summaryNetwork)} Data</div>
                  <div className="text-xs text-muted-foreground">Bundle delivery</div>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[22px] border border-border bg-secondary p-4">
              {[
                { label: 'Network', value: networkLabel(summaryNetwork) },
                { label: 'Plan', value: summaryPlanName },
                { label: 'Recipient', value: phone.trim() || '—' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-end justify-between gap-4 rounded-[22px] border border-border bg-secondary p-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-primary">
                  ₦{formatMoney(summaryPrice || 0)}
                </div>
              </div>
            </div>

            <Button
              className="h-12 w-full rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(249,115,22,0.18)] transition hover:bg-primary/90 active:scale-[0.98]"
              onClick={purchase}
              disabled={!canSubmit}
            >
              {busy ? 'Processing...' : 'Confirm & Purchase'}
              <ArrowRight className="h-4 w-4" />
            </Button>

            {message ? (
              <div className="rounded-[18px] border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground break-all">
                {message}
              </div>
            ) : null}

            <div className="text-xs leading-6 text-muted-foreground">
              All plans are synced directly from our providers. Ensure the recipient number is correct.
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 shadow-[0_-18px_40px_rgba(0,0,0,0.35)] backdrop-blur md:hidden"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
      >
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-muted-foreground">
              {selected ? summaryPlanName : 'Select a plan'}
            </div>
            <div className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              ₦{formatMoney(summaryPrice || 0)}
            </div>
          </div>
          <Button
            className="h-12 shrink-0 rounded-xl bg-primary px-5 text-primary-foreground shadow-[0_12px_24px_rgba(249,115,22,0.18)] transition hover:bg-primary/90 active:scale-[0.98]"
            onClick={purchase}
            disabled={!canSubmit}
          >
            {busy ? 'Processing...' : 'Buy Data'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
