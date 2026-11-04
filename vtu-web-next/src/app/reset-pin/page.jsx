import { Suspense } from 'react';
import { ResetPinPage } from '@/components/reset-pin-page';

export const metadata = {
  title: 'Reset Transaction PIN | KULLOMA DATA',
  description: 'Create a new transaction PIN for your KULLOMA DATA account.',
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPinPage />
    </Suspense>
  );
}
