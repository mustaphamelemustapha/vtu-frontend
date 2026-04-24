'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-orange-500 text-slate-950 shadow-sm shadow-orange-500/20 hover:bg-orange-600',
        secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
        outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 rounded-xl px-3',
        lg: 'h-12 rounded-2xl px-5 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  const buttonProps = Comp === 'button' && props.type == null ? { type: 'button' } : {};
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...buttonProps} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
