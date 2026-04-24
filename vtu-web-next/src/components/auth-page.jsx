'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch, clearAuth, getToken, loginRequest, registerRequest, setAuthTokens, setProfile, warmBackend } from '@/lib/api';

function Field({ label, helper, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">{label}</label>
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
    first_name: '',
    last_name: '',
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

  const isRegister = mode === 'register';
  const heading = useMemo(() => (isRegister ? 'Create Account' : 'Sign in to AxisVTU'), [isRegister]);
  const subtitle = useMemo(
    () =>
      isRegister
        ? 'Join AxisVTU'
        : 'Access your wallet, purchases, and transaction history.',
    [isRegister]
  );

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await warmBackend();
      if (isRegister) {
        const full_name =
          String(form.full_name || '').trim() ||
          [form.first_name, form.last_name].filter(Boolean).join(' ').trim();

        const data = await registerRequest({
          full_name,
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
    <div className="min-h-screen bg-[#05070d] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,115,69,0.10),transparent_32%),radial-gradient(circle_at_bottom,rgba(37,99,235,0.08),transparent_28%)]" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <Card className="w-full max-w-[448px] border-white/10 bg-[#111827]/90 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <CardHeader className="space-y-3 pb-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-sm font-semibold text-slate-950 shadow-[0_10px_24px_rgba(234,115,69,0.18)]">
              AX
            </div>
            <CardTitle className="text-2xl tracking-tight text-white">{heading}</CardTitle>
            <CardDescription className="text-slate-400">{subtitle}</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-6 flex justify-center">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    !isRegister ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isRegister ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {isRegister ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name">
                      <Input
                        className="border-white/10 bg-slate-950/90 text-white placeholder:text-slate-500 caret-orange-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                        value={form.first_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                        placeholder="First name"
                        autoComplete="given-name"
                      />
                    </Field>
                    <Field label="Last name">
                      <Input
                        className="border-white/10 bg-slate-950/90 text-white placeholder:text-slate-500 caret-orange-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                        value={form.last_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Last name"
                        autoComplete="family-name"
                      />
                    </Field>
                  </div>

                  <Field label="Email">
                    <Input
                      className="border-white/10 bg-slate-950/90 text-white placeholder:text-slate-500 caret-orange-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </Field>

                  <Field label="Phone">
                    <Input
                      className="border-white/10 bg-slate-950/90 text-white placeholder:text-slate-500 caret-orange-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                      value={form.phone_number}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                      placeholder="08012345678"
                      autoComplete="tel"
                    />
                  </Field>

                  <Field label="Password">
                    <div className="relative">
                      <Input
                        className="pr-14 border-white/10 bg-slate-950/90 text-white placeholder:text-slate-500 caret-orange-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Create a secure password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-2 my-auto rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
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
                  </Field>

                  <Field label="Referral code" helper="Optional">
                    <Input
                      className="border-white/10 bg-slate-950/90 text-white placeholder:text-slate-500 caret-orange-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                      value={form.referral_code}
                      onChange={(e) => setForm((prev) => ({ ...prev, referral_code: e.target.value }))}
                      placeholder="Enter a friend's code"
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Email or phone">
                    <Input
                      className="border-white/10 bg-slate-950/90 text-white placeholder:text-slate-500 caret-orange-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com or 08012345678"
                      autoComplete="username"
                    />
                  </Field>

                  <Field label="Password">
                    <div className="relative">
                      <Input
                        className="pr-14 border-white/10 bg-slate-950/90 text-white placeholder:text-slate-500 caret-orange-400 focus:border-orange-400/60 focus:ring-orange-500/20"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Your password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-2 my-auto rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
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
                  </Field>
                </>
              )}

              {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

              <div className={`flex items-center ${isRegister ? 'justify-end' : 'justify-between'} gap-3 text-sm`}>
                {!isRegister ? (
                  <label className="flex items-center gap-2 text-slate-400">
                    <input
                      type="checkbox"
                      checked={persist}
                      onChange={(e) => setPersist(e.target.checked)}
                      className="rounded border-slate-500 bg-transparent text-orange-500 focus:ring-orange-500/20"
                    />
                    Remember me
                  </label>
                ) : (
                  <span />
                )}

                <Link
                  href={isRegister ? '/login' : '/register'}
                  className="text-sm font-medium text-orange-400 hover:text-orange-300"
                >
                  {isRegister ? 'Already have an account? Sign in' : 'Need an account? Register'}
                </Link>
              </div>

              <Button className="h-12 w-full rounded-2xl" type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isRegister ? 'Create account' : 'Sign in'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
