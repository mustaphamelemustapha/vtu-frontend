import { cn } from '@/lib/utils';

function Card({ className, ...props }) {
  return <div className={cn('rounded-3xl border border-white/10 bg-slate-950/55 shadow-soft backdrop-blur-xl', className)} {...props} />;
}

function CardHeader({ className, ...props }) {
  return <div className={cn('p-6 pb-0', className)} {...props} />;
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-6', className)} {...props} />;
}

function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-base font-semibold tracking-tight text-white', className)} {...props} />;
}

function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm leading-6 text-slate-400', className)} {...props} />;
}

export { Card, CardHeader, CardContent, CardTitle, CardDescription };
