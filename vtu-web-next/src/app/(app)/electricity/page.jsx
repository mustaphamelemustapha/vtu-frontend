'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';
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
  const digits = normalizePhone(value);
  return /^0[789][01]\d{8}$/.test(digits) || /^234[789][01]\d{8}$/.test(digits);
}

function meterLabel(value) {
  return String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
}

const meterTypes = ['prepaid', 'postpaid'];

export default function ElectricityPage() {
  const [catalog, setCatalog] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [disco, setDisco] = useState('');
  const [meterType, setMeterType] = useState('prepaid');
  const [meterNumber, setMeterNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');

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

  const discos = stringifyList(catalog?.electricity_discos);

  useEffect(() => {
    if (!disco && discos.length) setDisco(discos[0]);
  }, [disco, discos]);

  const parsedAmount = Number.parseFloat(amount || '0');
  const cleanPhone = normalizePhone(phone);
  const cleanMeter = String(meterNumber || '').trim();

  const phoneError = cleanPhone && !validNigerianPhone(phone) ? 'Enter a valid Nigerian phone number.' : '';
  const meterError = meterNumber && cleanMeter.length < 5 ? 'Enter a valid meter number.' : '';
  const amountError = amount && (!Number.isFinite(parsedAmount) || parsedAmount <= 0) ? 'Enter a valid amount.' : '';
  const canSubmit = Boolean(
    disco && meterType && cleanMeter && cleanPhone && !phoneError && !meterError && Number.isFinite(parsedAmount) && parsedAmount > 0 && !busy
  );

  const lookupReady = false;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await apiFetch('/services/electricity/purchase', {
        method: 'POST',
        body: JSON.stringify({
          disco,
          meter_type: meterType,
          meter_number: cleanMeter,
          phone_number: cleanPhone,
          amount: parsedAmount,
        }),
      });
      const tokenLine = res?.token ? ` Token: ${res.token}` : '';
      setMessage(`Electricity payment submitted. Reference: ${res?.reference || '—'}.${tokenLine}`);
      setAmount('');
    } catch (err) {
      setMessage(err?.message || 'Unable to process electricity payment right now.');
    } finally {
      setBusy(false);
    }
  };

  const summaryDisco = meterLabel(disco) || '—';

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-40px)] bg-background px-4 py-5 text-foreground md:-mx-6 md:-my-5 md:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10">
      <div className="space-y-6 pb-28 md:pb-8">
      <PageHeader
        eyebrow="Services"
        title="Electricity"
        description="Pay electricity bills with meter details, amount, and a clean wallet-funded checkout flow."
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
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Disco / Provider</div>
                <select
                  value={disco}
                  onChange={(e) => setDisco(e.target.value)}
                  className="h-[52px] md:h-14 w-full rounded-xl border border-white/10 bg-background/50 backdrop-blur-sm px-4 py-2 text-lg tracking-wider text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                  {!discos.length ? <option value="">Loading providers...</option> : null}
                  {discos.map((item) => (
                    <option key={item} value={item}>
                      {meterLabel(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-1 md:pt-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Meter type</div>
                <div className="grid grid-cols-2 gap-2 h-[52px] md:h-14">
                  {meterTypes.map((item) => {
                    const active = meterType === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setMeterType(item)}
                        className={cn(
                          'rounded-xl border px-4 h-full text-base font-medium transition backdrop-blur-sm',
                          active
                            ? 'border-primary/35 bg-primary/10 text-foreground shadow-sm'
                            : 'border-white/10 bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                        )}
                      >
                        {meterLabel(item)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Meter number</div>
                  <div className="mt-2 text-sm text-muted-foreground">Enter your meter number.</div>
                </div>
                <div className="relative group">
                  <Input 
                    value={meterNumber} 
                    onChange={(e) => setMeterNumber(e.target.value)} 
                    placeholder="Enter meter number" 
                    className="h-[52px] md:h-14 bg-background/50 backdrop-blur-sm text-lg font-mono tracking-wider border-white/10 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all rounded-xl"
                  />
                  <div className="absolute inset-0 -z-10 bg-primary/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
                <p className={cn('text-xs font-medium', meterError ? 'text-rose-400' : 'text-muted-foreground')}>
                  {meterError || 'Must match the selected Disco.'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Phone number</div>
                  <div className="mt-2 text-sm text-muted-foreground">For transaction updates.</div>
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
                  {phoneError || 'Used for provider notifications.'}
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Amount (NGN)</div>
                <div className="mt-2 text-sm text-muted-foreground">Enter the payment amount.</div>
              </div>
              <div className="relative group">
                <Input 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  inputMode="decimal" 
                  placeholder="5000" 
                  className="h-[52px] md:h-14 bg-background/50 backdrop-blur-sm text-lg font-mono tracking-wider border-white/10 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all rounded-xl"
                />
                <div className="absolute inset-0 -z-10 bg-primary/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
              </div>
              <p className={cn('text-xs font-medium', amountError ? 'text-rose-400' : 'text-muted-foreground')}>
                {amountError || 'Amount in Naira.'}
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="sticky top-6 h-fit">
          <PremiumReceipt
            title="Electricity bill payment"
            items={[
              { label: 'Disco', value: summaryDisco },
              { label: 'Meter type', value: meterLabel(meterType) },
              { label: 'Meter number', value: cleanMeter || '—' },
              { label: 'Amount', value: `₦${Number.isFinite(parsedAmount) && parsedAmount > 0 ? formatMoney(parsedAmount) : '0.00'}` },
              { label: 'Wallet balance', value: `₦${formatMoney(wallet?.balance || 0)}` }
            ]}
            total={Number.isFinite(parsedAmount) && parsedAmount > 0 ? formatMoney(parsedAmount) : '0.00'}
            totalLabel="Total Cost"
            buttonText="Pay Electricity"
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
