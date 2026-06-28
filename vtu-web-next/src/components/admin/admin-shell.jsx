'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, getProfile } from '@/lib/api';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminTopbar } from '@/components/admin/admin-topbar';

export function AdminShell({ children, profile }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const me = profile || getProfile();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(current);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const handleSignOut = useCallback(() => {
    clearAuth();
    router.replace('/');
  }, [router]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(next);
      window.localStorage.setItem('axis-theme', next);
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background ambient gradients */}
      <div className="pointer-events-none fixed inset-0 z-0 flex justify-center opacity-30 mix-blend-screen dark:opacity-10">
        <div className="absolute -left-[20%] top-0 h-[500px] w-[500px] rounded-full bg-brand/30 blur-[120px]" />
        <div className="absolute right-[10%] top-[20%] h-[400px] w-[400px] rounded-full bg-blue-500/20 blur-[100px]" />
      </div>

      <div className="hidden border-r border-border/50 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[272px] lg:overflow-y-auto bg-background/50 backdrop-blur-xl">
        <AdminSidebar profile={me} onSignOut={handleSignOut} />
      </div>

      <main className="relative z-10 min-w-0 lg:pl-[272px]">
        <AdminTopbar
          title="Admin workspace"
          onOpenMenu={() => setMobileOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSupport={() => router.push('/admin/support')}
        />
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="px-4 py-5 md:px-6 lg:px-8 xl:px-10 min-h-[calc(100vh-64px)]"
        >
          {children}
        </motion.div>
      </main>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            />
            <motion.div
              className="relative h-full w-[75vw] max-w-[320px] border-r border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl"
              initial={{ x: '-110%' }}
              animate={{ x: 0 }}
              exit={{ x: '-110%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <AdminSidebar profile={me} onSignOut={handleSignOut} mobile onClose={() => setMobileOpen(false)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
