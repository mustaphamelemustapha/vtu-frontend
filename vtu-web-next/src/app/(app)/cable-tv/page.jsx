'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Tv2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { buildTransactionReceipt, downloadReceipt, shareReceipt } from '@/lib/receipt';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { TransactionProcessingModal } from '@/components/transaction-processing-modal';
import { TransactionReceiptModal } from '@/components/transaction-receipt-modal';
import { cn } from '@/lib/utils';

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function validNigerianPhone(value) {
  const digits = normalizePhone(value);
  return /^0[789][01]\d{8}$/.test(digits) || /^234[789][01]\d{8}$/.test(digits);
}

function providerOptions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const id = String(item?.id || '').trim().toLowerCase();
      const name = String(item?.name || id || '').trim();
      return id && name ? { id, name, packages: Array.isArray(item?.packages) ? item.packages : [] } : null;
    })
    .filter(Boolean);
}

function titleCase(value) {
  return String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
}

function parseAmountFromPlanText(value) {
  const text = String(value || '');
  const match = text.match(/N\s*([\d,]+(?:\.\d+)?)/i);
  if (!match) return NaN;
  return Number.parseFloat(match[1].replace(/,/g, ''));
}

function providerLogoSrc(id) {
  const key = String(id || '').toLowerCase();
  if (key.includes('dstv')) return '/brand/networks/dstv.png';
  if (key.includes('gotv')) return '/brand/networks/gotv.png';
  if (key.includes('startimes')) return '/brand/networks/startimes.jpg';
  if (key.includes('showmax')) return '/brand/networks/showmax.jpg';
  return '/brand/axisvtu-icon.png';
}

const FALLBACK_CABLE_PACKAGES = {
  dstv: [
    { code: 'dstv-padi', name: 'DStv Padi', amount: 4400 },
    { code: 'dstv-yanga', name: 'DStv Yanga', amount: 6000 },
    { code: 'dstv-confam', name: 'DStv Confam', amount: 11000 },
    { code: 'dstv79', name: 'DStv Compact', amount: 19000 },
    { code: 'dstv7', name: 'DStv Compact Plus', amount: 30000 },
    { code: 'dstv3', name: 'DStv Premium', amount: 44500 },
    { code: 'dstv9', name: 'DStv Premium French', amount: 69000 },
    { code: 'dstv10', name: 'DStv Premium Asia', amount: 50500 },
    { code: 'dstv-greatwall', name: 'DStv Great Wall', amount: 3800 },
    { code: 'frenchplus-addon', name: 'DStv French Plus Add-on', amount: 24500 },
    { code: 'frenchtouch-addon', name: 'DStv French Touch Add-on', amount: 7000 },
    { code: 'dstv-padi-showmax', name: 'DStv Padi + Showmax', amount: 8900 },
    { code: 'dstv-yanga-showmax', name: 'DStv Yanga + Showmax', amount: 8250 },
    { code: 'dstv-confam-showmax', name: 'DStv Confam + Showmax', amount: 13250 },
    { code: 'dstv-compact-showmax', name: 'DStv Compact + Showmax', amount: 21250 },
    { code: 'dstv-compact-plus-showmax', name: 'DStv Compact Plus + Showmax', amount: 32250 },
    { code: 'dstv-premium-showmax', name: 'DStv Premium + Showmax', amount: 44500 },
    { code: 'dstv-showmax-premier-league', name: 'DStv Showmax Premier League Add-on', amount: 3600 },
  ],
};

function fallbackPackagesForProvider(providerId) {
  const key = String(providerId || '').trim().toLowerCase();
  const rows = FALLBACK_CABLE_PACKAGES[key] || [];
  return rows.map((item) => ({ ...item, provider: key }));
}

export default function CableTvPage() {
  const [catalog, setCatalog] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [processingOpen, setProcessingOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [packageLoading, setPackageLoading] = useState(false);
  const [packageLoadError, setPackageLoadError] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyResult, setVerifyResult] = useState({ ok: false, customerName: '', message: '' });

  const [provider, setProvider] = useState('');
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [packageCode, setPackageCode] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [catalogRes, walletRes] = await Promise.allSettled([apiFetch('/services/catalog'), apiFetch('/wallet/me')]);
      if (catalogRes.status === 'fulfilled') {
        setCatalog(catalogRes.value);
      } else {
        setCatalog(null);
        setLoadError('Cable provider catalog is unavailable right now. Please refresh.');
      }
      if (walletRes.status === 'fulfilled') setWallet(walletRes.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const providers = useMemo(() => providerOptions(catalog?.cable_providers), [catalog?.cable_providers]);

  useEffect(() => {
    if (!provider && providers.length) setProvider(providers[0].id);
  }, [provider, providers]);

  const selectedProvider = providers.find((item) => item.id === provider) || null;
  const packageChoices = Array.isArray(selectedProvider?.packages) ? selectedProvider.packages : [];

  const loadProviderPackages = useCallback(async (providerId) => {
    if (!providerId) return;
    setPackageLoading(true);
    setPackageLoadError('');
    setVerifyResult({ ok: false, customerName: '', message: '' });
    try {
      const data = await apiFetch(`/services/cable/packages?provider=${encodeURIComponent(providerId)}`);
      const fetchedRows = Array.isArray(data?.packages) ? data.packages : [];
      const rows = fetchedRows.length ? fetchedRows : fallbackPackagesForProvider(providerId);
      setCatalog((prev) => {
        const current = Array.isArray(prev?.cable_providers) ? prev.cable_providers : [];
        const nextProviders = current.map((item) => {
          const id = String(item?.id || '').trim().toLowerCase();
          if (id !== providerId) return item;
          return { ...item, packages: rows };
        });
        return { ...(prev || {}), cable_providers: nextProviders };
      });
    } catch {
      setCatalog((prev) => {
        const current = Array.isArray(prev?.cable_providers) ? prev.cable_providers : [];
        const nextProviders = current.map((item) => {
          const id = String(item?.id || '').trim().toLowerCase();
          if (id !== providerId) return item;
          return { ...item, packages: fallbackPackagesForProvider(providerId) };
        });
        return { ...(prev || {}), cable_providers: nextProviders };
      });
      setPackageLoadError('Unable to load package list from provider. Showing available fallback plans where possible.');
    } finally {
      setPackageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!provider) return;
    loadProviderPackages(provider).catch(() => {});
  }, [provider, loadProviderPackages]);

  useEffect(() => {
    if (packageChoices.length > 0 && !packageCode) {
      const first = packageChoices[0];
      setPackageCode(String(first?.code || first?.id || '').trim());
    }
  }, [packageChoices, packageCode]);
  const selectedPackage = packageChoices.find((item) => String(item?.code || item?.id || '').trim() === packageCode) || null;
  const planAmountRaw = Number.parseFloat(String(selectedPackage?.amount ?? ''));
  const parsedAmount = Number.isFinite(planAmountRaw) && planAmountRaw > 0 ? planAmountRaw : parseAmountFromPlanText(selectedPackage?.name);
  const cleanPhone = normalizePhone(phone);
  const cleanCard = String(smartcardNumber || '').trim();
  const cleanPackage = String(packageCode || '').trim();

  const phoneError = cleanPhone && !validNigerianPhone(phone) ? 'Enter a valid Nigerian phone number.' : '';
  const smartCardError = smartcardNumber && cleanCard.length < 5 ? 'Enter a valid smartcard or IUC number.' : '';
  const packageError = packageCode && !cleanPackage ? 'Enter a package code.' : '';
  const amountError = cleanPackage && (!Number.isFinite(parsedAmount) || parsedAmount <= 0) ? 'Selected plan amount is unavailable.' : '';
  const canSubmit = Boolean(
    provider && cleanCard && cleanPhone && cleanPackage && !phoneError && !smartCardError && !packageError && !amountError && Number.isFinite(parsedAmount) && parsedAmount > 0 && !busy
  );

  const verifySmartcard = async () => {
    const card = String(smartcardNumber || '').trim();
    if (!provider || card.length < 5 || verifyBusy) return;
    setVerifyBusy(true);
    setVerifyResult({ ok: false, customerName: '', message: '' });
    try {
      const res = await apiFetch('/services/cable/verify', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          smartcard_number: card,
        }),
      });
      const ok = Boolean(res?.ok);
      setVerifyResult({
        ok,
        customerName: ok ? String(res?.customer_name || '').trim() : '',
        message: ok ? 'Smartcard verified successfully.' : String(res?.message || 'Unable to verify smartcard number.'),
      });
    } catch (err) {
      setVerifyResult({
        ok: false,
        customerName: '',
        message: err?.message || 'Unable to verify smartcard right now.',
      });
    } finally {
      setVerifyBusy(false);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    const startedAt = Date.now();
    setBusy(true);
    setProcessingOpen(true);
    setReceipt(null);
    let nextReceipt = null;
    try {
      const timeoutMs = 30000;
      const res = await Promise.race([
        apiFetch('/services/cable/purchase', {
          method: 'POST',
          body: JSON.stringify({
            client_request_id: `web-cable-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            provider,
            smartcard_number: cleanCard,
            phone_number: cleanPhone,
            package_code: cleanPackage,
            amount: parsedAmount,
          }),
        }),
        new Promise((_, reject) => {
          setTimeout(() => {
            const timeoutError = new Error('Transaction timed out. Please try again.');
            timeoutError.code = 'REQUEST_TIMEOUT';
            reject(timeoutError);
          }, timeoutMs);
        }),
      ]);
      const status = String(res?.status || '').toLowerCase();
      const baseMessage =
        status === 'success'
          ? 'Cable payment completed.'
          : status === 'pending'
            ? 'Cable payment is pending provider confirmation.'
            : 'Cable payment submitted.';
      nextReceipt =
        buildTransactionReceipt({
          service: 'Cable TV Payment',
          status: status === 'failed' ? 'failed' : status === 'success' ? 'success' : 'pending',
          message: baseMessage,
          amount: parsedAmount,
          reference: res?.reference || '—',
          phone: cleanPhone,
          meta: [
            { label: 'Provider', value: selectedProvider?.name || '—' },
            { label: 'Smartcard / IUC', value: cleanCard || '—' },
            { label: 'Package', value: cleanPackage || '—' },
          ],
        });
    } catch (err) {
      nextReceipt =
        buildTransactionReceipt({
          service: 'Cable TV Payment',
          status: 'failed',
          message: err?.message || 'Unable to process cable payment right now.',
          amount: parsedAmount,
          phone: cleanPhone,
          meta: [
            { label: 'Provider', value: selectedProvider?.name || '—' },
            { label: 'Smartcard / IUC', value: cleanCard || '—' },
            { label: 'Package', value: cleanPackage || '—' },
          ],
        });
    } finally {
      const elapsed = Date.now() - startedAt;
      const minimumProcessingMs = 700;
      if (elapsed < minimumProcessingMs) {
        await new Promise((resolve) => setTimeout(resolve, minimumProcessingMs - elapsed));
      }
      setBusy(false);
      setProcessingOpen(false);
      if (nextReceipt) {
        setTimeout(() => {
          setReceipt(nextReceipt);
        }, 120);
      }
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Services"
        title="Cable TV"
        description="Renew DSTV, GOtv, or StarTimes subscriptions through the wallet with clean transaction records."
        actions={
          <Button variant="secondary" onClick={load} className="border-border bg-card text-muted-foreground hover:bg-secondary">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Pay Cable TV</CardTitle>
            <CardDescription>Choose provider, enter smartcard details, select package, and submit payment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="axis-label">Provider</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {providers.map((item) => {
                  const active = provider === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setProvider(item.id);
                        setPackageCode('');
                        setVerifyResult({ ok: false, customerName: '', message: '' });
                      }}
                      className={cn(
                        'rounded-2xl border px-4 py-4 text-left text-sm transition',
                        active
                          ? 'border-primary/45 bg-primary/12 text-foreground shadow-[0_0_0_1px_rgba(245,158,11,0.14)]'
                          : 'border-border bg-secondary text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white p-1 ring-1 ring-border">
                          <Image
                            src={providerLogoSrc(item.id)}
                            alt={`${item.name} logo`}
                            width={42}
                            height={42}
                            className="h-full w-full object-contain"
                            unoptimized
                          />
                        </div>
                        <Badge className="border-border bg-card text-muted-foreground">live</Badge>
                      </div>
                      <div className="mt-3 text-base font-semibold text-foreground">{titleCase(item.name)}</div>
                      <div className="text-xs text-muted-foreground">Available now</div>
                    </button>
                  );
                })}
                {!providers.length ? (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary px-4 py-3 text-sm text-muted-foreground sm:col-span-3">
                    Provider catalog is still loading.
                  </div>
                ) : null}
              </div>
            </div>

            {loadError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/35 dark:bg-rose-500/12 dark:text-rose-100">
                {loadError}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="axis-label">Smartcard / IUC number</div>
                <Input value={smartcardNumber} onChange={(e) => setSmartcardNumber(e.target.value)} placeholder="Enter smartcard number" />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={verifySmartcard}
                    disabled={!provider || cleanCard.length < 5 || verifyBusy || busy}
                    className="h-9 border-border bg-card px-3 text-xs text-muted-foreground hover:bg-secondary"
                  >
                    {verifyBusy ? 'Verifying...' : 'Verify smartcard'}
                  </Button>
                  {verifyResult.ok ? (
                    <Badge tone="success" className="text-xs">
                      {verifyResult.customerName || 'Verified'}
                    </Badge>
                  ) : verifyResult.message ? (
                    <Badge tone="warning" className="text-xs">
                      {verifyResult.message}
                    </Badge>
                  ) : null}
                </div>
                <p className={cn('text-xs', smartCardError ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                  {smartCardError || 'Use the registered smartcard or IUC number.'}
                </p>
              </div>
              <div className="space-y-2">
                <div className="axis-label">Phone number</div>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="08012345678" />
                <p className={cn('text-xs', phoneError ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                  {phoneError || 'Used by provider for transaction updates.'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="axis-label">Cable plan</div>
                <select
                  value={packageCode}
                  onChange={(e) => setPackageCode(e.target.value)}
                  disabled={packageLoading || !provider || !packageChoices.length}
                  className="flex h-11 w-full rounded-2xl border border-border bg-input px-4 py-2 text-sm text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="">
                    {packageLoading
                      ? 'Loading plans…'
                      : !provider
                        ? 'Select provider first'
                        : packageChoices.length
                          ? 'Select a plan'
                          : 'No plans available for this provider'}
                  </option>
                  {packageChoices.map((item) => {
                    const code = String(item?.code || item?.id || '').trim();
                    const label = String(item?.name || code || '').trim();
                    const planAmountRaw = Number.parseFloat(String(item?.amount ?? ''));
                    const planAmount = Number.isFinite(planAmountRaw) && planAmountRaw > 0 ? planAmountRaw : parseAmountFromPlanText(label);
                    const amountLabel =
                      Number.isFinite(planAmount) && planAmount > 0 ? ` — ₦${formatMoney(planAmount)}` : '';
                    return (
                      <option key={code} value={code}>
                        {`${label} (${code})${amountLabel}`}
                      </option>
                    );
                  })}
                </select>
                <p className={cn('text-xs', packageError ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                  {packageError || (packageChoices.length ? 'Plan list updates automatically for selected provider.' : 'No plans found yet. Tap refresh packages.')}
                </p>
                {packageLoading ? <p className="text-xs text-muted-foreground">Loading live package list…</p> : null}
                {packageLoadError ? <p className="text-xs text-amber-600 dark:text-amber-300">{packageLoadError}</p> : null}
              </div>

              <div className="space-y-2">
                <div className="axis-label">Plan amount</div>
                <div className="flex h-11 w-full items-center rounded-2xl border border-border bg-secondary px-4 text-sm font-medium text-foreground">
                  {Number.isFinite(parsedAmount) && parsedAmount > 0 ? `₦${formatMoney(parsedAmount)}` : 'Select a cable plan'}
                </div>
                <p className={cn('text-xs', amountError ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                  {amountError || 'No manual amount entry needed. Price is attached to your selected package.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => loadProviderPackages(provider)} disabled={!provider || packageLoading} className="border-border bg-card text-muted-foreground">
                {packageLoading ? 'Refreshing packages…' : 'Refresh packages'}
              </Button>
              <Button onClick={submit} disabled={!canSubmit}>
                <Tv2 className="h-4 w-4" />
                {busy ? 'Processing...' : 'Pay Cable'}
              </Button>
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
            <CardDescription>Live preview before payment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary p-4">
              <div className="text-sm font-semibold text-foreground">Cable subscription</div>
              <div className="mt-1 text-xs text-muted-foreground">Receipts remain available in transaction history.</div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium text-foreground">{selectedProvider?.name || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Smartcard/IUC</span>
                <span className="font-medium text-foreground">{cleanCard || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Package</span>
                <span className="font-medium text-foreground">{selectedPackage?.name || cleanPackage || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-foreground">₦{Number.isFinite(parsedAmount) && parsedAmount > 0 ? formatMoney(parsedAmount) : '0.00'}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Wallet balance</span>
                  <Badge tone="neutral" className="border-border bg-card text-muted-foreground">
                    ₦{formatMoney(wallet?.balance || 0)}
                  </Badge>
                </div>
              </div>
              {!packageChoices.length ? (
                <div className="rounded-2xl border border-dashed border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                  No package list available for this provider right now.
                </div>
              ) : null}
              {verifyResult.ok ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  Verified customer: {verifyResult.customerName}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <TransactionProcessingModal open={busy || processingOpen} />
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
