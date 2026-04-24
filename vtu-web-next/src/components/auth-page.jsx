'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch, clearAuth, getToken, loginRequest, registerRequest, setAuthTokens, setProfile, warmBackend } from '@/lib/api';

const featureRows = [
  { title: 'Data and airtime flows', text: 'Fast-moving telco purchases with backend-backed status handling.' },
  { title: 'Wallet operations', text: 'Dedicated funding accounts, ledger visibility, and balance controls.' },
  { title: 'Referral rewards', text: 'Invite-first-deposit logic surfaced with a clean dashboard experience.' },
];

export function AuthPage({ initialMode = 'login' }) {
  const router = useRouter();
  const params = useSearchParams();
  const ref = params.get('ref') || params.get('referral') || '';
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [persist, setPersist] = useState(true);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    referral_code: ref,
  });

  useEffect(() => {
    if (getToken()) router.replace('/dashboard');
  }, [router]);

  useEffect(() => {
    if (ref) setForm((prev) => ({ ...prev, referral_code: ref }));
  }, [ref]);

  const heading = useMemo(
    () => (mode === 'register' ? 'Create AxisVTU account' : 'Welcome back'),
    [mode]
  );

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await warmBackend();
      if (mode === 'register') {
        const data = await registerRequest({
          full_name: form.full_name,
          email: form.email,
          phone_number: form.phone_number || null,
          password: form.password,
          referral_code: form.referral_code || null,
        });
        const access = data?.access_token || data?.token;
        const refresh = data?.refresh_token;
        if (access) {
          setAuthTokens(access, refresh, persist);
          const me = await apiFetch('/auth/me');
          setProfile(me);
          router.push('/dashboard');
          return;
        }
        const loginData = await loginRequest(form.email, form.password);
        setAuthTokens(loginData?.access_token || loginData?.token, loginData?.refresh_token, persist);
        const me = await apiFetch('/auth/me');
        setProfile(me);
        router.push('/dashboard');
      } else {
        const data = await loginRequest(form.email, form.password);
        setAuthTokens(data?.access_token || data?.token, data?.refresh_token, persist);
        const me = await apiFetch('/auth/me');
        setProfile(me);
        router.push('/dashboard');
      }
    } catch (err) {
      clearAuth();
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050a12]">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden border-white/8 bg-axis-radial px-6 py-10 lg:border-r lg:px-10 xl:px-12">
          <div className="absolute inset-0 axis-grid-bg opacity-40" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/20">
                <span className="text-sm font-semibold text-white">AX</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">AxisVTU</div>
                <div className="text-xs text-slate-400">Premium web workspace</div>
              </div>
            </div>

            <div className="max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-medium text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-300" />
                Fintech-grade dashboard for desktop operators
              </div>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white md:text-5xl xl:text-6xl">
                {heading}
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-400 md:text-lg">
                Clean, structured, and built to make everyday VTU operations feel calm on the web.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {featureRows.map((item) => (
                  <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-200">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-400">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm text-slate-500">
              Built to keep the current backend and API logic intact while upgrading the web feel.
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 lg:px-10 xl:px-14">
          <Card className="w-full max-w-xl border-white/10 bg-slate-950/70 shadow-panel">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-white">{mode === 'register' ? 'Create account' : 'Sign in'}</CardTitle>
                  <CardDescription className="mt-1 text-slate-400">
                    Access your wallet, history, and service operations in one place.
                  </CardDescription>
                </div>
                <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${mode === 'login' ? 'bg-white text-slate-950' : 'text-slate-300'}`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${mode === 'register' ? 'bg-white text-slate-950' : 'text-slate-300'}`}
                  >
                    Register
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                {mode === 'register' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <label className="axis-label">Full name</label>
                      <Input
                        className="border-slate-700 bg-slate-900/80 text-white caret-orange-400 placeholder:text-slate-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                        value={form.full_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Mustapha Mele"
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="axis-label">Email or phone</label>
                      <Input
                        className="border-slate-700 bg-slate-900/80 text-white caret-orange-400 placeholder:text-slate-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="you@example.com or 08012345678"
                        autoComplete="username"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="axis-label">Phone</label>
                      <Input
                        className="border-slate-700 bg-slate-900/80 text-white caret-orange-400 placeholder:text-slate-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                        value={form.phone_number}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                        placeholder="08012345678"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="axis-label">Referral code</label>
                      <Input
                        className="border-slate-700 bg-slate-900/80 text-white caret-orange-400 placeholder:text-slate-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                        value={form.referral_code}
                        onChange={(e) => setForm((prev) => ({ ...prev, referral_code: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="axis-label">Password</label>
                      <Input
                        className="border-slate-700 bg-slate-900/80 text-white caret-orange-400 placeholder:text-slate-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Create a secure password"
                        type="password"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="axis-label">Email</label>
                      <Input
                        className="border-slate-700 bg-slate-900/80 text-white caret-orange-400 placeholder:text-slate-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="axis-label">Password</label>
                      <Input
                        className="border-white/10 bg-white/6 text-white placeholder:text-slate-500 focus:border-orange-400/60 focus:ring-orange-500/20"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Your password"
                        type="password"
                        autoComplete="current-password"
                      />
                    </div>
                  </>
                )}

                {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

                <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={persist}
                      onChange={(e) => setPersist(e.target.checked)}
                      className="rounded border-slate-300 bg-white text-orange-500"
                    />
                    Remember me
                  </label>
                  <Link href="/register" className="text-orange-600 hover:text-orange-700">
                    Need an account?
                  </Link>
                </div>

                <Button className="h-12 w-full rounded-2xl" type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {mode === 'register' ? 'Create account' : 'Sign in'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
