import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function MetricCard({ label, value, detail, icon: Icon, tone = 'brand', className }) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-500/12 text-emerald-300 border-emerald-400/20'
      : tone === 'amber'
      ? 'bg-amber-500/12 text-amber-300 border-amber-400/20'
      : tone === 'violet'
      ? 'bg-violet-500/12 text-violet-300 border-violet-400/20'
      : 'bg-brand-500/12 text-brand-200 border-brand-400/20';

  return (
    <Card className={cn('border-white/10 bg-slate-950/55', className)}>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>
          <div className="text-2xl font-semibold tracking-tight text-white md:text-[1.65rem]">{value}</div>
          {detail ? <div className="text-sm leading-6 text-slate-400">{detail}</div> : null}
        </div>
        {Icon ? (
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border', toneClass)}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
