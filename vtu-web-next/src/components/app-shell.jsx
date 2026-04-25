'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, Menu, Moon, Search, Settings2, Sun, X } from 'lucide-react';
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

const mobileNavLabels = {
  Dashboard: 'Home',
  'Buy Data': 'Data',
};

export function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState(getProfile());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileChromeDark, setMobileChromeDark] = useState(true);

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

  useEffect(() => {
    const saved = window.localStorage.getItem('axis-mobile-chrome');
    if (saved === 'light') setMobileChromeDark(false);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const activePath = useMemo(() => pathname || '/dashboard', [pathname]);
  const activePage = useMemo(
    () => appNav.find((item) => activePath === item.href || activePath.startsWith(`${item.href}/`)),
    [activePath]
  );

  const toggleMobileChrome = useCallback(() => {
    setMobileChromeDark((current) => {
      const next = !current;
      window.localStorage.setItem('axis-mobile-chrome', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f5ef] text-slate-600">
        <div className="rounded-3xl border border-slate-300 bg-white px-6 py-5 text-sm text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          Loading AxisVTU dashboard...
        </div>
      </div>
    );
  }

  const initials = brandInitials(profile);

  return (
    <div className="axis-shell grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-300 bg-[#111827] p-5 lg:flex lg:flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/20">
            <span className="text-sm font-semibold">AX</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">AxisVTU</div>
            <div className="text-xs text-slate-300">Fintech dashboard</div>
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
                    : 'border-transparent text-slate-300 hover:border-white/15 hover:bg-white/[0.08]'
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-brand-300' : 'text-slate-300')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 rounded-3xl border border-white/15 bg-white/[0.08] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white">{initials}</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{profile.full_name || profile.email || 'AxisVTU User'}</div>
              <div className="truncate text-xs text-slate-300">{profile.email || 'No email attached'}</div>
            </div>
          </div>
          <Badge tone="neutral" className="w-fit">Premium workspace</Badge>
          <div className="grid gap-2">
            <Button variant="secondary" className="w-full border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.14]" onClick={() => router.push('/profile')}>
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
        <header
          className={cn(
            'sticky top-0 z-30 border-b backdrop-blur-xl',
            mobileChromeDark
              ? 'border-white/15 bg-[#0b0f14]/94 md:border-slate-300 md:bg-white/90'
              : 'border-slate-300 bg-white/92'
          )}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 md:px-6 md:py-3 lg:px-8">
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                'h-9 w-9 shrink-0 rounded-xl md:hidden',
                mobileChromeDark
                  ? 'border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.12]'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              )}
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              title="Menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1 md:hidden">
              <div className={cn('truncate text-sm font-semibold', mobileChromeDark ? 'text-white' : 'text-slate-950')}>
                {activePage?.label || 'AxisVTU'}
              </div>
              <div className={cn('truncate text-[11px]', mobileChromeDark ? 'text-white/75' : 'text-slate-600')}>
                AxisVTU
              </div>
            </div>
            <div className="hidden h-11 flex-1 items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 md:flex">
              <Search className="h-4 w-4 text-slate-300" />
              <span className="text-sm text-slate-600">Search transactions, wallets, or beneficiaries</span>
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="hidden border-slate-300 bg-white text-slate-800 hover:bg-slate-50 md:inline-flex"
              onClick={() => router.push('/history')}
              aria-label="Open history"
              title="History"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="hidden border-slate-300 bg-white text-slate-800 hover:bg-slate-50 md:inline-flex"
              onClick={() => router.push('/profile')}
              aria-label="Open profile"
              title="Profile"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                'h-9 w-9 shrink-0 rounded-xl md:hidden',
                mobileChromeDark
                  ? 'border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.12]'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              )}
              onClick={() => router.push('/history')}
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                'h-9 w-9 shrink-0 rounded-xl md:hidden',
                mobileChromeDark
                  ? 'border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.12]'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              )}
              onClick={toggleMobileChrome}
              aria-label="Toggle mobile theme"
              title="Theme"
            >
              {mobileChromeDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
          <nav
            className={cn(
              'flex gap-2 overflow-x-auto border-t px-3 py-2 md:hidden [&::-webkit-scrollbar]:hidden',
              mobileChromeDark ? 'border-white/15' : 'border-slate-300'
            )}
          >
            {appNav.map((item) => {
              const Icon = item.icon;
              const active = activePath === item.href || activePath.startsWith(`${item.href}/`);
              const label = mobileNavLabels[item.label] || item.label;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium whitespace-nowrap transition',
                    active
                      ? mobileChromeDark
                        ? 'border-orange-400/35 bg-orange-500/12 text-white'
                        : 'border-orange-200 bg-orange-50 text-slate-950'
                      : mobileChromeDark
                        ? 'border-white/15 bg-white/[0.06] text-white/75'
                        : 'border-slate-300 bg-white text-slate-800'
                  )}
                >
                  <Icon className={cn('h-3 w-3', active ? 'text-orange-500' : mobileChromeDark ? 'text-white/75' : 'text-slate-300')} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="px-4 py-5 md:px-6 lg:px-8 xl:px-10">{children}</div>
      </main>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu overlay"
          />
          <aside className="relative flex h-full w-[82vw] max-w-[340px] flex-col border-r border-white/15 bg-[#0b0f14] p-4 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-sm font-semibold text-slate-950">
                  AX
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">AxisVTU</div>
                  <div className="truncate text-xs text-white/75">Mobile workspace</div>
                </div>
              </Link>
              <Button
                variant="secondary"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.12]"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <nav className="mt-6 space-y-1.5">
              {appNav.map((item) => {
                const Icon = item.icon;
                const active = activePath === item.href || activePath.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition',
                      active
                        ? 'border-orange-400/30 bg-orange-500/12 text-white'
                        : 'border-transparent text-white/80 hover:border-white/15 hover:bg-white/[0.07] hover:text-white'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', active ? 'text-orange-400' : 'text-white/75')} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-4 rounded-3xl border border-white/15 bg-white/[0.07] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{profile.full_name || profile.email || 'AxisVTU User'}</div>
                  <div className="truncate text-xs text-white/75">{profile.email || 'No email attached'}</div>
                </div>
              </div>
              <Button
                variant="secondary"
                className="h-11 w-full border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
