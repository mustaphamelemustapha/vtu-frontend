'use client';

import { useState } from 'react';
import { adminCreatePromo } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Ticket } from 'lucide-react';

export default function AdminPromosPage() {
  const [promoForm, setPromoForm] = useState({
    code: '',
    description: '',
    discount_amount: '',
    is_percentage: false,
    max_uses_per_user: 1,
    max_total_uses: 100,
    is_active: true
  });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!promoForm.code || !promoForm.discount_amount) {
      alert("Code and discount amount are required.");
      return;
    }
    
    setBusy(true);
    try {
      await adminCreatePromo({
        code: promoForm.code,
        description: promoForm.description,
        discount_amount: parseFloat(promoForm.discount_amount),
        is_percentage: promoForm.is_percentage,
        max_uses_per_user: parseInt(promoForm.max_uses_per_user),
        max_total_uses: parseInt(promoForm.max_total_uses),
        is_active: promoForm.is_active
      });
      alert("Promo code created successfully!");
      setPromoForm({
        code: '', description: '', discount_amount: '', is_percentage: false,
        max_uses_per_user: 1, max_total_uses: 100, is_active: true
      });
    } catch (err) {
      alert(err?.message || "Failed to create promo code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <AdminPageHeader
        eyebrow="Configuration"
        title="Promos"
        description="Create and manage promotional discount codes."
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden max-w-2xl">
          <CardHeader className="border-b border-border/50 bg-secondary/20 pb-5 pt-6 px-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand/10 text-brand">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Create Promo Code</CardTitle>
                <CardDescription className="mt-1">Add a new discount code for your users.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</label>
                  <Input
                    required
                    placeholder="e.g. LAUNCH20"
                    value={promoForm.code}
                    onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                    className="h-11 rounded-xl bg-secondary/30"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                  <Input
                    placeholder="Special discount..."
                    value={promoForm.description}
                    onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                    className="h-11 rounded-xl bg-secondary/30"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Discount Amount</label>
                  <Input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={promoForm.discount_amount}
                    onChange={(e) => setPromoForm({ ...promoForm, discount_amount: e.target.value })}
                    className="h-11 rounded-xl bg-secondary/30"
                  />
                </div>
                <div className="flex items-center pt-8 gap-3">
                  <input
                    type="checkbox"
                    id="is_pct"
                    checked={promoForm.is_percentage}
                    onChange={(e) => setPromoForm({ ...promoForm, is_percentage: e.target.checked })}
                    className="w-5 h-5 rounded border-border"
                  />
                  <label htmlFor="is_pct" className="text-sm font-medium">Percentage Discount?</label>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Uses Per User</label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={promoForm.max_uses_per_user}
                    onChange={(e) => setPromoForm({ ...promoForm, max_uses_per_user: e.target.value })}
                    className="h-11 rounded-xl bg-secondary/30"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Total Uses</label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={promoForm.max_total_uses}
                    onChange={(e) => setPromoForm({ ...promoForm, max_total_uses: e.target.value })}
                    className="h-11 rounded-xl bg-secondary/30"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={promoForm.is_active}
                  onChange={(e) => setPromoForm({ ...promoForm, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-border"
                />
                <label htmlFor="is_active" className="text-sm font-medium">Active (Live)</label>
              </div>

            </CardContent>
            <div className="p-6 pt-0">
              <Button type="submit" disabled={busy} className="w-full sm:w-auto h-11 px-8 rounded-xl">
                {busy ? 'Creating...' : 'Create Promo Code'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
