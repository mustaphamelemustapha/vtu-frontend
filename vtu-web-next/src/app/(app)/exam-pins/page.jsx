'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, RefreshCw, ReceiptText } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { PremiumReceipt } from '@/components/service-ui';

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

export default function ExamPinsPage() {
  const [catalog, setCatalog] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [exam, setExam] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catalogRes, walletRes] = await Promise.allSettled([apiFetch('/services/catalog'), apiFetch('/wallet/me')]);
      if (catalogRes.status === 'fulfilled') setCatalog(catalogRes.value);
      if (walletRes.status === 'fulfilled') setWallet(walletRes.value);
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
    setBusy(true);
    setMessage('');
    try {
      const res = await apiFetch('/services/exam/purchase', {
        method: 'POST',
        body: JSON.stringify({
          exam,
          quantity: qty,
          phone_number: cleanPhone || null,
        }),
      });
      const pins = Array.isArray(res?.pins) && res.pins.length ? ` Pins: ${res.pins.join(', ')}` : '';
      setMessage(`Exam PIN purchase submitted. Reference: ${res?.reference || '—'}.${pins}`);
      setQuantity('1');
    } catch (err) {
      setMessage(err?.message || 'Unable to purchase exam PINs right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-40px)] bg-background px-4 py-5 text-foreground md:-mx-6 md:-my-5 md:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10">
      <div className="space-y-6 pb-28 md:pb-8">
      <PageHeader
        eyebrow="Services"
        title="Exam PINs"
        description="Buy WAEC, NECO, or JAMB PINs from your wallet and keep the purchase record in history."
        actions={
          <Button variant="secondary" onClick={load} className="border-white/10 bg-background/50 text-muted-foreground hover:bg-card hover:text-foreground backdrop-blur-sm">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="relative overflow-hidden border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[6rem] -z-10 pointer-events-none" />
          <CardContent className="relative z-10 space-y-6 p-5 md:space-y-8 md:p-8">
            <section className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Exam body</div>
                <select
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  className="h-[52px] md:h-14 w-full rounded-xl border border-white/10 bg-background/50 backdrop-blur-sm px-4 py-2 text-lg tracking-wider text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                  {!examTypes.length ? <option value="">Loading exam types...</option> : null}
                  {examTypes.map((item) => (
                    <option key={item} value={item}>
                      {titleCase(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Quantity</div>
                  <div className="mt-2 text-sm text-muted-foreground">Number of PINs to generate.</div>
                </div>
                <div className="relative group">
                  <Input 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    inputMode="numeric" 
                    placeholder="1" 
                    className="h-[52px] md:h-14 bg-background/50 backdrop-blur-sm text-lg font-mono tracking-wider border-white/10 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all rounded-xl"
                  />
                  <div className="absolute inset-0 -z-10 bg-primary/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
                <p className={cn('text-xs font-medium', quantityError ? 'text-rose-400' : 'text-muted-foreground')}>
                  {quantityError || '1 to 10 PINs.'}
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Phone number (optional)</div>
                <div className="mt-2 text-sm text-muted-foreground">For reference purposes.</div>
              </div>
              <div className="relative group">
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  inputMode="tel" 
                  placeholder="08012345678" 
                  className="h-[52px] md:h-14 bg-background/50 backdrop-blur-sm text-lg font-mono tracking-wider border-white/10 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all rounded-xl"
                />
                <div className="absolute inset-0 -z-10 bg-primary/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
              </div>
              <p className={cn('text-xs font-medium', phoneError ? 'text-rose-400' : 'text-muted-foreground')}>
                {phoneError || 'Optional.'}
              </p>
            </section>

            <div className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
              Receipt and purchased PIN details are tracked in your transaction history.
            </div>
          </CardContent>
        </Card>

        <div className="sticky top-6 h-fit">
          <PremiumReceipt
            title="Exam PIN purchase"
            items={[
              { label: 'Exam body', value: exam ? titleCase(exam) : '—' },
              { label: 'Quantity', value: Number.isFinite(qty) ? qty : '—' },
              { label: 'Unit price', value: `₦${formatMoney(unitPrice)}` },
              { label: 'Total', value: `₦${formatMoney(total)}` },
              { label: 'Wallet balance', value: `₦${formatMoney(wallet?.balance || 0)}` }
            ]}
            total={formatMoney(total)}
            totalLabel="Total Cost"
            buttonText="Buy PIN"
            onConfirm={submit}
            isBusy={busy}
            disabled={!canSubmit}
            errorMessage={message}
          />
        </div>
      </div>
    </div>
    </div>
  );
}
