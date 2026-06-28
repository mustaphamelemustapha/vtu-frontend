import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatMoney } from '@/lib/format';
import { motion } from 'framer-motion';

export function ProfitMetricsCard({ profitData }) {
  if (!profitData) return null;

  const periods = [
    { key: 'daily', label: 'Today', description: 'Since 12:00 AM' },
    { key: 'weekly', label: 'This Week', description: 'Since Monday' },
    { key: 'monthly', label: 'This Month', description: 'Since 1st' },
    { key: 'all_time', label: 'Total Revenue', description: 'Lifetime' },
  ];

  return (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur-xl shadow-sm">
      <CardHeader>
        <CardTitle>Revenue & Profit Analytics</CardTitle>
        <CardDescription>Estimated margins across different time periods.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {periods.map((period) => {
            const data = profitData[period.key] || { revenue: 0, profit_estimate: 0, tx_count: 0 };
            return (
              <div key={period.key} className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">{period.label}</div>
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                  ₦{formatMoney(data.profit_estimate)} <span className="text-sm font-normal text-muted-foreground">profit</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/50 pt-3">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Revenue</div>
                    <div className="text-sm font-medium">₦{formatMoney(data.revenue)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Volume</div>
                    <div className="text-sm font-medium">{data.tx_count} tx</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
