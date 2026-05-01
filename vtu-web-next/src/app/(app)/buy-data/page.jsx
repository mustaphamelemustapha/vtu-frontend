'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { buildTransactionReceipt, downloadReceipt, shareReceipt } from '@/lib/receipt';
import { getDataPlansFast, prefetchDataPlans } from '@/lib/data-plans-cache';
import {
  normalizeTransactionStatus,
  sanitizeProviderMessage,
  waitForTransactionFinalStatus,
} from '@/lib/transaction-status';
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

const BLOCK_KEYWORDS = [];

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
  const networks = [...NETWORK_ORDER, ...Array.from(grouped.keys()).filter((key) => !NETWORK_ORDER.includes(key) && key !== 'other'), 'other'];
  
  for (const networkKey of networks) {
    const items = grouped.get(networkKey);
    if (!items || !items.length) continue;
    
    // Sort by price and show all plans the backend sent us
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
          message: sanitizeProviderMessage(res?.message) || (status === 'pending' ? 'Transaction submitted and being confirmed.' : 'Purchase submitted.'),
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
          message: sanitizeProviderMessage(err?.message) || 'Purchase failed.',
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

  useEffect(() => {
    if (!receipt || receipt.status !== 'pending') return undefined;
    const reference = String(receipt.reference || '').trim();
    if (!reference || reference === '—' || reference.toUpperCase() === 'N/A') return undefined;

    let cancelled = false;
    (async () => {
      const result = await waitForTransactionFinalStatus(apiFetch, reference, {
        timeoutMs: 90000,
        intervalMs: 2500,
      });
      if (cancelled || !result?.final) return;
      const finalStatus = normalizeTransactionStatus(result.status);
      const tx = result.transaction || {};

      setReceipt((prev) => {
        if (!prev) return prev;
        const mappedStatus = finalStatus === 'success' ? 'success' : 'failed';
        const nextMessage =
          mappedStatus === 'success'
            ? 'Transaction confirmed successfully.'
            : finalStatus === 'refunded'
              ? 'Transaction was reversed and wallet refunded.'
              : 'Transaction failed.';
        return {
          ...prev,
          status: mappedStatus,
          message: sanitizeProviderMessage(tx?.failure_reason || tx?.provider_message || tx?.status_message) || nextMessage,
          createdAt: tx?.created_at || prev.createdAt,
        };
      });

      load({ silent: true }).catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, [receipt, load]);

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-40px)] overflow-x-clip bg-background px-4 py-5 text-foreground md:-mx-6 md:-my-5 md:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10">
      <div className="space-y-6 pb-28 md:pb-8">
        <div className="space-y-2">
        <div className="axis-label text-muted-foreground">Services</div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Buy Data</h1>
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

        <div className="grid gap-3 md:gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden border-border bg-card shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <CardContent className="space-y-5 p-3.5 md:space-y-7 md:p-7">
            <section className="space-y-3.5 md:space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Select network</div>
                  <div className="mt-2 text-sm text-muted-foreground">Pick your preferred network to load available plans.</div>
                </div>
                <Badge className="border-primary/25 bg-primary/10 text-primary">Live catalog</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2.5 md:gap-3 xl:grid-cols-4">
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
                        'group min-h-[120px] rounded-2xl border px-3 py-3.5 text-left transition md:min-h-[140px] md:px-4 md:py-5',
                        isActive
                          ? 'border-primary/45 bg-primary/10 shadow-[0_0_0_1px_rgba(249,115,22,0.12)]'
                          : 'border-border bg-secondary hover:border-border hover:bg-secondary'
                      )}
                      >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white p-1 ring-1 ring-border md:h-12 md:w-12">
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
                      <div className="mt-3 text-[15px] font-semibold tracking-tight text-foreground md:mt-4 md:text-base">
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

            <section className="space-y-3.5 md:space-y-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Phone number</div>
                <div className="mt-2 text-sm text-muted-foreground">Enter recipient number.</div>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/70 p-2">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="e.g. 08012345678"
                  className="h-[50px] rounded-xl border-border bg-background text-base text-foreground placeholder:italic placeholder:font-medium placeholder:text-muted-foreground/50 focus:border-primary/45 focus:ring-amber-500/10 md:h-12"
                />
              </div>
              {phoneError ? (
                <p className="text-xs font-medium text-rose-300">{phoneError}</p>
              ) : null}
              <Button
                className="hidden h-12 w-full rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(249,115,22,0.18)] transition hover:bg-primary/90 active:scale-[0.98] md:inline-flex"
                onClick={purchase}
                disabled={!canSubmit}
              >
                {busy ? 'Processing...' : selected ? `Buy Data — ₦${formatMoney(summaryPrice || 0)}` : 'Buy Data'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </section>

            <section className="space-y-3.5 md:space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Select plan</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {activeNetwork === 'all' ? 'Choose from all live bundles.' : `${networkLabel(activeNetwork)} bundles ready for purchase.`}
                  </div>
                </div>
                <Badge className="border-border bg-secondary text-muted-foreground">
                  {activeNetwork === 'all' ? totalCuratedPlans : activeGroup?.plans.length || 0} plan{activeNetwork === 'all' ? (totalCuratedPlans === 1 ? '' : 's') : (activeGroup?.plans.length === 1 ? '' : 's')}
                </Badge>
              </div>

              {loading ? (
                <div className="grid gap-2.5 md:gap-3 md:grid-cols-2">
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
                <div className="grid gap-2.5 md:gap-3 md:grid-cols-2">
                  {visiblePlans.map((plan) => {
                    const isActive = selected?.plan_code === plan.plan_code;
                    return (
                      <button
                        key={plan.plan_code}
                        type="button"
                        onClick={() => setSelected(plan)}
                        className={cn(
                          'min-w-0 overflow-hidden rounded-2xl border px-3.5 py-3.5 text-left transition min-h-[136px] md:min-h-[146px] md:px-4 md:py-4',
                          isActive
                            ? 'border-primary/45 bg-primary/10 shadow-[0_0_0_1px_rgba(249,115,22,0.12)]'
                            : 'border-border bg-secondary hover:border-border hover:bg-secondary'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
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
                            <div className="min-w-0">
                            <div className="truncate text-[17px] font-semibold tracking-tight text-foreground md:text-base">{plan.plan_name || plan.plan_code}</div>
                            <div className="mt-1 truncate break-all text-[11px] text-muted-foreground/90">{plan.plan_code || 'Plan code unavailable'}</div>
                            </div>
                          </div>
                          <Badge className="shrink-0 border-border bg-secondary text-muted-foreground">
                            {plan.validity || 'Plan'}
                          </Badge>
                        </div>
                        <div className="mt-3.5 flex items-end justify-between gap-2.5 md:mt-4 md:gap-3">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Price</div>
                            <div className="mt-1 text-[30px] leading-none font-semibold tracking-tight text-foreground md:text-lg md:leading-normal">
                              ₦{formatMoney(plan.price || 0)}
                            </div>
                          </div>
                          <div className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground md:px-3 md:text-xs">{plan.data_size || '—'}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>
          </CardContent>
        </Card>

        <Card className="h-fit border-border bg-card shadow-[0_20px_60px_rgba(0,0,0,0.28)] xl:sticky xl:top-24">
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

            <div className="text-xs leading-6 text-muted-foreground">Live bundles are loaded from the backend catalog.</div>
          </CardContent>
        </Card>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 pt-2.5 shadow-[0_-18px_40px_rgba(0,0,0,0.35)] backdrop-blur md:hidden"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
      >
        <div className="mx-auto flex max-w-md items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-muted-foreground">
              {selected ? summaryPlanName : 'Select a plan to continue'}
            </div>
            <div className="mt-1 text-base font-semibold tracking-tight text-foreground">
              ₦{formatMoney(summaryPrice || 0)}
            </div>
          </div>
          <Button
            className="h-11 shrink-0 rounded-xl bg-primary px-4 text-primary-foreground shadow-[0_10px_22px_rgba(249,115,22,0.18)] transition hover:bg-primary/90 active:scale-[0.98]"
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
