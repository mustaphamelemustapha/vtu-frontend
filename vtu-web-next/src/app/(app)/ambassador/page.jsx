'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Users, Trophy, BarChart3, Clock } from 'lucide-react';
import { apiFetch, getProfile } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { redirect } from 'next/navigation';

export default function AmbassadorPage() {
  const profile = getProfile();
  
  if (profile?.role !== 'ambassador' && profile?.role !== 'admin') {
    redirect('/');
  }

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/agent/referrals');
      if (Array.isArray(res)) {
        setData(res);
      } else {
        setData([]);
      }
    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const rows = data || [];

  const stats = useMemo(() => {
    const totalReferrals = rows.length;
    const totalVolumeGB = rows.reduce((acc, ref) => acc + (ref.accumulated_gb || 0), 0);
    const milestoneCount = rows.filter(r => r.is_50gb_milestone_reached).length;
    const milestonePaidCount = rows.filter(r => r.is_milestone_bonus_paid).length;
    
    return [
      { label: 'Total Referred Vendors', value: totalReferrals, icon: Users, color: 'text-blue-500' },
      { label: 'Total Data Volume', value: `${totalVolumeGB.toFixed(2)} GB`, icon: BarChart3, color: 'text-emerald-500' },
      { label: 'Milestones Reached', value: milestoneCount, icon: Trophy, color: 'text-amber-500' },
      { label: 'Pending Payouts', value: milestoneCount - milestonePaidCount, icon: Clock, color: 'text-rose-500' },
    ];
  }, [rows]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Growth"
        title="Ambassador Hub"
        description="Track your referred vendors, 10% commission, and 50GB milestone bonuses."
        actions={
          <Button variant="secondary" onClick={load} className="border-border bg-card text-muted-foreground hover:bg-secondary">
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const IconComponent = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{item.value}</div>
                </div>
                <div className={cn("p-3 bg-secondary rounded-full border border-border", item.color)}>
                  <IconComponent className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Vendors</CardTitle>
          <CardDescription>Monitor your vendors' deposit status and milestone progress.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loading && !rows.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-secondary px-4 py-8 text-center text-sm text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-3 opacity-20" />
              No vendors referred yet.
            </div>
          ) : null}

          {loading ? (
             <div className="rounded-2xl border border-border bg-secondary px-4 py-8 text-center text-sm text-muted-foreground animate-pulse">
               Loading vendors...
             </div>
          ) : (
            <div className="grid gap-4">
              {rows.map((item) => {
                const gb = item.accumulated_gb || 0;
                const progressPct = Math.min(100, (gb / 50) * 100);
                
                return (
                  <div key={item.id} className="rounded-2xl border border-border bg-secondary p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                          {item.referred_user_name || 'Unknown User'}
                        </div>
                        <div className="text-xs text-muted-foreground">Joined: {formatDateTime(item.created_at)}</div>
                      </div>
                      
                      <div className="flex gap-2">
                        {item.is_ten_percent_paid ? (
                          <Badge tone="success">10% Paid</Badge>
                        ) : item.first_deposit_amount ? (
                          <Badge tone="warning">10% Pending</Badge>
                        ) : (
                          <Badge tone="neutral">No Deposit</Badge>
                        )}
                        
                        {item.is_milestone_bonus_paid ? (
                          <Badge tone="success">Bonus Paid</Badge>
                        ) : item.is_50gb_milestone_reached ? (
                          <Badge tone="warning">Bonus Pending</Badge>
                        ) : null}
                      </div>
                    </div>
                    
                    <div className="grid gap-4 text-sm sm:grid-cols-3 bg-card p-3 rounded-xl border border-border">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">First Deposit</div>
                        <div className="font-medium text-foreground">
                          {item.first_deposit_amount ? `₦${formatMoney(item.first_deposit_amount)}` : 'Pending'}
                        </div>
                      </div>
                      
                      <div className="sm:col-span-2">
                        <div className="flex justify-between items-end mb-1">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">50GB Milestone</div>
                          <div className="text-xs font-medium">{gb.toFixed(2)} GB</div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary border border-border overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-500", progressPct >= 100 ? "bg-emerald-500" : "bg-primary")} 
                            style={{ width: `${progressPct}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
