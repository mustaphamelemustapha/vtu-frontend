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
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      iconTone: 'text-emerald-700 bg-emerald-100 border-emerald-200',
    };
  }
  if (status === 'failed') {
    return {
      label: 'Transaction failed',
      badge: 'bg-rose-100 text-rose-700 border-rose-200',
      icon: XCircle,
      iconTone: 'text-rose-700 bg-rose-100 border-rose-200',
    };
  }
  return {
    label: 'Transaction pending',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Clock3,
    iconTone: 'text-amber-700 bg-amber-100 border-amber-200',
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
          className="fixed inset-0 z-[310] flex items-end justify-center bg-black/65 px-0 py-0 md:items-center md:px-4 md:py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-slate-200 bg-slate-100 shadow-2xl md:rounded-3xl"
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-[#2563eb] via-[#2f6ceb] to-[#3b82f6] px-6 pb-7 pt-8">
              <div className="mx-auto flex w-fit flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
                  <Image src="/brand/axisvtu-icon.png" alt="AxisVTU" width={44} height={44} className="h-11 w-11 object-contain" />
                </div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-white">AxisVTU</div>
                <div className="mt-1 text-lg text-blue-100">Transaction Receipt</div>
              </div>
            </div>

            <div className="max-h-[min(84vh,760px)] space-y-4 overflow-y-auto px-5 py-5 md:px-6">
              <div className="mx-auto -mt-2 mb-2 h-1.5 w-12 rounded-full bg-slate-300 md:hidden" />
              <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${status.iconTone}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-2xl font-semibold tracking-tight text-slate-900">{status.label}</div>
                      <div className="mt-1 text-sm font-medium text-slate-500">{receipt.service}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="mt-4 flex items-center justify-start">
                  <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${status.badge}`}>
                    ● {receipt.status === 'success' ? 'Successful' : receipt.status === 'failed' ? 'Failed' : 'Pending'}
                  </span>
                </div>

                <div className="mt-4 text-5xl font-semibold tracking-tight text-slate-900">
                  ₦{formatMoney(receipt.amount || 0)}
                </div>

                {receipt.message ? (
                  <p className="mt-3 text-base leading-7 text-slate-600">{receipt.message}</p>
                ) : null}

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
                  {rows.map((row) => (
                    <div key={`${row.label}-${row.value}`} className="flex items-start justify-between gap-3 border-b border-slate-200 py-3 last:border-b-0">
                      <span className="text-base font-medium text-slate-500">{row.label}</span>
                      <span className="text-base font-semibold text-slate-900 text-right">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button
                    variant="secondary"
                    onClick={() => onDownload?.(pdfReceiptRef.current)}
                    className="h-12 border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Download receipt
                  </Button>
                  <Button onClick={handleShare} className="h-12 bg-[#2563eb] text-white hover:bg-[#1d4ed8]">
                    <Share2 className="h-4 w-4" />
                    Share receipt file
                  </Button>
                </div>
                {actionNote ? <p className="mt-2 text-xs text-slate-500">{actionNote}</p> : null}
              </div>
              <div className="pb-1 text-center text-xs font-medium text-slate-400">axisvtu.com</div>
            </div>
          </motion.div>

          <div className="pointer-events-none fixed -left-[9999px] top-0 w-[560px]">
            <div ref={pdfReceiptRef} className="w-[560px] overflow-hidden rounded-2xl bg-slate-100 text-slate-900">
              <div className="bg-gradient-to-br from-[#2563eb] via-[#2f6ceb] to-[#3b82f6] px-8 pb-8 pt-10">
                <div className="mx-auto flex w-fit flex-col items-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
                    <Image src="/brand/axisvtu-icon.png" alt="AxisVTU" width={42} height={42} className="h-10 w-10 object-contain" />
                  </div>
                  <div className="mt-3 text-[42px] font-semibold tracking-tight text-white">AxisVTU</div>
                  <div className="mt-1 text-[28px] text-blue-100">Transaction Receipt</div>
                </div>
              </div>
              <div className="px-6 py-6">
                <div className="rounded-[22px] border border-slate-200 bg-white px-6 py-6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center justify-center">
                    <span className={`rounded-full border px-3 py-1 text-[22px] font-semibold ${status.badge}`}>
                      ● {receipt.status === 'success' ? 'Successful' : receipt.status === 'failed' ? 'Failed' : 'Pending'}
                    </span>
                  </div>
                  <div className="mt-5 text-center text-[44px] font-semibold tracking-tight text-slate-900">
                    ₦{formatMoney(receipt.amount || 0)}
                  </div>
                  <div className="mt-1 text-center text-[22px] text-slate-600">{receipt.service}</div>
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
                    {rows.map((row) => (
                      <div key={`pdf-${row.label}-${row.value}`} className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 last:border-b-0">
                        <span className="text-[20px] text-slate-500">{row.label}</span>
                        <span className="text-[20px] font-medium text-slate-900 text-right">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  {receipt.message ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[18px] leading-8 text-slate-700">{receipt.message}</div>
                  ) : null}
                </div>
                <div className="mt-5 text-center text-[20px] text-slate-400">www.axisvtu.com</div>
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
