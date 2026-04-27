'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { adminGetAnalytics, adminGetPricingRules, adminGetServiceToggles, adminUpdateServiceToggle, apiFetch, getProfile } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { StatusBadge } from '@/components/admin/status-badge';

export default function AdminSettingsPage() {
  const profile = getProfile();
  const [loading, setLoading] = useState(true);
  const [pricingRules, setPricingRules] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [serviceToggles, setServiceToggles] = useState({});
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pricingRes, catalogRes, analyticsRes, togglesRes] = await Promise.allSettled([
        adminGetPricingRules(),
        apiFetch('/services/catalog'),
        adminGetAnalytics(),
        adminGetServiceToggles(),
      ]);
      if (pricingRes.status === 'fulfilled') setPricingRules(Array.isArray(pricingRes.value?.items) ? pricingRes.value.items : []);
      if (catalogRes.status === 'fulfilled') setCatalog(catalogRes.value || {});
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value || {});
      if (togglesRes.status === 'fulfilled') setServiceToggles(togglesRes.value || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader
        title="Admin settings"
        description="Service toggles, provider health, referral policy, support channels, and admin profile security."
        actions={
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh settings
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Service toggles</CardTitle>
            <CardDescription>Toggle endpoints require dedicated backend controls before activation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ['data', 'Data'],
              ['airtime', 'Airtime'],
              ['electricity', 'Electricity'],
              ['cable', 'Cable TV'],
              ['exam', 'Exam PINs'],
            ].map(([serviceKey, label]) => {
              const enabled = serviceToggles[serviceKey] ?? true;
              return (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-border bg-secondary p-3">
                  <div className="text-sm font-medium text-foreground">{label}</div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={enabled ? 'enabled' : 'disabled'} />
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      disabled={toggling}
                      onClick={async () => {
                        setToggling(true);
                        try {
                          await adminUpdateServiceToggle(serviceKey, { is_active: !enabled });
                          await load();
                        } catch (err) {
                          alert(err.message || 'Failed to update toggle');
                        } finally {
                          setToggling(false);
                        }
                      }}
                    >
                      {enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API/provider status</CardTitle>
            <CardDescription>Operational indicators from available backend analytics and catalog snapshots.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border bg-secondary p-3 text-sm">
              <div className="text-muted-foreground">API success count</div>
              <div className="mt-1 font-semibold text-foreground">{Number(analytics?.api_success || 0).toLocaleString('en-NG')}</div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary p-3 text-sm">
              <div className="text-muted-foreground">API failed count</div>
              <div className="mt-1 font-semibold text-foreground">{Number(analytics?.api_failed || 0).toLocaleString('en-NG')}</div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary p-3 text-sm">
              <div className="text-muted-foreground">Pricing rules loaded</div>
              <div className="mt-1 font-semibold text-foreground">{pricingRules.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Referral reward policy</CardTitle>
            <CardDescription>Current first-deposit referral reward rate used by AxisVTU.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="space-y-2 block">
              <span className="text-sm text-muted-foreground">Reward percentage</span>
              <Input value="2" readOnly />
            </label>
            <div className="text-xs text-muted-foreground">This value is shown for visibility. Persisted updates require backend settings endpoint.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support and maintenance</CardTitle>
            <CardDescription>Official support channels and maintenance guardrails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="space-y-2 block">
              <span className="text-sm text-muted-foreground">Support email</span>
              <Input value="mmtechglobe@gmail.com" readOnly />
            </label>
            <div className="rounded-2xl border border-amber-300/80 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <span>Maintenance mode is currently a protected placeholder. Enable only when backend maintenance control exists.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin profile & security</CardTitle>
          <CardDescription>Access role, account identity, and security visibility for this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-secondary p-3">
            <div className="axis-label">Full name</div>
            <div className="mt-2 text-sm font-medium text-foreground">{profile?.full_name || 'Admin'}</div>
          </div>
          <div className="rounded-2xl border border-border bg-secondary p-3">
            <div className="axis-label">Email</div>
            <div className="mt-2 text-sm font-medium text-foreground break-all">{profile?.email || '—'}</div>
          </div>
          <div className="rounded-2xl border border-border bg-secondary p-3">
            <div className="axis-label">Role</div>
            <div className="mt-2 text-sm font-medium text-foreground">{String(profile?.role || 'user')}</div>
          </div>
          <div className="rounded-2xl border border-border bg-secondary p-3">
            <div className="axis-label">Last refresh</div>
            <div className="mt-2 text-sm font-medium text-foreground">{formatDateTime(new Date())}</div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Secrets are intentionally hidden from this UI. Use secured backend environment management for keys and provider credentials.
        </div>
      </div>
    </div>
  );
}
