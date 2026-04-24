import { cn } from '@/lib/utils';

function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-orange-400/60 focus:ring-2 focus:ring-orange-500/15',
        className
      )}
      {...props}
    />
  );
}

export { Input };
