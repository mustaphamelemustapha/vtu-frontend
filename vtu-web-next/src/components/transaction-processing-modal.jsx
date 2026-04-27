'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';

export function TransactionProcessingModal({
  open,
  title = 'Processing your transaction…',
  description = 'Please wait while we confirm your purchase.',
}) {
  const canUseDom = typeof document !== 'undefined';

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const modal = (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.div
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center shadow-[0_24px_70px_rgba(2,8,23,0.45)]"
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
              <motion.span
                className="absolute inset-0 rounded-full border border-primary/35"
                animate={{ scale: [1, 1.08, 1], opacity: [0.28, 0.08, 0.28] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.span
                className="absolute inset-[5px] rounded-full border border-primary/25"
                animate={{ scale: [1, 1.05, 1], opacity: [0.45, 0.18, 0.45] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/12 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure processing
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (!canUseDom) return null;
  return createPortal(modal, document.body);
}
