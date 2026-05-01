import { cn } from '@/lib/utils';

function Badge({ className, tone = 'neutral', ...props }) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-100 !text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:!text-emerald-200 dark:border-emerald-700'
      : tone === 'warning'
      ? 'bg-amber-100 !text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:!text-amber-200 dark:border-amber-700'
      : tone === 'danger'
      ? 'bg-rose-100 !text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:!text-rose-200 dark:border-rose-700'
      : 'bg-secondary !text-secondary-foreground border-border';
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-tight', toneClass, className)} {...props} />;
}

export { Badge };
