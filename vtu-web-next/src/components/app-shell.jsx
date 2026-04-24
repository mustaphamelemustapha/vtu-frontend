'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, Search, Settings2, Sparkles } from 'lucide-react';
import { appNav } from '@/lib/nav';
import { clearAuth, apiFetch, getProfile, getToken, setProfile } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function brandInitials(profile) {
  const name = String(profile?.full_name || profile?.email || 'AxisVTU').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]).join('');
  return (letters || 'AX').toUpperCase();
}

export function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState(getProfile());

  const handleSignOut = useCallback(() => {
    clearAuth();
    router.replace('/');
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/');
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const me = await apiFetch('/auth/me');
        if (!mounted) return;
        setProfile(me);
        setProfileState(me);
      } catch {
        clearAuth();
        router.replace('/');
      } finally {
        if (mounted) setReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  const activePath = useMemo(() => pathname || '/dashboard', [pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f5ef] text-slate-600">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          Loading AxisVTU dashboard...
        </div>
      </div>
    );
  }

  const initials = brandInitials(profile);

  return (
    <div className="axis-shell grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-200 bg-[#111827] p-5 lg:flex lg:flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/20">
            <span className="text-sm font-semibold">AX</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">AxisVTU</div>
            <div className="text-xs text-slate-400">Fintech dashboard</div>
          </div>
        </Link>

        <nav className="mt-8 space-y-2">
          {appNav.map((item) => {
            const Icon = item.icon;
            const active = activePath === item.href || activePath.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition',
                  active
                    ? 'border-brand-400/30 bg-brand-500/12 text-white shadow-lg shadow-brand-500/10'
                    : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5'
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-brand-300' : 'text-slate-400')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white">{initials}</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{profile.full_name || profile.email || 'AxisVTU User'}</div>
              <div className="truncate text-xs text-slate-400">{profile.email || 'No email attached'}</div>
            </div>
          </div>
          <Badge tone="neutral" className="w-fit">Premium workspace</Badge>
          <div className="grid gap-2">
            <Button variant="secondary" className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => router.push('/profile')}>
              Profile
            </Button>
            <Button variant="secondary" className="w-full border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 bg-[#f8f5ef]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6 lg:px-8">
            <div className="hidden h-11 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 md:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-500">Search transactions, wallets, or beneficiaries</span>
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="hidden border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:inline-flex"
              onClick={() => router.push('/history')}
              aria-label="Open history"
              title="History"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="hidden border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:inline-flex"
              onClick={() => router.push('/profile')}
              aria-label="Open profile"
              title="Profile"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:hidden"
              onClick={() => router.push('/buy-data')}
              aria-label="Buy data"
              title="Buy data"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              className="hidden border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 md:inline-flex"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
          <nav className="flex gap-2 overflow-x-auto border-t border-slate-200 px-4 py-3 md:hidden">
            {appNav.map((item) => {
              const Icon = item.icon;
              const active = activePath === item.href || activePath.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium whitespace-nowrap transition',
                    active
                      ? 'border-orange-200 bg-orange-50 text-slate-950'
                      : 'border-slate-200 bg-white text-slate-700'
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', active ? 'text-orange-600' : 'text-slate-400')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Button variant="secondary" className="ml-auto border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </nav>
        </header>
        <div className="px-4 py-5 md:px-6 lg:px-8 xl:px-10">{children}</div>
      </main>
    </div>
  );
}
