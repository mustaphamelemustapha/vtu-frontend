import { cn } from '@/lib/utils';

function Badge({ className, tone = 'neutral', ...props }) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-500/12 text-emerald-300 border-emerald-400/20'
      : tone === 'warning'
      ? 'bg-amber-500/12 text-amber-300 border-amber-400/20'
      : tone === 'danger'
      ? 'bg-rose-500/12 text-rose-300 border-rose-400/20'
      : 'bg-white/8 text-slate-200 border-white/10';
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', toneClass, className)} {...props} />;
}

export { Badge };
