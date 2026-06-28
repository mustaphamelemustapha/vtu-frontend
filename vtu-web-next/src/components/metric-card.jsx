import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function MetricCard({ label, value, detail, icon: Icon, tone = 'brand', className }) {
  const getGlowStyles = (tone) => {
    switch (tone) {
      case 'emerald': return { glow: 'from-emerald-500/20 to-transparent', orb: 'bg-emerald-500/20', text: 'text-emerald-500', border: 'border-emerald-500/30' };
      case 'amber': return { glow: 'from-amber-500/20 to-transparent', orb: 'bg-amber-500/20', text: 'text-amber-500', border: 'border-amber-500/30' };
      case 'violet': return { glow: 'from-violet-500/20 to-transparent', orb: 'bg-violet-500/20', text: 'text-violet-500', border: 'border-violet-500/30' };
      default: return { glow: 'from-brand/20 to-transparent', orb: 'bg-brand/20', text: 'text-brand', border: 'border-brand/30' };
    }
  };

  const styles = getGlowStyles(tone);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn('relative overflow-hidden rounded-2xl border border-white/10 bg-card/40 backdrop-blur-2xl shadow-xl group', className)}
    >
      <div className={`absolute inset-0 bg-gradient-to-br opacity-40 transition-opacity group-hover:opacity-100 ${styles.glow}`} />
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[3rem] opacity-50 ${styles.orb}`} />
      
      <div className="relative z-10 flex items-start justify-between gap-4 p-5 sm:p-6">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</div>
          <div className="text-3xl font-extrabold tracking-tight text-foreground md:text-[2rem] drop-shadow-sm">{value}</div>
          {detail ? <div className="text-sm font-medium text-muted-foreground/80">{detail}</div> : null}
        </div>
        {Icon ? (
          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-background/50 shadow-inner backdrop-blur-sm', styles.border, styles.text)}>
            <Icon className="h-6 w-6" />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
