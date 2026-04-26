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

export function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState(getProfile());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light');

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
    const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(current);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const activePath = useMemo(() => pathname || '/dashboard', [pathname]);
  const activePage = useMemo(
    () => appNav.find((item) => activePath === item.href || activePath.startsWith(`${item.href}/`)),
    [activePath]
  );

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(next);
      window.localStorage.setItem('axis-theme', next);
      return next;
    });
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="rounded-3xl border border-border bg-card px-6 py-5 text-sm text-card-foreground shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          Loading AxisVTU dashboard...
        </div>
      </div>
    );
  }

  const initials = brandInitials(profile);

  return (
    <div className="axis-shell grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-card p-5 text-card-foreground lg:flex lg:flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl border border-border bg-secondary px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            <img src="/brand/axisvtu-icon.png" alt="AxisVTU logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">AxisVTU</div>
            <div className="text-xs text-muted-foreground">Fintech dashboard</div>
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
                    ? 'border-primary/35 bg-primary/12 text-foreground shadow-lg shadow-orange-500/10'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 rounded-3xl border border-border bg-secondary p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-card text-sm font-semibold text-foreground">{initials}</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{profile.full_name || profile.email || 'AxisVTU User'}</div>
              <div className="truncate text-xs text-muted-foreground">{profile.email || 'No email attached'}</div>
            </div>
          </div>
          <Badge tone="neutral" className="w-fit">Premium workspace</Badge>
          <div className="grid gap-2">
            <Button variant="secondary" className="w-full" onClick={() => router.push('/profile')}>
              Profile
            </Button>
            <Button variant="secondary" className="w-full border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-400/30 dark:bg-rose-500/12 dark:text-rose-100 dark:hover:bg-rose-500/18" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 bg-background">
        <header
          className="sticky top-0 z-30 border-b border-border bg-background/92 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 md:px-6 md:py-3 lg:px-8">
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                'h-9 w-9 shrink-0 rounded-xl md:hidden',
                'border-border bg-card text-foreground hover:bg-secondary'
              )}
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              title="Menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1 md:hidden">
              <div className="truncate text-sm font-semibold text-foreground">
                {activePage?.label || 'AxisVTU'}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                AxisVTU
              </div>
            </div>
            <div className="hidden h-11 flex-1 items-center gap-3 rounded-2xl border border-border bg-card px-4 md:flex">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Search transactions, wallets, or beneficiaries</span>
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="hidden md:inline-flex"
              onClick={() => router.push('/history')}
              aria-label="Open history"
              title="History"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="hidden md:inline-flex"
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
                'border-border bg-card text-foreground hover:bg-secondary'
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
                'border-border bg-card text-foreground hover:bg-secondary'
              )}
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title="Theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="secondary"
              className="hidden border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-400/30 dark:bg-rose-500/12 dark:text-rose-100 dark:hover:bg-rose-500/18 md:inline-flex"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
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
          <aside className="relative flex h-full w-[82vw] max-w-[340px] flex-col border-r border-border bg-card p-4 text-card-foreground shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-secondary px-3 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-card ring-1 ring-border">
                  <img src="/brand/axisvtu-icon.png" alt="AxisVTU logo" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">AxisVTU</div>
                  <div className="truncate text-xs text-muted-foreground">Mobile workspace</div>
                </div>
              </Link>
              <Button
                variant="secondary"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl"
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
                        ? 'border-primary/35 bg-primary/12 text-foreground'
                        : 'border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-4 rounded-3xl border border-border bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card text-sm font-semibold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{profile.full_name || profile.email || 'AxisVTU User'}</div>
                  <div className="truncate text-xs text-muted-foreground">{profile.email || 'No email attached'}</div>
                </div>
              </div>
              <Button
                variant="secondary"
                className="h-11 w-full border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-400/30 dark:bg-rose-500/12 dark:text-rose-100 dark:hover:bg-rose-500/18"
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
