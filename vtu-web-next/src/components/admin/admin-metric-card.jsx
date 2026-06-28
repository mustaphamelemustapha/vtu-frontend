import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function AdminMetricCard({ label, value, detail, icon: Icon, tone = 'brand', trend }) {
  const iconTone =
    tone === 'success'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/12 dark:text-emerald-200'
      : tone === 'warning'
        ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/12 dark:text-amber-200'
        : tone === 'danger'
          ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/12 dark:text-rose-200'
          : 'border-orange-300 bg-orange-50 text-primary dark:border-orange-400/30 dark:bg-orange-500/12 dark:text-orange-200';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card className="h-full relative overflow-hidden group border-border/50 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-b from-card to-secondary/20">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity from-transparent via-primary/50 to-transparent" />
        <CardContent className="flex flex-col justify-between p-5 h-full">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</div>
            </div>
            {Icon ? (
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border transition-transform group-hover:scale-110', iconTone)}>
                <Icon className="h-5 w-5" />
              </div>
            ) : null}
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            {detail ? <div className="text-sm text-muted-foreground">{detail}</div> : <div />}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                trend.positive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              )}>
                {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.value}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
