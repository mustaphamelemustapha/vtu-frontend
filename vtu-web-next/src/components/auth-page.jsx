'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch, clearAuth, getToken, loginRequest, registerRequest, setAuthTokens, setProfile, warmBackend } from '@/lib/api';

const featureRows = [
  { title: 'Simple onboarding', text: 'A guided account flow without clutter or heavy visual noise.' },
  { title: 'Wallet ready', text: 'Built around funding, balance visibility, and clear records.' },
  { title: 'Trust first', text: 'Login, referral, and security paths kept easy to follow.' },
];

function AuthField({ label, helper, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">{label}</label>
        {helper ? <span className="text-xs text-slate-500">{helper}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function AuthPage({ initialMode = 'login' }) {
  const router = useRouter();
  const params = useSearchParams();
  const ref = params.get('ref') || params.get('referral') || '';
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [persist, setPersist] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
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
    () => (mode === 'register' ? 'Create your AxisVTU account' : 'Sign in to AxisVTU'),
    [mode]
  );
  const subheading = useMemo(
    () =>
      mode === 'register'
        ? 'Open an account for data, airtime, wallet funding, and clean transaction records.'
        : 'Continue to your dashboard, wallet, and recent activity in one calm workspace.',
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
    <div className="min-h-screen bg-[#f6f3ee] text-slate-900">
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(234,115,69,0.10),transparent_65%)]" aria-hidden="true" />
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
          <aside className="hidden flex-col justify-between border-r border-slate-200 bg-[linear-gradient(180deg,#fdfbf8_0%,#f3f5fb_100%)] p-8 lg:flex xl:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-[0_10px_30px_rgba(234,115,69,0.12)] ring-1 ring-slate-200">
                <span className="text-sm font-semibold">AX</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-950">AxisVTU</div>
                <div className="text-xs text-slate-500">Simple account access</div>
              </div>
            </div>

            <div className="max-w-md space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure access for everyday VTU use
              </div>
              <h1 className="max-w-sm text-4xl font-semibold tracking-tight text-slate-950 xl:text-5xl">
                Buy data, fund your wallet, and keep everything organized.
              </h1>
              <p className="max-w-md text-base leading-7 text-slate-600">
                AxisVTU keeps the experience calm and familiar so users can sign in, register, and continue without extra noise.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {featureRows.map((item) => (
                  <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                      <WalletCards className="h-4 w-4" />
                    </div>
                    <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm text-slate-500">
              Designed to stay soft, readable, and official on desktop and mobile.
            </div>
          </aside>

          <section className="p-6 sm:p-8 lg:p-10 xl:p-12">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-sm font-semibold text-slate-950 shadow-[0_10px_24px_rgba(234,115,69,0.16)]">
                  AX
                </div>
                <div className="lg:hidden">
                  <div className="text-sm font-semibold text-slate-950">AxisVTU</div>
                  <div className="text-xs text-slate-500">Simple account access</div>
                </div>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                    mode === 'login' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                    mode === 'register' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            <div className="mt-8 space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 lg:hidden">
                <Sparkles className="h-3.5 w-3.5" />
                Simple and secure account access
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{heading}</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">{subheading}</p>
            </div>

            <Card className="mt-8 border-slate-200 bg-[#fffdfa] shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-slate-950">{mode === 'register' ? 'Create account' : 'Welcome back'}</CardTitle>
                <CardDescription className="text-slate-600">
                  {mode === 'register'
                    ? 'Enter your details once and continue to the dashboard.'
                    : 'Use your email and password to continue.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-5">
                  {mode === 'register' ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <AuthField label="Full name">
                          <Input
                            value={form.full_name}
                            onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Mustapha Mele"
                            autoComplete="name"
                          />
                        </AuthField>
                      </div>
                      <AuthField label="Email" helper="Primary contact">
                        <Input
                          value={form.email}
                          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                          placeholder="you@example.com"
                          autoComplete="username"
                        />
                      </AuthField>
                      <AuthField label="Phone" helper="Optional">
                        <Input
                          value={form.phone_number}
                          onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                          placeholder="08012345678"
                          autoComplete="tel"
                        />
                      </AuthField>
                      <div className="space-y-2 md:col-span-2">
                        <AuthField label="Referral code" helper="Optional">
                          <Input
                            value={form.referral_code}
                            onChange={(e) => setForm((prev) => ({ ...prev, referral_code: e.target.value }))}
                            placeholder="Enter a friend's code if you have one"
                          />
                        </AuthField>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <AuthField label="Password" helper="Use at least 8 characters">
                          <div className="relative">
                            <Input
                              className="pr-14"
                              value={form.password}
                              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                              placeholder="Create a secure password"
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              className="absolute inset-y-0 right-2 my-auto rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                              {showPassword ? (
                                <span className="inline-flex items-center gap-1">
                                  <EyeOff className="h-3.5 w-3.5" />
                                  Hide
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5" />
                                  Show
                                </span>
                              )}
                            </button>
                          </div>
                        </AuthField>
                      </div>
                    </div>
                  ) : (
                    <>
                      <AuthField label="Email" helper="Use the account email">
                        <Input
                          value={form.email}
                          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                          placeholder="you@example.com"
                          autoComplete="email"
                        />
                      </AuthField>
                      <AuthField label="Password" helper="Remember to keep it private">
                        <div className="relative">
                          <Input
                            className="pr-14"
                            value={form.password}
                            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                            placeholder="Your password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute inset-y-0 right-2 my-auto rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            {showPassword ? (
                              <span className="inline-flex items-center gap-1">
                                <EyeOff className="h-3.5 w-3.5" />
                                Hide
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                Show
                              </span>
                            )}
                          </button>
                        </div>
                      </AuthField>
                    </>
                  )}

                  {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={persist}
                        onChange={(e) => setPersist(e.target.checked)}
                        className="rounded border-slate-300 text-orange-500 focus:ring-orange-500/20"
                      />
                      Remember me
                    </label>
                    <Link
                      href={mode === 'register' ? '/login' : '/register'}
                      className="text-sm font-medium text-orange-600 hover:text-orange-700"
                    >
                      {mode === 'register' ? 'Already have an account? Sign in' : 'Need an account? Register'}
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
    </div>
  );
}
