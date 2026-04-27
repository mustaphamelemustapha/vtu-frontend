'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock3, Download, Share2, X, XCircle } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';

function statusUi(status) {
  if (status === 'success') {
    return {
      label: 'Transaction successful',
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-400/30',
      icon: CheckCircle2,
      iconTone: 'text-emerald-400 bg-emerald-500/12 border-emerald-400/30',
    };
  }
  if (status === 'failed') {
    return {
      label: 'Transaction failed',
      badge: 'bg-rose-500/15 text-rose-300 border-rose-400/35',
      icon: XCircle,
      iconTone: 'text-rose-300 bg-rose-500/12 border-rose-400/35',
    };
  }
  return {
    label: 'Transaction pending',
    badge: 'bg-amber-500/12 text-amber-300 border-amber-400/30',
    icon: Clock3,
    iconTone: 'text-amber-300 bg-amber-500/12 border-amber-400/30',
  };
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  try {
    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function TransactionReceiptModal({ open, receipt, onClose, onDownload, onShare }) {
  const [actionNote, setActionNote] = useState('');
  const pdfReceiptRef = useRef(null);
  const canUseDom = typeof document !== 'undefined';
  const status = useMemo(() => statusUi(receipt?.status), [receipt?.status]);
  const StatusIcon = status.icon;

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) setActionNote('');
  }, [open]);

  const rows = useMemo(() => {
    if (!receipt) return [];
    const baseRows = [
      { label: 'Reference', value: receipt.reference || 'N/A' },
      { label: 'Date & time', value: formatDate(receipt.createdAt) },
    ];
    if (receipt.customer) baseRows.push({ label: 'Customer', value: receipt.customer });
    for (const item of receipt.meta || []) {
      if (!item?.label || item?.value == null || item?.value === '') continue;
      baseRows.push({ label: item.label, value: String(item.value) });
    }
    return baseRows;
  }, [receipt]);

  const handleShare = async () => {
    if (!onShare) return;
    const result = await onShare(pdfReceiptRef.current);
    if (result?.mode === 'clipboard') setActionNote('Receipt copied. You can now paste and share.');
    else if (result?.mode === 'file-share') setActionNote('Receipt file ready in your share sheet.');
    else if (result?.mode === 'share') setActionNote('Share sheet opened.');
    else setActionNote('Sharing is not available on this device.');
  };

  const modal = (
    <AnimatePresence>
      {open && receipt ? (
        <motion.div
          className="fixed inset-0 z-[310] flex items-center justify-center bg-black/65 px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-2xl"
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-border px-5 py-4 md:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-white/95 p-1.5 dark:bg-white">
                    <Image src="/brand/axisvtu-icon.png" alt="AxisVTU" width={26} height={26} className="h-6 w-6 object-contain" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">AxisVTU receipt</div>
                    <div className="text-xs text-muted-foreground">Transaction confirmation</div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${status.badge}`}>
                    {receipt.status || 'pending'}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="max-h-[min(78vh,740px)] space-y-4 overflow-y-auto px-5 py-5 md:px-6">
              <div className="rounded-2xl border border-border bg-secondary/75 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full border ${status.iconTone}`}>
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold text-foreground">{status.label}</div>
                    <div className="mt-1 text-sm font-medium text-muted-foreground">{receipt.service}</div>
                    <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                      ₦{formatMoney(receipt.amount || 0)}
                    </div>
                  </div>
                </div>
                {receipt.message ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{receipt.message}</p> : null}
              </div>

              <div className="rounded-2xl border border-border bg-secondary/75 px-4 py-2">
                {rows.map((row) => (
                  <div key={`${row.label}-${row.value}`} className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-b-0">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="text-sm font-medium text-foreground text-right">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="secondary"
                  onClick={() => onDownload?.(pdfReceiptRef.current)}
                  className="h-11 border-border bg-secondary text-foreground hover:bg-secondary/80"
                >
                  <Download className="h-4 w-4" />
                  Download receipt
                </Button>
                <Button onClick={handleShare} className="h-11 sm:justify-center">
                  <Share2 className="h-4 w-4" />
                  Share receipt file
                </Button>
              </div>

              {actionNote ? <p className="text-xs text-muted-foreground">{actionNote}</p> : null}
            </div>
          </motion.div>

          <div className="pointer-events-none fixed -left-[9999px] top-0 w-[560px]">
            <div ref={pdfReceiptRef} className="w-[560px] rounded-2xl bg-white p-6 text-slate-900">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <Image src="/brand/axisvtu-icon.png" alt="AxisVTU" width={30} height={30} className="h-7 w-7 object-contain" />
                  <div className="text-base font-semibold text-slate-900">AxisVTU</div>
                </div>
                <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700">
                  {receipt.status || 'pending'}
                </span>
              </div>
              <div className="mt-5">
                <div className="text-sm text-slate-500">Transaction Receipt</div>
                <div className="mt-1 text-[34px] font-semibold tracking-tight text-slate-900">₦{formatMoney(receipt.amount || 0)}</div>
                <div className="mt-1 text-sm text-slate-600">{receipt.service}</div>
              </div>
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                {rows.map((row) => (
                  <div key={`pdf-${row.label}-${row.value}`} className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 last:border-b-0">
                    <span className="text-sm text-slate-500">{row.label}</span>
                    <span className="text-sm font-medium text-slate-900 text-right">{row.value}</span>
                  </div>
                ))}
              </div>
              {receipt.message ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">{receipt.message}</div>
              ) : null}
              <div className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-500">
                Need help? mmtechglobe@gmail.com
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (!canUseDom) return null;
  return createPortal(modal, document.body);
}
