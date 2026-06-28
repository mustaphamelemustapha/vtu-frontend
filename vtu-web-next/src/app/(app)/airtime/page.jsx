'use client';

import { useCallback, useEffect, useState } from 'react';
import { Phone, RefreshCw, Smartphone } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { NetworkCard, PremiumReceipt } from '@/components/service-ui';

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

const defaultRecentRecipients = ['08012345678', '08134567890', '09023456789'];

export default function AirtimePage() {
  const [catalog, setCatalog] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [network, setNetwork] = useState('');
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

  const networks = stringifyList(catalog?.airtime_networks).map((item) => item.toLowerCase());

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
    setBusy(true);
    setMessage('');
    try {
      const res = await apiFetch('/services/airtime/purchase', {
        method: 'POST',
        body: JSON.stringify({ network, phone_number: cleanPhone, amount: parsedAmount }),
      });
      setMessage(`Airtime request submitted. Reference: ${res?.reference || '—'}`);
      setAmount('');
    } catch (err) {
      setMessage(err?.message || 'Unable to complete airtime purchase right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-40px)] bg-background px-4 py-5 text-foreground md:-mx-6 md:-my-5 md:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10">
      <div className="space-y-6 pb-28 md:pb-8">
      <PageHeader
        eyebrow="Services"
        title="Airtime"
        description="Top up supported Nigerian networks from a clean airtime workspace."
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
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Select network</div>
                  <div className="mt-2 text-sm text-muted-foreground">Choose your network to purchase airtime.</div>
                </div>
                <Badge className="border-border bg-secondary text-muted-foreground">Live catalog</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {networks.map((item) => {
                  const active = network === item;
                  return (
                    <NetworkCard
                      key={item}
                      networkKey={item}
                      label={item === '9mobile' ? '9mobile' : item.toUpperCase()}
                      selected={active}
                      onClick={() => setNetwork(item)}
                    />
                  );
                })}
                {!networks.length ? (
                  <div className="rounded-[22px] border border-dashed border-border bg-secondary px-4 py-3 text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">
                    Network catalog is still loading.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Phone number</div>
                  <div className="mt-2 text-sm text-muted-foreground">Enter the recipient phone number.</div>
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
                  {phoneError || 'Format: 080... or 234...'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Amount (NGN)</div>
                  <div className="mt-2 text-sm text-muted-foreground">Enter the airtime amount to charge.</div>
                </div>
                <div className="relative group">
                  <Input 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    inputMode="decimal" 
                    placeholder="500" 
                    className="h-[52px] md:h-14 bg-background/50 backdrop-blur-sm text-lg font-mono tracking-wider border-white/10 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all rounded-xl"
                  />
                  <div className="absolute inset-0 -z-10 bg-primary/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
                <p className={cn('text-xs font-medium', amountError ? 'text-rose-400' : 'text-muted-foreground')}>
                  {amountError || 'Enter amount in Naira.'}
                </p>
              </div>
            </section>

            <section className="space-y-4 pt-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Recent recipients</div>
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
          </CardContent>
        </Card>

        <div className="sticky top-6 h-fit">
          <PremiumReceipt
            title="Airtime purchase"
            items={[
              { label: 'Network', value: network ? (network === '9mobile' ? '9mobile' : network.toUpperCase()) : '—' },
              { label: 'Phone', value: cleanPhone || '—' },
              { label: 'Amount', value: `₦${Number.isFinite(parsedAmount) && parsedAmount > 0 ? formatMoney(parsedAmount) : '0.00'}` },
              { label: 'Wallet balance', value: `₦${formatMoney(wallet?.balance || 0)}` }
            ]}
            total={Number.isFinite(parsedAmount) && parsedAmount > 0 ? formatMoney(parsedAmount) : '0.00'}
            totalLabel="Total Cost"
            buttonText="Buy Airtime"
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
