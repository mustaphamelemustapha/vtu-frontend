import { cn } from '@/lib/utils';

function Badge({ className, tone = 'neutral', ...props }) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
      : tone === 'warning'
      ? 'bg-amber-50 text-amber-800 border-amber-300'
      : tone === 'danger'
      ? 'bg-rose-50 text-rose-800 border-rose-300'
      : 'bg-slate-50 text-slate-800 border-slate-300';
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', toneClass, className)} {...props} />;
}

export { Badge };
