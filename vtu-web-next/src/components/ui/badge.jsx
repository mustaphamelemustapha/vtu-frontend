import { cn } from '@/lib/utils';

function Badge({ className, tone = 'neutral', ...props }) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-700 dark:!text-emerald-50 dark:border-emerald-500'
      : tone === 'warning'
      ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-700 dark:!text-amber-50 dark:border-amber-500'
      : tone === 'danger'
      ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-700 dark:!text-rose-50 dark:border-rose-500'
      : 'bg-secondary text-secondary-foreground border-border';
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-tight', toneClass, className)} {...props} />;
}

export { Badge };
