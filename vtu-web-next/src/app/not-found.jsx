import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f5ef] px-6">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="axis-label">AxisVTU</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The page you are looking for does not exist or has moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-medium text-slate-950 transition hover:bg-orange-600"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
