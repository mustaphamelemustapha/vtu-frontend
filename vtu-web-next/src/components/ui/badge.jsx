import { cn } from '@/lib/utils';

function Badge({ className, tone = 'neutral', ...props }) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/12 dark:text-emerald-200 dark:border-emerald-400/30'
      : tone === 'warning'
      ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/12 dark:text-amber-200 dark:border-amber-400/30'
      : tone === 'danger'
      ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/12 dark:text-rose-200 dark:border-rose-400/30'
      : 'bg-secondary text-secondary-foreground border-border';
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', toneClass, className)} {...props} />;
}

export { Badge };
