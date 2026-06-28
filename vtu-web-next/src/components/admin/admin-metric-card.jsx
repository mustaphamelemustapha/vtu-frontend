import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function AdminMetricCard({ label, value, detail, icon: Icon, tone = 'brand', trend }) {
  const isBrand = tone === 'brand';
  const isSuccess = tone === 'success';
  const isWarning = tone === 'warning';
  const isDanger = tone === 'danger';

  const iconTone = isSuccess
    ? 'border-emerald-300/50 bg-emerald-500/20 text-emerald-300'
    : isWarning
      ? 'border-amber-300/50 bg-amber-500/20 text-amber-300'
      : isDanger
        ? 'border-rose-300/50 bg-rose-500/20 text-rose-300'
        : 'border-indigo-300/50 bg-indigo-500/20 text-indigo-300';

  const glowColor = isSuccess ? 'bg-emerald-500/30' : isWarning ? 'bg-amber-500/30' : isDanger ? 'bg-rose-500/30' : 'bg-indigo-500/30';
  const gradientBg = isSuccess ? 'from-emerald-900/40 to-background' : isWarning ? 'from-amber-900/40 to-background' : isDanger ? 'from-rose-900/40 to-background' : 'from-indigo-900/40 to-background';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="h-full"
    >
      <Card className="h-full relative overflow-hidden group border border-border/30 bg-background/60 backdrop-blur-2xl shadow-xl transition-all duration-500 hover:shadow-2xl hover:border-border/60">
        {/* Glow Effects */}
        <div className={cn("absolute -top-20 -right-20 w-48 h-48 rounded-full blur-[4rem] group-hover:scale-150 transition-transform duration-700 ease-out pointer-events-none", glowColor)} />
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80 pointer-events-none", gradientBg)} />
        <div className="absolute inset-0 border-[0.5px] border-white/5 rounded-xl pointer-events-none" />

        <CardContent className="relative flex flex-col justify-between p-6 h-full z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/70">{label}</div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight text-white drop-shadow-md">{value}</div>
            </div>
            {Icon ? (
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-md transition-transform group-hover:scale-110 shadow-inner', iconTone)}>
                <Icon className="h-5 w-5 drop-shadow-sm" />
              </div>
            ) : null}
          </div>
          
          <div className="mt-5 flex items-center justify-between">
            {detail ? <div className="text-sm font-medium text-foreground/60">{detail}</div> : <div />}
            {trend && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md border border-white/10",
                trend.positive ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
              )}>
                {trend.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {trend.value}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
