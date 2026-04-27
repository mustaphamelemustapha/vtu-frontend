'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { buildTransactionReceipt, downloadReceipt, shareReceipt } from '@/lib/receipt';
import { getDataPlansFast, prefetchDataPlans } from '@/lib/data-plans-cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TransactionProcessingModal } from '@/components/transaction-processing-modal';
import { TransactionReceiptModal } from '@/components/transaction-receipt-modal';
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
const AIRTEL_VISIBLE_CAPACITIES = new Set(['500MB', '1GB', '2GB', '3GB', '4GB', '10GB', '18GB', '25GB']);
const AIRTEL_VALIDITY_TARGETS = {
  '500MB': 7,
  '1GB': 30,
  '2GB': 30,
  '3GB': 30,
  '4GB': 30,
  '10GB': 30,
  '18GB': 30,
  '25GB': 30,
};

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
    return validityDays(plan.validity || plan.plan_name) === AIRTEL_VALIDITY_TARGETS[capacity];
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
  const [loadError, setLoadError] = useState('');
  const [activeNetwork, setActiveNetwork] = useState('mtn');
  const [phone, setPhone] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setLoadError('');
    try {
      const [plansRes, walletRes] = await Promise.allSettled([getDataPlansFast(apiFetch), apiFetch('/wallet/me')]);

      if (plansRes.status === 'fulfilled') {
        const nextPlans = Array.isArray(plansRes.value?.plans) ? plansRes.value.plans : [];
        setPlans(nextPlans);
        if (!nextPlans.length) {
          setLoadError('No plans are available right now. Please refresh.');
        }
      } else if (!silent) {
        setPlans([]);
        setLoadError('Unable to load live data plans right now. Please refresh.');
      }

      if (walletRes.status === 'fulfilled') setWallet(walletRes.value);
    } finally {
      if (!silent) setLoading(false);
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

  useEffect(() => {
    if (!selected) return;
    const exists = visiblePlans.some((plan) => plan.plan_code === selected.plan_code);
    if (!exists) setSelected(null);
  }, [selected, visiblePlans]);

  const summaryNetwork = selected?.network || activeNetwork;
  const summaryPlanName = selected?.plan_name || selected?.plan_code || '—';
  const summaryPlanCode = selected?.plan_code || '—';
  const summaryPrice = selected?.price || 0;
  const normalizedPhone = phoneDigits(phone);
  const phoneError = normalizedPhone && !isValidNigerianPhone(phone) ? 'Enter a valid Nigerian phone number.' : '';
  const canSubmit = Boolean(selected && normalizedPhone && !phoneError && !busy);

  const purchase = async () => {
    if (!selected || !normalizedPhone || phoneError) return;
    if (process.env.NODE_ENV !== 'production') console.info('[BuyData] buy button clicked');
    setBusy(true);
    if (process.env.NODE_ENV !== 'production') console.info('[BuyData] processing modal opened');
    setReceipt(null);
    try {
      const payload = {
        client_request_id: `web-data-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        plan_code: selected.plan_code,
        phone_number: normalizedPhone,
        network: selected.network,
      };
      const timeoutMs = 30000;
      const res = await Promise.race([
        apiFetch('/data/purchase', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
        new Promise((_, reject) => {
          setTimeout(() => {
            const timeoutError = new Error('Transaction timed out. Please try again.');
            timeoutError.code = 'REQUEST_TIMEOUT';
            reject(timeoutError);
          }, timeoutMs);
        }),
      ]);
      if (process.env.NODE_ENV !== 'production') console.info('[BuyData] API response received', res);
      const status = String(res?.status || '').toLowerCase();
      setReceipt(
        buildTransactionReceipt({
          service: 'Data Purchase',
          status: status === 'failed' ? 'failed' : status === 'success' ? 'success' : 'pending',
          message: res?.message || 'Purchase submitted.',
          amount: Number(selected?.price || 0),
          reference: res?.reference || '—',
          phone: normalizedPhone,
          meta: [
            { label: 'Network', value: networkLabel(selected?.network || summaryNetwork) },
            { label: 'Plan', value: selected?.plan_name || selected?.plan_code || '—' },
            { label: 'Bundle code', value: selected?.plan_code || '—' },
          ],
        })
      );
      if (process.env.NODE_ENV !== 'production') console.info('[BuyData] receipt modal opened', status || 'pending');
    } catch (err) {
      setReceipt(
        buildTransactionReceipt({
          service: 'Data Purchase',
          status: 'failed',
          message: err?.message || 'Purchase failed.',
          amount: Number(selected?.price || 0),
          phone: normalizedPhone,
          meta: [
            { label: 'Network', value: networkLabel(selected?.network || summaryNetwork) },
            { label: 'Plan', value: selected?.plan_name || selected?.plan_code || '—' },
            { label: 'Bundle code', value: selected?.plan_code || '—' },
          ],
        })
      );
      if (process.env.NODE_ENV !== 'production') console.info('[BuyData] API failed', err);
      if (process.env.NODE_ENV !== 'production') console.info('[BuyData] receipt modal opened', 'failed');
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
              Affordable data bundles for MTN, Airtel, Glo, and 9mobile from one sharp purchase workspace.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setLoadError('');
              setLoading(true);
              Promise.allSettled([prefetchDataPlans(apiFetch), apiFetch('/wallet/me')])
                .then(([plansRes, walletRes]) => {
                  if (plansRes.status === 'fulfilled') {
                    const nextPlans = Array.isArray(plansRes.value) ? plansRes.value : [];
                    setPlans(nextPlans);
                    if (!nextPlans.length) setLoadError('No plans are available right now. Please refresh.');
                  } else {
                    setLoadError('Unable to load live data plans right now. Please refresh.');
                  }
                  if (walletRes.status === 'fulfilled') setWallet(walletRes.value);
                })
                .finally(() => setLoading(false));
            }}
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
                  <div className="mt-2 text-sm text-muted-foreground">Choose the bundle family you want to view.</div>
                </div>
                <Badge className="border-border bg-secondary text-muted-foreground">Live catalog</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {NETWORK_TABS.filter((tab) => tab.key !== 'all').map((tab) => {
                  const group = planGroups.find((item) => item.network === tab.key);
                  const count = group?.plans.length || 0;
                  const isActive = activeNetwork === tab.key;
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
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white p-1 ring-1 ring-border md:h-12 md:w-12">
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
                        {count ? 'Available now' : 'No bundles visible'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Phone number</div>
                <div className="mt-2 text-sm text-muted-foreground">Enter the recipient line before choosing a bundle.</div>
              </div>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="08012345678 or 2348012345678"
                className="h-[52px] rounded-2xl border-border bg-input text-base text-foreground placeholder:text-muted-foreground/60 focus:border-primary/45 focus:ring-amber-500/10 md:h-12"
              />
              {phoneError ? (
                <p className="text-xs font-medium text-rose-300">{phoneError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Use 08012345678 or 2348012345678.</p>
              )}
              <Button
                className="hidden h-12 w-full rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(249,115,22,0.18)] transition hover:bg-primary/90 active:scale-[0.98] md:inline-flex"
                onClick={purchase}
                disabled={!canSubmit}
              >
                {busy ? 'Processing...' : selected ? `Buy Data — ₦${formatMoney(summaryPrice || 0)}` : 'Buy Data'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </section>

            <section className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Select plan</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {activeNetwork === 'all' ? 'All live bundles in one place.' : `${networkLabel(activeNetwork)} plans from the backend catalog.`}
                  </div>
                </div>
                <Badge className="border-border bg-secondary text-muted-foreground">
                  {activeNetwork === 'all' ? totalCuratedPlans : activeGroup?.plans.length || 0} plan{activeNetwork === 'all' ? (totalCuratedPlans === 1 ? '' : 's') : (activeGroup?.plans.length === 1 ? '' : 's')}
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
                <div className="rounded-[22px] border border-dashed border-border bg-secondary px-4 py-5 text-sm text-muted-foreground">
                  No bundles are available for this network right now.
                </div>
              ) : null}

              {!loading && loadError ? (
                <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-400/35 dark:bg-rose-500/12 dark:text-rose-100">
                  {loadError}
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
                            ? 'border-primary/45 bg-primary/12 shadow-[0_0_0_1px_rgba(245,158,11,0.14)]'
                            : 'border-border bg-secondary hover:border-border hover:bg-secondary'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-border">
                              <Image
                                src={networkLogoSrc(plan.network)}
                                alt={`${networkLabel(plan.network)} logo`}
                                width={36}
                                height={36}
                                className="h-full w-full object-contain"
                                unoptimized
                              />
                            </div>
                            <div>
                            <div className="text-sm font-medium text-foreground">{plan.plan_name || plan.plan_code}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{plan.plan_code || 'Plan code unavailable'}</div>
                            </div>
                          </div>
                          <Badge className="border-border bg-secondary text-muted-foreground">
                            {plan.validity || 'Plan'}
                          </Badge>
                        </div>
                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Price</div>
                            <div className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                              ₦{formatMoney(plan.price || 0)}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">{plan.data_size || '—'}</div>
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
            <CardDescription className="text-muted-foreground">Bundle delivery</CardDescription>
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
                { label: 'Bundle type', value: 'Single' },
                { label: 'Plan', value: summaryPlanName },
                { label: 'Phone', value: phone.trim() || '—' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-end justify-between gap-4 rounded-[22px] border border-border bg-secondary p-4">
              <div>
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-primary">
                  ₦{formatMoney(summaryPrice || 0)}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {summaryPlanCode !== '—' ? summaryPlanCode : 'Select a bundle to continue'}
              </div>
            </div>

            <div className="text-xs leading-6 text-muted-foreground">
              Live bundles are loaded from the backend catalog. MTN and Glo plans are surfaced first when available.
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
              {selected ? summaryPlanName : 'Select a plan to continue'}
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

      <TransactionProcessingModal open={busy} />
      <TransactionReceiptModal
        open={Boolean(receipt)}
        receipt={receipt}
        onClose={() => setReceipt(null)}
        onDownload={(node) => (receipt ? downloadReceipt(receipt, node) : null)}
        onShare={(node) => (receipt ? shareReceipt(receipt, node) : Promise.resolve({ mode: 'none' }))}
      />
    </div>
  );
}
