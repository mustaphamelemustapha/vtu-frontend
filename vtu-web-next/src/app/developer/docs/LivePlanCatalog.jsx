'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const NETWORK_COLORS = {
  mtn: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]',
  glo: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
  airtel: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  '9mobile': 'bg-emerald-700 shadow-[0_0_8px_rgba(4,120,87,0.5)]',
  other: 'bg-gray-400',
};

const NETWORK_ORDER = ['mtn', 'airtel', 'glo', '9mobile'];

export default function LivePlanCatalog() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/data/plans');
      const list = Array.isArray(res) ? res : (res?.items || res?.data || res?.plans || []);
      setPlans(list);
    } catch (err) {
      console.error('Failed to load plans:', err);
      setError(err.message || 'Failed to load plans. Please ensure you are logged in.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const planGroups = useMemo(() => {
    const grouped = new Map();
    for (const plan of plans) {
      if (!plan) continue;
      const net = (plan.network || '').toLowerCase().trim();
      const key = net.includes('9mobile') ? '9mobile' : net.includes('mtn') ? 'mtn' : net.includes('glo') ? 'glo' : net.includes('airtel') ? 'airtel' : 'other';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(plan);
    }
    
    return NETWORK_ORDER.filter(key => grouped.has(key)).map(key => ({
      network: key,
      plans: grouped.get(key).sort((a, b) => Number(a.price) - Number(b.price))
    }));
  }, [plans]);

  if (error) {
    return (
      <div className="mt-8 py-12 text-center border border-slate-800 rounded-xl bg-slate-900/50">
        <p className="text-slate-400 text-sm">{error}</p>
        <Link href="/login" className="inline-block mt-4 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-full py-1.5 px-4 transition-all">
          Login to view plans
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center py-16 space-y-4 border border-slate-800 rounded-xl bg-slate-900/50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <div className="text-xs text-slate-400 animate-pulse uppercase tracking-widest font-semibold">Syncing Live Catalog...</div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex justify-end mb-4">
        <Badge variant="outline" className="h-7 gap-1.5 w-fit border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-sm px-3 rounded-full text-xs cursor-pointer hover:bg-blue-500/20 transition-colors" onClick={load}>
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> 
          Live Sync
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {planGroups.map(group => (
          <div key={group.network} className="rounded-xl border border-slate-800 bg-[#0c1017] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full", NETWORK_COLORS[group.network] || NETWORK_COLORS.other)} />
                <span className="font-bold text-sm text-slate-200 capitalize tracking-wide">
                  {group.network === '9mobile' ? '9mobile' : group.network}
                </span>
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                {group.plans.length} Plans
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase tracking-widest text-slate-500 bg-black/20">
                    <th className="px-4 py-2.5 font-bold">Plan ID</th>
                    <th className="px-4 py-2.5 font-bold">Capacity</th>
                    <th className="px-4 py-2.5 font-bold">Validity</th>
                    <th className="px-4 py-2.5 font-bold text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {group.plans.map(plan => (
                    <tr key={plan.id} className="hover:bg-slate-900/50 transition-colors group">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400 group-hover:text-blue-400 transition-colors">{plan.id}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-slate-300">{plan.data_size}</td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-500">{plan.validity || '30 Days'}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-200">₦{formatMoney(plan.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {planGroups.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-slate-500 border border-dashed rounded-xl border-slate-800 bg-[#0c1017]/50 text-sm">
            No data plans currently available.
          </div>
        )}
      </div>
    </div>
  );
}
