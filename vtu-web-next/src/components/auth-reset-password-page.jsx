'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

export function AuthResetPasswordPage() {
  const params = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset token is missing. Open the link from your email again.');
      return;
    }
    if (!newPassword) {
      setError('Enter your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      setMessage(res?.message || 'Password reset successful. You can now sign in.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err?.message || 'Unable to reset password right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full max-w-[420px] border border-border bg-card shadow-[0_8px_20px_rgba(0,0,0,0.14)] backdrop-blur-sm">
          <CardHeader className="space-y-3 px-6 pb-6 pt-8 text-center sm:px-7">
            <div className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-card ring-1 ring-border">
              <img src="/brand/axisvtu-icon.png" alt="AxisVTU logo" className="h-full w-full object-contain" />
            </div>
            <CardTitle className="text-[1.6rem] font-semibold tracking-[-0.025em] text-foreground">Reset password</CardTitle>
            <CardDescription className="mx-auto max-w-[300px] text-sm leading-6 text-muted-foreground">
              Set a new password for your AxisVTU account.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 px-6 pb-8 sm:px-7">
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">New password</label>
                <div className="relative">
                  <Input
                    className="h-[50px] rounded-[8px] border border-border bg-input px-4 pr-12 text-[0.98rem] text-foreground placeholder:text-muted-foreground caret-foreground shadow-none transition-all duration-200 hover:border-primary/45 focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a secure password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow((prev) => !prev)}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label={show ? 'Hide password' : 'Show password'}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Confirm password</label>
                <Input
                  className="h-[50px] rounded-[8px] border border-border bg-input px-4 text-[0.98rem] text-foreground placeholder:text-muted-foreground caret-foreground shadow-none transition-all duration-200 hover:border-primary/45 focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                />
              </div>

              {error ? <div className="rounded-[10px] border border-rose-400/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
              {message ? <div className="rounded-[10px] border border-emerald-400/15 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}

              <Button
                className="h-[50px] w-full rounded-[8px] border border-primary/20 bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(249,115,22,0.12)] transition-all duration-200 hover:bg-primary/90 hover:shadow-[0_10px_20px_rgba(249,115,22,0.14)] active:scale-[0.98] active:shadow-[0_6px_14px_rgba(249,115,22,0.10)]"
                type="submit"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Update password
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
    </div>
  );
}
