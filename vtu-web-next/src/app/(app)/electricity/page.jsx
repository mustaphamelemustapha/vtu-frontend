'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Lightbulb, Loader2, RefreshCw, XCircle } from 'lucide-react';
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

function stringifyList(items) {
  return Array.isArray(items) ? items.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function validNigerianPhone(value) {
  const digits = normalizePhone(value);
  return /^0[789][01]\d{8}$/.test(digits) || /^234[789][01]\d{8}$/.test(digits);
}

function meterLabel(value) {
  return String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
}

const meterTypes = ['prepaid', 'postpaid'];

export default function ElectricityPage() {
  const [catalog, setCatalog] = useState(null);
  const [providerDiscos, setProviderDiscos] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [processingOpen, setProcessingOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState({ checked: false, ok: false, customerName: '', message: '' });

  const [disco, setDisco] = useState('');
  const [meterType, setMeterType] = useState('prepaid');
  const [meterNumber, setMeterNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [catalogRes, walletRes, discosRes] = await Promise.allSettled([
        apiFetch('/services/catalog'),
        apiFetch('/wallet/me'),
        apiFetch('/services/electricity/discos'),
      ]);
      if (catalogRes.status === 'fulfilled') {
        setCatalog(catalogRes.value);
      } else {
        setCatalog(null);
        setLoadError('Electricity provider catalog is unavailable right now. Please refresh.');
      }
      if (walletRes.status === 'fulfilled') setWallet(walletRes.value);
      if (discosRes.status === 'fulfilled') {
        const rows = Array.isArray(discosRes.value?.discos) ? discosRes.value.discos : [];
        setProviderDiscos(
          rows
            .map((row) => ({
              id: String(row?.id || '').trim().toLowerCase(),
              name: String(row?.name || '').trim(),
              code: String(row?.code || '').trim(),
            }))
            .filter((row) => row.id)
        );
      } else {
        setProviderDiscos([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const discos = useMemo(() => {
    if (providerDiscos.length) return providerDiscos;
    return stringifyList(catalog?.electricity_discos).map((id) => ({
      id: String(id || '').trim().toLowerCase(),
      name: meterLabel(id),
      code: '',
    }));
  }, [providerDiscos, catalog]);

  useEffect(() => {
    if (!disco && discos.length) setDisco(discos[0].id);
  }, [disco, discos]);

  useEffect(() => {
    setVerification({ checked: false, ok: false, customerName: '', message: '' });
  }, [disco, meterType, meterNumber]);

  const parsedAmount = Number.parseFloat(amount || '0');
  const cleanPhone = normalizePhone(phone);
  const cleanMeter = String(meterNumber || '').trim();

  const phoneError = cleanPhone && !validNigerianPhone(phone) ? 'Enter a valid Nigerian phone number.' : '';
  const meterError = meterNumber && cleanMeter.length < 5 ? 'Enter a valid meter number.' : '';
  const amountError = amount && (!Number.isFinite(parsedAmount) || parsedAmount <= 0) ? 'Enter a valid amount.' : '';
  const canSubmit = Boolean(
    disco && meterType && cleanMeter && cleanPhone && !phoneError && !meterError && Number.isFinite(parsedAmount) && parsedAmount > 0 && !busy && verification.ok
  );
  const selectedDisco = useMemo(() => discos.find((item) => item.id === disco), [discos, disco]);
  const summaryDisco = selectedDisco?.name || meterLabel(disco) || '—';
  const lookupReady = Boolean(disco && meterType && cleanMeter.length >= 5 && !verifying);

  const verifyMeter = async () => {
    if (!lookupReady) return;
    setVerifying(true);
    setVerification({ checked: false, ok: false, customerName: '', message: '' });
    try {
      const res = await apiFetch('/services/electricity/verify-meter', {
        method: 'POST',
        body: JSON.stringify({
          disco,
          meter_type: meterType,
          meter_number: cleanMeter,
        }),
      });
      const ok = Boolean(res?.ok);
      setVerification({
        checked: true,
        ok,
        customerName: ok ? String(res?.customer_name || '').trim() : '',
        message: ok ? 'Meter verified successfully.' : String(res?.message || 'Unable to verify meter number.'),
      });
    } catch (err) {
      setVerification({
        checked: true,
        ok: false,
        customerName: '',
        message: err?.message || 'Unable to verify meter number right now.',
      });
    } finally {
      setVerifying(false);
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
        apiFetch('/services/electricity/purchase', {
          method: 'POST',
          body: JSON.stringify({
            client_request_id: `web-electricity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            disco,
            meter_type: meterType,
            meter_number: cleanMeter,
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
      const tokenLine = res?.token ? ` Token: ${res.token}` : '';
      const status = String(res?.status || '').toLowerCase();
      const baseMessage =
        status === 'success'
          ? 'Electricity payment completed.'
          : status === 'pending'
            ? 'Electricity payment is pending provider confirmation.'
            : 'Electricity payment submitted.';
      nextReceipt =
        buildTransactionReceipt({
          service: 'Electricity Payment',
          status: status === 'failed' ? 'failed' : status === 'success' ? 'success' : 'pending',
          message: `${baseMessage}${tokenLine}`.trim(),
          amount: parsedAmount,
          reference: res?.reference || '—',
          phone: cleanPhone,
          meta: [
            { label: 'Provider', value: summaryDisco },
            { label: 'Meter type', value: meterLabel(meterType) },
            { label: 'Meter number', value: cleanMeter || '—' },
            ...(verification.customerName ? [{ label: 'Customer name', value: verification.customerName }] : []),
          ],
        });
      setAmount('');
    } catch (err) {
      nextReceipt =
        buildTransactionReceipt({
          service: 'Electricity Payment',
          status: 'failed',
          message: err?.message || 'Unable to process electricity payment right now.',
          amount: parsedAmount,
          phone: cleanPhone,
          meta: [
            { label: 'Provider', value: summaryDisco },
            { label: 'Meter type', value: meterLabel(meterType) },
            { label: 'Meter number', value: cleanMeter || '—' },
            ...(verification.customerName ? [{ label: 'Customer name', value: verification.customerName }] : []),
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
        title="Electricity"
        description="Pay electricity bills with meter details, amount, and a clean wallet-funded checkout flow."
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
            <CardTitle>Pay electricity bill</CardTitle>
            <CardDescription>Select disco, meter type, and payment details before checkout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="axis-label">Disco / Provider</div>
                <select
                  value={disco}
                  onChange={(e) => setDisco(e.target.value)}
                  className="flex h-11 w-full rounded-2xl border border-border bg-input px-4 py-2 text-sm text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                >
                  {!discos.length ? <option value="">Loading providers...</option> : null}
                  {discos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name || meterLabel(item.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="axis-label">Meter type</div>
                <div className="grid grid-cols-2 gap-2">
                  {meterTypes.map((item) => {
                    const active = meterType === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setMeterType(item)}
                        className={cn(
                          'rounded-2xl border px-4 py-3 text-sm font-medium transition',
                          active
                            ? 'border-primary/35 bg-primary/10 text-foreground'
                            : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                        )}
                      >
                        {meterLabel(item)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {loadError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/35 dark:bg-rose-500/12 dark:text-rose-100">
                {loadError}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="axis-label">Meter number</div>
                <Input value={meterNumber} onChange={(e) => setMeterNumber(e.target.value)} placeholder="Enter meter number" />
                <p className={cn('text-xs', meterError ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                  {meterError || 'Use the meter number exactly as registered.'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="axis-label">Phone number</div>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="08012345678" />
                <p className={cn('text-xs', phoneError ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                  {phoneError || 'Used for provider notifications.'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="axis-label">Amount (NGN)</div>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="5000" />
              <p className={cn('text-xs', amountError ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                {amountError || 'Enter the bill amount to charge your wallet.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                disabled={!lookupReady || verifying}
                onClick={verifyMeter}
                className="min-w-[140px] border-border bg-card font-medium text-foreground hover:bg-secondary disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Verify Meter'
                )}
              </Button>
              <Button onClick={submit} disabled={!canSubmit}>
                <Lightbulb className="h-4 w-4" />
                {busy ? 'Processing...' : 'Pay Electricity'}
              </Button>
            </div>

            {verification.checked ? (
              verification.ok ? (
                /* ── SUCCESS CARD ─────────────────────────────────────────── */
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-4 dark:bg-emerald-950/40">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-widest text-emerald-500">Verified</span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Customer Name</p>
                      <p className="break-words text-lg font-bold tracking-wide text-zinc-900 dark:text-white">
                        {verification.customerName || 'Verified Customer'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── ERROR CARD ───────────────────────────────────────────── */
                <div className="rounded-2xl border border-rose-500/25 bg-rose-500/8 p-4 dark:bg-rose-950/40">
                  <div className="flex items-start gap-3">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-rose-500 dark:text-rose-400">Verification Failed</p>
                      <p className="mt-0.5 break-words text-sm text-rose-700 dark:text-rose-300">
                        {verification.message || 'Unable to verify meter number.'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            ) : null}

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
            <CardDescription>Review details before payment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary p-4">
              <div className="text-sm font-semibold text-foreground">Electricity bill payment</div>
              <div className="mt-1 text-xs text-muted-foreground">Token receipts are tracked in history.</div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Disco</span>
                <span className="font-medium text-foreground">{summaryDisco}</span>
              </div>
              {selectedDisco?.code ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Disco code</span>
                  <span className="font-medium text-foreground">{selectedDisco.code}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Meter type</span>
                <span className="font-medium text-foreground">{meterLabel(meterType)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Meter number</span>
                <span className="font-medium text-foreground">{cleanMeter || '—'}</span>
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
