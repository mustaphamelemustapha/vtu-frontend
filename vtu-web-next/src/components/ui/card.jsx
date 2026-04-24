import { cn } from '@/lib/utils';

function Card({ className, ...props }) {
  return <div className={cn('rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]', className)} {...props} />;
}

function CardHeader({ className, ...props }) {
  return <div className={cn('p-6 pb-0', className)} {...props} />;
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-6', className)} {...props} />;
}

function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-base font-semibold tracking-tight text-slate-950', className)} {...props} />;
}

function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm leading-6 text-slate-600', className)} {...props} />;
}

export { Card, CardHeader, CardContent, CardTitle, CardDescription };
