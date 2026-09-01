'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Users, Wallet, Trophy, BarChart3, Gift, Star, Clock } from 'lucide-react';
import { apiFetch, getProfile } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { redirect } from 'next/navigation';

export default function AgentPage() {
  const profile = getProfile();
  
  if (profile?.role !== 'agent' && profile?.role !== 'ambassador' && profile?.role !== 'admin') {
    redirect('/');
  }

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  const [dashboard, setDashboard] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [referrals, setReferrals] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const data = await apiFetch('/agent/dashboard');
        setDashboard(data);
      } else if (activeTab === 'offers') {
        const data = await apiFetch('/agent/campaigns');
        setCampaigns(Array.isArray(data) ? data : []);
      } else if (activeTab === 'referrals') {
        const data = await apiFetch('/agent/referrals');
        setReferrals(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const handleClaimReward = async (campaignId) => {
    try {
      await apiFetch('/agent/claim-reward', {
        method: 'POST',
        body: JSON.stringify({ campaign_id: campaignId })
      });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'offers', label: 'Offers & Campaigns' },
    { id: 'referrals', label: 'Referrals' },
  ];

  const renderDashboard = () => {
    if (loading && !dashboard) {
      return <div className="rounded-2xl border border-border bg-secondary px-4 py-8 text-center text-sm text-muted-foreground animate-pulse">Loading dashboard...</div>;
    }

    if (!dashboard) return null;

    const stats = [
      { label: 'Wallet Balance', value: `₦ ${formatMoney(dashboard.wallet_balance)}`, icon: Wallet, color: 'text-emerald-500' },
      { label: 'Total Data Sold', value: `${(dashboard.total_data_gb || 0).toFixed(2)} GB`, icon: BarChart3, color: 'text-blue-500' },
      { label: 'Total Airtime Sold', value: `₦ ${formatMoney(dashboard.total_airtime_sold)}`, icon: Clock, color: 'text-violet-500' },
      { label: 'Total Referrals', value: dashboard.total_referrals || 0, icon: Users, color: 'text-amber-500' },
    ];

    return (
      <div className="space-y-6">
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
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Current Level: {dashboard.level || 'Starter'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end mb-2">
              <div className="text-sm font-medium">Progress to Next Level</div>
              <div className="text-sm font-semibold">{dashboard.level_progress || 0}%</div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-secondary border border-border overflow-hidden">
              <div 
                className="h-full rounded-full bg-primary transition-all duration-500" 
                style={{ width: `${dashboard.level_progress || 0}%` }} 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderOffers = () => {
    if (loading && !campaigns.length) {
      return <div className="rounded-2xl border border-border bg-secondary px-4 py-8 text-center text-sm text-muted-foreground animate-pulse">Loading offers...</div>;
    }

    if (!campaigns.length) {
      return (
        <div className="rounded-2xl border border-dashed border-border bg-secondary px-4 py-8 text-center text-sm text-muted-foreground">
          <Gift className="h-8 w-8 mx-auto mb-3 opacity-20" />
          No active campaigns at the moment.
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((camp) => {
          const isQualified = camp.is_qualified;
          const isClaimed = camp.is_claimed;
          const progressPct = Math.min(100, (camp.progress_value / camp.target_value) * 100) || 0;

          return (
            <Card key={camp.id} className="flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{camp.title}</CardTitle>
                <CardDescription className="text-xs">{camp.description || `Target: ${camp.target_value}`}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="text-xl font-bold text-emerald-500">
                    ₦ {formatMoney(camp.reward_amount)}
                  </div>
                  {isClaimed ? (
                    <Badge tone="success" className="gap-1"><Check className="h-3 w-3" /> Claimed</Badge>
                  ) : (
                    <Button 
                      onClick={() => handleClaimReward(camp.id)} 
                      disabled={!isQualified}
                      variant={isQualified ? 'default' : 'secondary'}
                      size="sm"
                    >
                      {isQualified ? 'Claim Reward' : 'Not Qualified'}
                    </Button>
                  )}
                </div>

                {!isClaimed && (
                  <div className="mt-auto pt-4 border-t border-border">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Progress</div>
                      <div className="text-xs font-semibold">{camp.progress_value} / {camp.target_value}</div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary border border-border overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", isQualified ? "bg-emerald-500" : "bg-primary")} 
                        style={{ width: `${progressPct}%` }} 
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderReferrals = () => {
    if (loading && !referrals.length) {
      return <div className="rounded-2xl border border-border bg-secondary px-4 py-8 text-center text-sm text-muted-foreground animate-pulse">Loading referrals...</div>;
    }

    if (!referrals.length) {
      return (
        <div className="rounded-2xl border border-dashed border-border bg-secondary px-4 py-8 text-center text-sm text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-3 opacity-20" />
          You haven't referred anyone yet.
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="font-semibold p-4">Name</th>
                  <th className="font-semibold p-4 text-muted-foreground">Date Joined</th>
                  <th className="font-semibold p-4">Status</th>
                  <th className="font-semibold p-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4 font-medium">{ref.name || ref.referred_user_name || 'Unknown User'}</td>
                    <td className="p-4 text-muted-foreground">{formatDateTime(ref.joined_at || ref.created_at)}</td>
                    <td className="p-4">
                      {ref.status === 'active' ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="warning">{ref.status || 'Pending'}</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right font-medium">
                      ₦ {formatMoney(ref.total_revenue || ref.first_deposit_amount || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Agent"
        title="Agent Hub"
        description="Track your performance, claim rewards, and manage your network."
        actions={
          <Button variant="secondary" onClick={() => load()} className="border-border bg-card text-muted-foreground hover:bg-secondary">
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="flex border-b border-border overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'offers' && renderOffers()}
        {activeTab === 'referrals' && renderReferrals()}
      </div>
    </div>
  );
}
