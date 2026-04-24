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
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">{label}</label>
        {helper ? <span className="text-[11px] text-slate-500">{helper}</span> : null}
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
  const [mounted, setMounted] = useState(false);
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
    const id = window.setTimeout(() => setMounted(true), 20);
    return () => window.clearTimeout(id);
  }, []);

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#0B0F14_0%,#0E141B_100%)] text-slate-100">
      <div
        className={`relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8 transition-all duration-300 ease-out ${
          mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1.5 scale-[0.995]'
        }`}
      >
        <Card className="w-full max-w-[420px] border border-white/6 bg-[rgba(255,255,255,0.02)] shadow-[0_12px_28px_rgba(0,0,0,0.20)] backdrop-blur-sm">
          <CardHeader className="space-y-3 px-6 pb-6 pt-8 text-center sm:px-7">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-slate-200">
              AxisVTU
            </div>
            <CardTitle className="text-[1.6rem] font-semibold tracking-[-0.025em] text-[#EAEAEA]">
              {heading}
            </CardTitle>
            <CardDescription className="mx-auto max-w-[300px] text-sm leading-6 text-[#9CA3AF]">
              {subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 px-6 pb-8 sm:px-7">
            <form onSubmit={submit} className="space-y-5">
              {isRegister ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name">
                      <Input
                        className="h-[50px] rounded-[8px] border border-white/5 bg-[#11161C] px-4 text-[0.98rem] text-[#EAEAEA] placeholder:text-slate-500/60 caret-slate-100 shadow-none transition-all duration-200 hover:border-white/8 focus:border-white/12 focus:ring-2 focus:ring-white/10"
                        value={form.first_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                        placeholder="First name"
                        autoComplete="given-name"
                      />
                    </Field>
                    <Field label="Last name">
                      <Input
                        className="h-[50px] rounded-[8px] border border-white/5 bg-[#11161C] px-4 text-[0.98rem] text-[#EAEAEA] placeholder:text-slate-500/60 caret-slate-100 shadow-none transition-all duration-200 hover:border-white/8 focus:border-white/12 focus:ring-2 focus:ring-white/10"
                        value={form.last_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Last name"
                        autoComplete="family-name"
                      />
                    </Field>
                  </div>

                  <Field label="Email">
                    <Input
                      className="h-[50px] rounded-[8px] border border-white/5 bg-[#11161C] px-4 text-[0.98rem] text-[#EAEAEA] placeholder:text-slate-500/60 caret-slate-100 shadow-none transition-all duration-200 hover:border-white/8 focus:border-white/12 focus:ring-2 focus:ring-white/10"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </Field>

                  <Field label="Phone">
                    <Input
                      className="h-[50px] rounded-[8px] border border-white/5 bg-[#11161C] px-4 text-[0.98rem] text-[#EAEAEA] placeholder:text-slate-500/60 caret-slate-100 shadow-none transition-all duration-200 hover:border-white/8 focus:border-white/12 focus:ring-2 focus:ring-white/10"
                      value={form.phone_number}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                      placeholder="08012345678"
                      autoComplete="tel"
                    />
                  </Field>

                  <Field label="Password">
                    <div className="relative">
                      <Input
                        className="h-[50px] rounded-[8px] pr-14 border border-white/5 bg-[#11161C] px-4 text-[0.98rem] text-[#EAEAEA] placeholder:text-slate-500/60 caret-slate-100 shadow-none transition-all duration-200 hover:border-white/8 focus:border-white/12 focus:ring-2 focus:ring-white/10"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Create a secure password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-2 my-auto rounded-[8px] border border-white/5 bg-[#11161C] px-3 text-xs font-medium text-slate-400 transition-all duration-200 hover:border-white/8 hover:bg-[#161C24] hover:text-slate-200"
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
                      className="h-[50px] rounded-[8px] border border-white/5 bg-[#11161C] px-4 text-[0.98rem] text-[#EAEAEA] placeholder:text-slate-500/60 caret-slate-100 shadow-none transition-all duration-200 hover:border-white/8 focus:border-white/12 focus:ring-2 focus:ring-white/10"
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
                      className="h-[50px] rounded-[8px] border border-white/5 bg-[#11161C] px-4 text-[0.98rem] text-[#EAEAEA] placeholder:text-slate-500/60 caret-slate-100 shadow-none transition-all duration-200 hover:border-white/8 focus:border-white/12 focus:ring-2 focus:ring-white/10"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com or 08012345678"
                      autoComplete="username"
                    />
                  </Field>

                  <Field label="Password">
                    <div className="relative">
                      <Input
                        className="h-[50px] rounded-[8px] pr-14 border border-white/5 bg-[#11161C] px-4 text-[0.98rem] text-[#EAEAEA] placeholder:text-slate-500/60 caret-slate-100 shadow-none transition-all duration-200 hover:border-white/8 focus:border-white/12 focus:ring-2 focus:ring-white/10"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Your password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-2 my-auto rounded-[8px] border border-white/5 bg-[#11161C] px-3 text-xs font-medium text-slate-400 transition-all duration-200 hover:border-white/8 hover:bg-[#161C24] hover:text-slate-200"
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

              {error ? <div className="rounded-[10px] border border-rose-400/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

              <div className={`flex items-center ${isRegister ? 'justify-end' : 'justify-between'} gap-3 pt-1 text-sm`}>
                {!isRegister ? (
                  <label className="flex items-center gap-2 text-slate-400 transition-colors hover:text-slate-300">
                    <input
                      type="checkbox"
                      checked={persist}
                      onChange={(e) => setPersist(e.target.checked)}
                      className="rounded border-slate-500 bg-transparent text-[#f97316] accent-[#f97316] focus:ring-white/10"
                    />
                    Remember me
                  </label>
                ) : (
                  <span />
                )}

                <Link
                  href={isRegister ? '/login' : '/register'}
                  className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-200 hover:underline hover:decoration-current hover:underline-offset-4"
                >
                  {isRegister ? 'Already have an account? Sign in' : 'Need an account? Register'}
                </Link>
              </div>

              <Button
                className="h-[50px] w-full rounded-[8px] border border-orange-500/10 bg-gradient-to-b from-[#f97316] to-[#ea6f22] text-white shadow-[0_8px_18px_rgba(249,115,22,0.12)] transition-all duration-200 hover:brightness-[0.97] hover:shadow-[0_10px_20px_rgba(249,115,22,0.14)] active:scale-[0.98] active:shadow-[0_6px_14px_rgba(249,115,22,0.10)]"
                type="submit"
                disabled={loading}
              >
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
