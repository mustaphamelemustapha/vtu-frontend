'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftRight, LogOut, ShieldCheck, X } from 'lucide-react';
import { adminNav } from '@/lib/admin-nav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function AdminSidebar({ profile, onSignOut, mobile = false, onClose }) {
  const pathname = usePathname();

  // Group nav items
  const mainNav = adminNav.slice(0, 4); // Overview, Users, Transactions, Wallets
  const configNav = adminNav.slice(4); // Services, Data Plans, Referrals, Support, Settings

  const NavGroup = ({ title, items }) => (
    <div className="space-y-1 mb-6">
      <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
              active
                ? 'text-brand font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            {active && (
              <motion.div
                layoutId="activeAdminNavIndicator"
                className="absolute inset-0 rounded-xl bg-brand/10 border border-brand/20"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className={cn('h-4 w-4 relative z-10 transition-colors', active ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground')} />
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <aside className="flex h-full flex-col bg-card/80 backdrop-blur-xl border-r border-border text-card-foreground">
      <div className="border-b border-border/50 p-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/admin" className="flex min-w-0 items-center gap-3 group">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-brand/20 to-brand/5 ring-1 ring-brand/30 transition-transform group-hover:scale-105">
              <img src="/brand/axisvtu-icon.png" alt="MELE DATA logo" className="h-full w-full object-contain p-1" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-foreground tracking-tight">MELE DATA Admin</div>
              <div className="truncate text-xs text-muted-foreground font-medium">Command Center</div>
            </div>
          </Link>
          {mobile ? (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-border/50 bg-gradient-to-b from-secondary/50 to-secondary/10 p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center border border-brand/20">
              <span className="text-sm font-bold text-brand">{(profile?.full_name || profile?.email || 'A')[0].toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{profile?.full_name || profile?.email || 'Admin user'}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                <span className="capitalize">{String(profile?.role || 'admin')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
        <NavGroup title="Core Management" items={mainNav} />
        <NavGroup title="Configuration" items={configNav} />
      </nav>

      <div className="border-t border-border/50 p-4 bg-secondary/20">
        <Button
          asChild
          variant="outline"
          className="mb-2 w-full justify-center rounded-xl bg-background hover:bg-secondary border-border/50 transition-all hover:border-border"
        >
          <Link href="/dashboard">
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Switch to User App
          </Link>
        </Button>
        <Button
          variant="destructive"
          className="w-full justify-center rounded-xl shadow-sm hover:shadow-md transition-all"
          onClick={onSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
