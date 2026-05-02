'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, ReceiptText } from 'lucide-react';
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

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function validNigerianPhone(value) {
  if (!value) return true;
  const digits = normalizePhone(value);
  return /^0[789][01]\d{8}$/.test(digits) || /^234[789][01]\d{8}$/.test(digits);
}

function titleCase(value) {
  return String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
}

const unitPrice = 2000;
const CACHE_KEY = 'exam-pins:v1';

export default function ExamPinsPage() {
  const [catalog, setCatalog] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [processingOpen, setProcessingOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const [exam, setExam] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [phone, setPhone] = useState('');

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
          setLoadError('Exam PIN catalog is unavailable right now. Please try again shortly.');
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

  const examTypes = stringifyList(catalog?.exam_types);

  useEffect(() => {
    if (!exam && examTypes.length) setExam(examTypes[0]);
  }, [exam, examTypes]);

  const qty = Number.parseInt(quantity || '0', 10);
  const cleanPhone = normalizePhone(phone);
  const phoneError = cleanPhone && !validNigerianPhone(phone) ? 'Enter a valid Nigerian phone number or leave it empty.' : '';
  const quantityError = quantity && (!Number.isFinite(qty) || qty < 1 || qty > 10) ? 'Quantity must be between 1 and 10.' : '';
  const total = Number.isFinite(qty) && qty > 0 ? qty * unitPrice : 0;

  const canSubmit = Boolean(exam && Number.isFinite(qty) && qty >= 1 && qty <= 10 && !phoneError && !quantityError && !busy);

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
        apiFetch('/services/exam/purchase', {
          method: 'POST',
          body: JSON.stringify({
            client_request_id: `web-exam-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            exam,
            quantity: qty,
            phone_number: cleanPhone || null,
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
      const pins = Array.isArray(res?.pins) && res.pins.length ? ` Pins: ${res.pins.join(', ')}` : '';
      const status = String(res?.status || '').toLowerCase();
      const baseMessage =
        status === 'success'
          ? 'Exam PIN purchase completed.'
          : status === 'pending'
            ? 'Exam PIN request submitted and awaiting provider confirmation.'
            : 'Exam PIN purchase submitted.';
      nextReceipt =
        buildTransactionReceipt({
          service: 'Exam PIN Purchase',
          status: status === 'failed' ? 'failed' : status === 'success' ? 'success' : 'pending',
          message: sanitizeProviderMessage(`${res?.message || ''} ${baseMessage}${pins ? ` ${pins.trim()}` : ''}`.trim()) || `${baseMessage}${pins ? ` ${pins.trim()}` : ''}`.trim(),
          amount: total,
          reference: res?.reference || '—',
          phone: cleanPhone,
          meta: [
            { label: 'Exam body', value: exam ? titleCase(exam) : '—' },
            { label: 'Quantity', value: Number.isFinite(qty) ? qty : '—' },
          ],
        });
      setQuantity('1');
    } catch (err) {
      nextReceipt =
        buildTransactionReceipt({
          service: 'Exam PIN Purchase',
          status: 'failed',
          message: sanitizeProviderMessage(err?.message) || 'Unable to purchase exam PINs right now.',
          amount: total,
          phone: cleanPhone,
          meta: [
            { label: 'Exam body', value: exam ? titleCase(exam) : '—' },
            { label: 'Quantity', value: Number.isFinite(qty) ? qty : '—' },
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
    <div className="-mx-4 -my-5 min-h-[calc(100vh-40px)] overflow-x-clip bg-background px-4 py-5 text-foreground md:-mx-6 md:-my-5 md:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10">
      <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Services"
        title="Exam PINs"
        description="Buy WAEC, NECO, or JAMB PINs from your wallet and keep the purchase record in history."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden rounded-[24px] border-border bg-card shadow-[0_16px_42px_rgba(2,6,23,0.12)]">
          <CardHeader>
            <CardTitle>Buy Exam PIN</CardTitle>
            <CardDescription>Choose exam body, quantity, and optional phone reference.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="axis-label">Exam body</div>
                <select
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  className="flex h-11 w-full rounded-2xl border border-border bg-input px-4 py-2 text-sm text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                >
                  {!examTypes.length ? <option value="">Loading exam types...</option> : null}
                  {examTypes.map((item) => (
                    <option key={item} value={item}>
                      {titleCase(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="axis-label">Quantity</div>
                <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" placeholder="e.g. 1" className="placeholder:italic placeholder:text-muted-foreground/60" />
                <p className={cn('text-xs', quantityError ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                  {quantityError || 'Allowed quantity: 1 to 10 PINs.'}
                </p>
              </div>
            </div>

            {loadError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/35 dark:bg-rose-500/12 dark:text-rose-100">
                {loadError}
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="axis-label">Phone number (optional)</div>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="e.g. 08012345678" className="placeholder:italic placeholder:text-muted-foreground/60" />
              <p className={cn('text-xs', phoneError ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground')}>
                {phoneError || 'Optional, used as a customer reference.'}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
              Receipt and purchased PIN details are tracked in your transaction history.
            </div>

            <Button onClick={submit} disabled={!canSubmit} className="w-full sm:w-auto">
              <GraduationCap className="h-4 w-4" />
              {busy ? 'Processing...' : 'Buy PIN'}
            </Button>

          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[24px] border-border bg-card shadow-[0_16px_42px_rgba(2,6,23,0.12)]">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
            <CardDescription>Review quantity and payable amount.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-primary">
                  <ReceiptText className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Exam PIN purchase</div>
                  <div className="text-xs text-muted-foreground">Unit price from backend rules</div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Exam body</span>
                <span className="font-medium text-foreground">{exam ? titleCase(exam) : '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Quantity</span>
                <span className="font-medium text-foreground">{Number.isFinite(qty) ? qty : '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Unit price</span>
                <span className="font-medium text-foreground">₦{formatMoney(unitPrice)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Estimated total</span>
                <span className="font-semibold text-foreground">₦{formatMoney(total)}</span>
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
    </div>
  );
}
