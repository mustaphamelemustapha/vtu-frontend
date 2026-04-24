import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function MetricCard({ label, value, detail, icon: Icon, tone = 'brand', className }) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : tone === 'amber'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : tone === 'violet'
      ? 'bg-violet-50 text-violet-700 border-violet-200'
      : 'bg-orange-50 text-orange-600 border-orange-200';

  return (
    <Card className={cn('border-slate-200 bg-white', className)}>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</div>
          <div className="text-2xl font-semibold tracking-tight text-slate-950 md:text-[1.65rem]">{value}</div>
          {detail ? <div className="text-sm leading-6 text-slate-600">{detail}</div> : null}
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
