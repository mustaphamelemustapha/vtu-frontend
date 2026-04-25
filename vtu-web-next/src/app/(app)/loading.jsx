export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="h-4 w-24 rounded-full bg-slate-100" />
        <div className="mt-4 h-8 w-72 rounded-2xl bg-slate-100" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-slate-100" />
      </div>
      <div className="grid gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-3xl border border-slate-300 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]" />
        ))}
      </div>
    </div>
  );
}
