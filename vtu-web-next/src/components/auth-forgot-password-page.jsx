'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

export function AuthForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSuccessMessage(res?.message || 'If the email exists, a reset link has been sent.');
      setShowSuccess(true);
    } catch (err) {
      setError(err?.message || 'Unable to send reset request right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full max-w-[420px] border border-border bg-card/95 shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm">
          <CardHeader className="space-y-3 px-6 pb-6 pt-8 text-center sm:px-7">
            <div className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-card ring-1 ring-border">
              <img src="/brand/axisvtu-icon.png" alt="AxisVTU logo" className="h-full w-full object-contain" />
            </div>
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Password recovery
            </div>
            <CardTitle className="text-[1.6rem] font-semibold tracking-[-0.025em] text-foreground">Forgot password</CardTitle>
            <CardDescription className="mx-auto max-w-[300px] text-sm leading-6 text-muted-foreground">
              Enter your account email and we will send your password reset link.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 px-6 pb-8 sm:px-7">
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Email</label>
                <Input
                  className="h-[50px] rounded-[8px] border border-border bg-input px-4 text-[0.98rem] text-foreground placeholder:text-muted-foreground/60 caret-foreground shadow-none transition-all duration-200 hover:border-primary/45 focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              {error ? <div className="rounded-[10px] border border-rose-400/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

              <Button
                className="h-[50px] w-full rounded-[8px] border border-primary/20 bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(249,115,22,0.12)] transition-all duration-200 hover:bg-primary/90 hover:shadow-[0_10px_20px_rgba(249,115,22,0.14)] active:scale-[0.98] active:shadow-[0_6px_14px_rgba(249,115,22,0.10)]"
                type="submit"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send reset link
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="pt-1 text-right">
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline hover:decoration-current hover:underline-offset-4"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {showSuccess ? (
        <div className="fixed inset-0 z-[120] bg-background">
          <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
            <Card className="w-full max-w-[460px] border border-border bg-card/95 shadow-[0_14px_30px_rgba(0,0,0,0.22)] backdrop-blur-sm">
              <CardHeader className="space-y-3 px-6 pb-6 pt-8 text-center sm:px-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/30">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <CardTitle className="text-[1.7rem] font-semibold tracking-[-0.025em] text-foreground">
                  Reset link sent
                </CardTitle>
                <CardDescription className="mx-auto max-w-[340px] text-sm leading-6 text-muted-foreground">
                  {successMessage || 'If the email exists, a reset link has been sent.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 px-6 pb-8 sm:px-8">
                <div className="rounded-xl border border-border bg-secondary/70 px-4 py-3 text-sm text-muted-foreground">
                  Check your inbox and spam folder, then open the reset link to continue.
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="secondary"
                    className="h-[48px] border-border"
                    onClick={() => {
                      setShowSuccess(false);
                    }}
                  >
                    Send again
                  </Button>
                  <Button
                    className="h-[48px]"
                    onClick={() => {
                      setShowSuccess(false);
                      window.location.href = '/login';
                    }}
                  >
                    Back to sign in
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
