'use client';

import { Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { getActiveBrand } from '@/lib/brand';

export default function SupportPage() {
  const brand = getActiveBrand();
  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Personal settings"
        title="Support"
        description={`Reach ${brand.name} support through email or WhatsApp.`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email support</CardTitle>
            <CardDescription>Send account or transaction issues directly to support.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary p-4 text-sm text-foreground">
              {brand.supportEmail}
            </div>
            <Button asChild className="w-full">
              <a href={`mailto:${brand.supportEmail}`}>
                <Mail className="h-4 w-4" />
                Open email
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp support</CardTitle>
            <CardDescription>Chat directly with support for faster assistance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary p-4 text-sm text-foreground">
              {brand.supportPhone}
            </div>
            <Button asChild variant="secondary" className="w-full">
              <a href={brand.whatsappLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Open WhatsApp
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
