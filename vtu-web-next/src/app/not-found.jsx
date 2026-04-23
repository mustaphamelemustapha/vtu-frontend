import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050a12] px-6">
      <div className="axis-panel w-full max-w-lg p-8 text-center">
        <div className="axis-label">AxisVTU</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          The page you are looking for does not exist or has moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-400"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
