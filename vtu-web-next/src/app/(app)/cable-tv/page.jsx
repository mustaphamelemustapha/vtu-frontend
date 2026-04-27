'use client';

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

export default function CableTvPage() {
  const [catalog, setCatalog] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [processingOpen, setProcessingOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const [provider, setProvider] = useState('');
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [packageCode, setPackageCode] = useState('');
  const [amount, setAmount] = useState('');

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

  useEffect(() => {
    if (packageChoices.length > 0 && !packageCode) {
      const first = packageChoices[0];
      setPackageCode(String(first?.code || first?.id || '').trim());
    }
  }, [packageChoices, packageCode]);

  const parsedAmount = Number.parseFloat(amount || '0');
  const cleanPhone = normalizePhone(phone);
  const cleanCard = String(smartcardNumber || '').trim();
  const cleanPackage = String(packageCode || '').trim();

  const phoneError = cleanPhone && !validNigerianPhone(phone) ? 'Enter a valid Nigerian phone number.' : '';
  const smartCardError = smartcardNumber && cleanCard.length < 5 ? 'Enter a valid smartcard or IUC number.' : '';
  const packageError = packageCode && !cleanPackage ? 'Enter a package code.' : '';
  const amountError = amount && (!Number.isFinite(parsedAmount) || parsedAmount <= 0) ? 'Enter a valid amount.' : '';
  const canSubmit = Boolean(
    provider && cleanCard && cleanPhone && cleanPackage && !phoneError && !smartCardError && !packageError && Number.isFinite(parsedAmount) && parsedAmount > 0 && !busy
  );

  const lookupReady = false;

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
              <div className="grid gap-2 sm:grid-cols-3">
                {providers.map((item) => {
                  const active = provider === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProvider(item.id)}
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-left text-sm font-medium transition',
                        active
                          ? 'border-primary/35 bg-primary/10 text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      {item.name}
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
                <div className="axis-label">Package code</div>
                {packageChoices.length ? (
                  <select
                    value={packageCode}
                    onChange={(e) => setPackageCode(e.target.value)}
                    className="flex h-11 w-full rounded-2xl border border-border bg-input px-4 py-2 text-sm text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                  >
                    {packageChoices.map((item) => {
                      const code = String(item?.code || item?.id || '').trim();
                      const label = String(item?.name || code || '').trim();
                      return (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <Input value={packageCode} onChange={(e) => setPackageCode(e.target.value)} placeholder="e.g. dstv-padi" />
                )}
                <p className={cn('text-xs', packageError ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                  {packageError || (packageChoices.length ? 'Package list loaded from the provider catalog.' : 'Use your package code from support or provider docs.')}
                </p>
              </div>

              <div className="space-y-2">
                <div className="axis-label">Amount (NGN)</div>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="5400" />
                <p className={cn('text-xs', amountError ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                  {amountError || 'Enter the package amount before checkout.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" disabled={!lookupReady} className="border-border bg-card text-muted-foreground">
                Customer lookup (coming soon)
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
                <span className="font-medium text-foreground">{cleanPackage || '—'}</span>
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
                  Package options are not exposed by the API yet. Enter the package code manually.
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
        onShare={() => (receipt ? shareReceipt(receipt) : Promise.resolve({ mode: 'none' }))}
      />
    </div>
  );
}
