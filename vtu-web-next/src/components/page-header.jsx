import { cn } from '@/lib/utils';

export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={cn('relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between pb-4 border-b border-white/5', className)}>
      <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary/5 rounded-full blur-[4rem] -z-10 pointer-events-none" />
      <div className="space-y-3 relative z-10">
        {eyebrow ? <div className="text-[10px] uppercase tracking-[0.25em] font-semibold text-primary">{eyebrow}</div> : null}
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl drop-shadow-sm">{title}</h1>
        {description ? <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground/90 md:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3 relative z-10">{actions}</div> : null}
    </div>
  );
}
