'use client';

import { useState } from 'react';
import { KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { apiFetch, getProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';

export default function SecurityPage() {
  const profile = getProfile();
  const [password, setPassword] = useState({ current_password: '', new_password: '' });
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handleChangePassword = async () => {
    if (!password.current_password || !password.new_password) return;
    setBusy(true);
    setMessage('');
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(password),
      });
      setPassword({ current_password: '', new_password: '' });
      setMessage('Password updated successfully.');
    } catch (err) {
      setMessage(err?.message || 'Unable to update password right now.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!profile?.email) return;
    setResetBusy(true);
    setMessage('');
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email }),
      });
      setMessage('Password reset email has been sent.');
    } catch (err) {
      setMessage(err?.message || 'Unable to send reset email right now.');
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Personal settings"
        title="Security"
        description="Manage your password and account access controls."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleResetPassword} disabled={!profile?.email || resetBusy}>
              <Mail className="h-4 w-4" />
              {resetBusy ? 'Sending...' : 'Reset password'}
            </Button>
            <Button onClick={handleChangePassword} disabled={busy}>
              <KeyRound className="h-4 w-4" />
              {busy ? 'Updating...' : 'Change password'}
            </Button>
          </div>
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Use your current password to set a new one.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="axis-label">Current password</div>
            <Input
              type="password"
              value={password.current_password}
              onChange={(e) => setPassword((prev) => ({ ...prev, current_password: e.target.value }))}
              placeholder="Enter current password"
            />
          </div>
          <div className="space-y-2">
            <div className="axis-label">New password</div>
            <Input
              type="password"
              value={password.new_password}
              onChange={(e) => setPassword((prev) => ({ ...prev, new_password: e.target.value }))}
              placeholder="Enter new password"
            />
          </div>
          {message ? (
            <div className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
              {message}
            </div>
          ) : null}
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Keep your account secure
            </div>
            Use a strong password and avoid sharing login details.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
