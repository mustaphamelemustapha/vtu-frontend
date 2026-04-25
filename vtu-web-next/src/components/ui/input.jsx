import { cn } from '@/lib/utils';

function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-950 placeholder:text-slate-500 outline-none transition focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
        className
      )}
      {...props}
    />
  );
}

export { Input };
