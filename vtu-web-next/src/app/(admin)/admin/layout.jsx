'use client';

import { useState, Suspense } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminLayout({ children }) {
  const [profile, setProfile] = useState(null);

  return (
    <AdminGuard onProfile={setProfile}>
      <AdminShell profile={profile}>
        <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>}>
          {children}
        </Suspense>
      </AdminShell>
    </AdminGuard>
  );
}
