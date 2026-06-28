'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  Smartphone,
  Tv2,
  Wifi,
  Zap,
  Gift,
  ChevronRight
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const services = [
  {
    title: 'Buy Data',
    description: 'Instant data bundles for all networks. MTN, Airtel, GLO & 9mobile at the best rates.',
    icon: Wifi,
    href: '/buy-data',
    color: 'from-blue-500/20 via-blue-500/5 to-transparent',
    iconBg: 'bg-blue-500',
    border: 'border-blue-500/20'
  },
  {
    title: 'Airtime Top-up',
    description: 'Recharge your line instantly. Fast and secure airtime delivery to any number.',
    icon: Smartphone,
    href: '/airtime',
    color: 'from-sky-500/20 via-sky-500/5 to-transparent',
    iconBg: 'bg-sky-500',
    border: 'border-sky-500/20'
  },
  {
    title: 'Electricity Bills',
    description: 'Pay your prepaid and postpaid electricity bills. Get your token instantly.',
    icon: Zap,
    href: '/electricity',
    color: 'from-amber-500/20 via-amber-500/5 to-transparent',
    iconBg: 'bg-amber-500',
    border: 'border-amber-500/20'
  },
  {
    title: 'Cable TV',
    description: 'Subscribe your DSTV, GOTV, and Startimes decoders without any hassle.',
    icon: Tv2,
    href: '/cable-tv',
    color: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    iconBg: 'bg-emerald-500',
    border: 'border-emerald-500/20'
  },
  {
    title: 'Exam PINs',
    description: 'Purchase WAEC, NECO, and NABTEB scratch cards directly from your wallet.',
    icon: GraduationCap,
    href: '/exam-pins',
    color: 'from-purple-500/20 via-purple-500/5 to-transparent',
    iconBg: 'bg-purple-500',
    border: 'border-purple-500/20'
  },
  {
    title: 'Wallet Funding',
    description: 'Add money to your account using your dedicated virtual account number.',
    icon: CircleDollarSign,
    href: '/wallet',
    color: 'from-emerald-600/20 via-emerald-600/5 to-transparent',
    iconBg: 'bg-emerald-600',
    border: 'border-emerald-600/20'
  },
  {
    title: 'Transaction History',
    description: 'Keep track of your spending, view receipts, and monitor your account.',
    icon: Clock3,
    href: '/history',
    color: 'from-slate-500/20 via-slate-500/5 to-transparent',
    iconBg: 'bg-slate-600',
    border: 'border-slate-500/20'
  },
  {
    title: 'Refer & Earn',
    description: 'Invite your friends to MELE DATA and earn commission on their transactions.',
    icon: Gift,
    href: '/referrals',
    color: 'from-violet-500/20 via-violet-500/5 to-transparent',
    iconBg: 'bg-violet-500',
    border: 'border-violet-500/20'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function ServicesPage() {
  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Services"
        title="Our Services"
        description="Select a service below to get started. Fast, seamless, and secure transactions."
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <motion.div key={service.title} variants={itemVariants}>
              <Link href={service.href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-3xl">
                <Card className={cn(
                  "group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card/40 backdrop-blur-xl p-6 transition-all duration-300",
                  "hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1",
                  service.border
                )}>
                  {/* Subtle Background Gradient */}
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 transition-opacity duration-300 group-hover:opacity-100", service.color)} />
                  
                  <div className="relative z-10 flex flex-1 flex-col">
                    <div className="flex items-start justify-between">
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg", service.iconBg)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/50 text-muted-foreground backdrop-blur-sm transition-colors group-hover:bg-background group-hover:text-foreground">
                        <ArrowRight className="h-4 w-4 -rotate-45 transition-transform duration-300 group-hover:rotate-0" />
                      </div>
                    </div>
                    
                    <div className="mt-6 flex-1">
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">{service.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
      
      {/* Decorative premium banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <div className="relative mt-12 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand via-brand to-orange-600 p-8 text-white sm:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-[3rem]" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-black/10 blur-[3rem]" />
          <div className="relative z-10 flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
            <div className="max-w-xl">
              <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">Need help with a transaction?</h3>
              <p className="mt-3 text-brand-foreground/90">
                Our support team is always available to help you resolve any issues or answer your questions.
              </p>
            </div>
            <Link 
              href="/support" 
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-brand transition-all hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand shadow-xl"
            >
              Contact Support
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
