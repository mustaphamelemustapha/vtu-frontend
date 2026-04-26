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
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Services"
        title="Airtime"
        description="Top up supported Nigerian networks from a clean airtime workspace."
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
            <CardTitle>Buy Airtime</CardTitle>
            <CardDescription>Select network, enter phone number, set amount, and submit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="axis-label">Network</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {networks.map((item) => {
                  const active = network === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setNetwork(item)}
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-left text-sm font-medium transition',
                        active
                          ? 'border-primary/35 bg-primary/10 text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      {item === '9mobile' ? '9mobile' : item.toUpperCase()}
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

            {message ? (
              <div className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">{message}</div>
            ) : null}
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
                <span className="font-medium text-foreground">{network ? (network === '9mobile' ? '9mobile' : network.toUpperCase()) : '—'}</span>
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
    </div>
  );
}
