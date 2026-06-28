'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Tv2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { PremiumReceipt } from '@/components/service-ui';

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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [provider, setProvider] = useState('');
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [packageCode, setPackageCode] = useState('');
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
    setBusy(true);
    setMessage('');
    try {
      const res = await apiFetch('/services/cable/purchase', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          smartcard_number: cleanCard,
          phone_number: cleanPhone,
          package_code: cleanPackage,
          amount: parsedAmount,
        }),
      });
      setMessage(`Cable payment submitted. Reference: ${res?.reference || '—'}`);
    } catch (err) {
      setMessage(err?.message || 'Unable to process cable payment right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-40px)] bg-background px-4 py-5 text-foreground md:-mx-6 md:-my-5 md:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10">
      <div className="space-y-6 pb-28 md:pb-8">
      <PageHeader
        eyebrow="Services"
        title="Cable TV"
        description="Renew DSTV, GOtv, or StarTimes subscriptions through the wallet with clean transaction records."
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
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Provider</div>
                  <div className="mt-2 text-sm text-muted-foreground">Choose your cable provider.</div>
                </div>
                <Badge className="border-border bg-secondary text-muted-foreground">Live catalog</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
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
                  <div className="rounded-[22px] border border-dashed border-border/50 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground sm:col-span-3 backdrop-blur-sm">
                    Provider catalog is still loading.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Smartcard / IUC number</div>
                  <div className="mt-2 text-sm text-muted-foreground">Enter the smartcard number.</div>
                </div>
                <div className="relative group">
                  <Input 
                    value={smartcardNumber} 
                    onChange={(e) => setSmartcardNumber(e.target.value)} 
                    placeholder="Enter smartcard number" 
                    className="h-[52px] md:h-14 bg-background/50 backdrop-blur-sm text-lg font-mono tracking-wider border-white/10 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all rounded-xl"
                  />
                  <div className="absolute inset-0 -z-10 bg-primary/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
                <p className={cn('text-xs font-medium', smartCardError ? 'text-rose-400' : 'text-muted-foreground')}>
                  {smartCardError || 'Registered smartcard or IUC number.'}
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
                  {phoneError || 'Used by provider for updates.'}
                </p>
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Package code</div>
                  <div className="mt-2 text-sm text-muted-foreground">Select your package.</div>
                </div>
                {packageChoices.length ? (
                  <select
                    value={packageCode}
                    onChange={(e) => setPackageCode(e.target.value)}
                    className="h-[52px] md:h-14 w-full rounded-xl border border-white/10 bg-background/50 backdrop-blur-sm px-4 py-2 text-lg tracking-wider text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 appearance-none"
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
                  <div className="relative group">
                    <Input value={packageCode} onChange={(e) => setPackageCode(e.target.value)} placeholder="e.g. dstv-padi" className="h-[52px] md:h-14 bg-background/50 backdrop-blur-sm text-lg font-mono tracking-wider border-white/10 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all rounded-xl" />
                    <div className="absolute inset-0 -z-10 bg-primary/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                  </div>
                )}
                <p className={cn('text-xs font-medium', packageError ? 'text-rose-400' : 'text-muted-foreground')}>
                  {packageError || (packageChoices.length ? 'Select package.' : 'Manual package code.')}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Amount (NGN)</div>
                  <div className="mt-2 text-sm text-muted-foreground">Enter the package amount.</div>
                </div>
                <div className="relative group">
                  <Input 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    inputMode="decimal" 
                    placeholder="5400" 
                    className="h-[52px] md:h-14 bg-background/50 backdrop-blur-sm text-lg font-mono tracking-wider border-white/10 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all rounded-xl"
                  />
                  <div className="absolute inset-0 -z-10 bg-primary/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
                <p className={cn('text-xs font-medium', amountError ? 'text-rose-400' : 'text-muted-foreground')}>
                  {amountError || 'Amount in Naira.'}
                </p>
              </div>
            </section>
          </CardContent>
        </Card>

        <div className="sticky top-6 h-fit">
          <PremiumReceipt
            title="Cable subscription"
            items={[
              { label: 'Provider', value: selectedProvider?.name || '—' },
              { label: 'Smartcard/IUC', value: cleanCard || '—' },
              { label: 'Package', value: cleanPackage || '—' },
              { label: 'Amount', value: `₦${Number.isFinite(parsedAmount) && parsedAmount > 0 ? formatMoney(parsedAmount) : '0.00'}` },
              { label: 'Wallet balance', value: `₦${formatMoney(wallet?.balance || 0)}` }
            ]}
            total={Number.isFinite(parsedAmount) && parsedAmount > 0 ? formatMoney(parsedAmount) : '0.00'}
            totalLabel="Total Cost"
            buttonText="Pay Cable"
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
