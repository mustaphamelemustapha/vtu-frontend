'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { Phone, Smartphone } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { buildTransactionReceipt, downloadReceipt, shareReceipt } from '@/lib/receipt';
import { normalizeTransactionStatus, sanitizeProviderMessage, waitForTransactionFinalStatus } from '@/lib/transaction-status';
import { readViewCache, writeViewCache } from '@/lib/view-cache';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { TransactionProcessingModal } from '@/components/transaction-processing-modal';
import { TransactionReceiptModal } from '@/components/transaction-receipt-modal';
import { cn } from '@/lib/utils';

function stringifyList(items) {
  return Array.isArray(items) ? items.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function normalizeNetwork(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('9mobile') || raw.includes('etisalat') || raw === '9' || raw.includes('t2')) return '9mobile';
  if (raw.includes('mtn')) return 'mtn';
  if (raw.includes('airtel')) return 'airtel';
  if (raw.includes('glo')) return 'glo';
  return raw;
}

function networkLabel(value) {
  const key = normalizeNetwork(value);
  if (key === '9mobile') return '9mobile';
  return key ? key.toUpperCase() : '—';
}

function networkLogoSrc(value) {
  const key = normalizeNetwork(value);
  if (key === 'mtn') return '/brand/networks/mtn.png';
  if (key === 'airtel') return '/brand/networks/airtel.png';
  if (key === 'glo') return '/brand/networks/glo.png';
  if (key === '9mobile') return '/brand/networks/9mobile.png';
  return '/brand/networks/mtn.png';
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function validNigerianPhone(value) {
  const digits = normalizePhone(value);
  return /^0[789][01]\d{8}$/.test(digits) || /^234[789][01]\d{8}$/.test(digits);
}

const defaultRecentRecipients = ['08012345678', '08134567890', '09023456789'];
const CACHE_KEY = 'airtime:v1';

export default function AirtimePage() {
  const [catalog, setCatalog] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [processingOpen, setProcessingOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [network, setNetwork] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');

  const load = useCallback(async () => {
    const cached = readViewCache(CACHE_KEY, 10 * 60 * 1000);
    if (cached) {
      if (cached.catalog) setCatalog(cached.catalog);
      if (cached.wallet) setWallet(cached.wallet);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setLoadError('');
    try {
      const [catalogRes, walletRes] = await Promise.allSettled([apiFetch('/services/catalog'), apiFetch('/wallet/me')]);
      let nextCatalog = cached?.catalog || null;
      let nextWallet = cached?.wallet || null;
      if (catalogRes.status === 'fulfilled') {
        nextCatalog = catalogRes.value;
        setCatalog(nextCatalog);
      } else {
        if (!cached?.catalog) {
          setCatalog(null);
          setLoadError('Service catalog is currently unavailable. Please try again shortly.');
        }
      }
      if (walletRes.status === 'fulfilled') {
        nextWallet = walletRes.value;
        setWallet(nextWallet);
      }
      if (nextCatalog || nextWallet) {
        writeViewCache(CACHE_KEY, { catalog: nextCatalog, wallet: nextWallet });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const networks = stringifyList(catalog?.airtime_networks).map((item) => normalizeNetwork(item));

  useEffect(() => {
    if (!network && networks.length) setNetwork(networks[0]);
  }, [network, networks]);

  const parsedAmount = Number.parseFloat(amount || '0');
  const cleanPhone = normalizePhone(phone);
  const phoneError = cleanPhone && !validNigerianPhone(phone) ? 'Enter a valid Nigerian phone number.' : '';
  const amountError = amount && (!Number.isFinite(parsedAmount) || parsedAmount <= 0) ? 'Enter a valid airtime amount.' : '';
  const canSubmit = Boolean(network && cleanPhone && !phoneError && Number.isFinite(parsedAmount) && parsedAmount > 0 && !busy);

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
        apiFetch('/services/airtime/purchase', {
          method: 'POST',
          body: JSON.stringify({
            client_request_id: `web-airtime-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            network,
            phone_number: cleanPhone,
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
          ? 'Airtime delivered successfully.'
          : status === 'pending'
            ? 'Airtime request submitted and awaiting provider confirmation.'
            : 'Airtime request submitted.';
      nextReceipt =
        buildTransactionReceipt({
          service: 'Airtime Purchase',
          status: status === 'failed' ? 'failed' : status === 'success' ? 'success' : 'pending',
          message: sanitizeProviderMessage(res?.message) || baseMessage,
          amount: parsedAmount,
          reference: res?.reference || '—',
          phone: cleanPhone,
          meta: [{ label: 'Network', value: network === '9mobile' ? '9mobile' : network.toUpperCase() }],
        });
      setAmount('');
    } catch (err) {
      nextReceipt =
        buildTransactionReceipt({
          service: 'Airtime Purchase',
          status: 'failed',
          message: sanitizeProviderMessage(err?.message) || 'Unable to complete airtime purchase right now.',
          amount: parsedAmount,
          phone: cleanPhone,
          meta: [{ label: 'Network', value: network === '9mobile' ? '9mobile' : network.toUpperCase() }],
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
      load().catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, [receipt, load]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Services"
        title="Airtime"
        description="Top up supported Nigerian networks from a clean airtime workspace."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Buy Airtime</CardTitle>
            <CardDescription>Select network, enter phone number, set amount, and submit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="axis-label">Network</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {networks.map((item) => {
                  const active = network === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setNetwork(item)}
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
                            src={networkLogoSrc(item)}
                            alt={`${networkLabel(item)} logo`}
                            width={42}
                            height={42}
                            className="h-full w-full object-contain"
                            unoptimized
                          />
                        </div>
                        <Badge className="border-border bg-card text-muted-foreground">live</Badge>
                      </div>
                      <div className="mt-3 text-base font-semibold text-foreground">{networkLabel(item)}</div>
                      <div className="text-xs text-muted-foreground">Available now</div>
                    </button>
                  );
                })}
                {!networks.length ? (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary px-4 py-3 text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">
                    Network catalog is still loading.
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
                <div className="axis-label">Phone number</div>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="08012345678 or 2348012345678"
                />
                <p className={cn('text-xs', phoneError ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                  {phoneError || 'Use 08012345678 or 2348012345678 format.'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="axis-label">Amount (NGN)</div>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="500" />
                <p className={cn('text-xs', amountError ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                  {amountError || 'Enter the airtime amount to charge your wallet.'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="axis-label">Recent recipients</div>
              <div className="flex flex-wrap gap-2">
                {defaultRecentRecipients.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setPhone(entry)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={submit} disabled={!canSubmit} className="w-full sm:w-auto">
              <Smartphone className="h-4 w-4" />
              {busy ? 'Processing...' : 'Buy Airtime'}
            </Button>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
            <CardDescription>Live preview before purchase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-primary">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Airtime purchase</div>
                  <div className="text-xs text-muted-foreground">Wallet-funded transaction</div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium text-foreground">{networkLabel(network)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium text-foreground">{cleanPhone || '—'}</span>
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
