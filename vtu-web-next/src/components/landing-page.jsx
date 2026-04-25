'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  ChevronDown,
  CreditCard,
  FileText,
  Headphones,
  Menu,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tv2,
  X,
  Wifi,
  Wallet,
  History,
  BookOpen,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const navLinks = [
  { label: 'What you can do', href: '#services' },
  { label: 'Why choose us', href: '#trust' },
  { label: 'About', href: '#about' },
  { label: 'FAQ', href: '#faq' },
];

const heroPoints = ['Instant purchases', 'Wallet funding', 'Clear receipts'];

const services = [
  {
    icon: Wifi,
    title: 'Buy Data',
    text: 'Purchase mobile data through a guided flow that keeps the steps simple and clear.',
  },
  {
    icon: Smartphone,
    title: 'Buy Airtime',
    text: 'Top up your own line or send airtime to another number with a few taps.',
  },
  {
    icon: Wallet,
    title: 'Fund Wallet',
    text: 'Transfer money to your dedicated account and use the balance for everyday services.',
  },
  {
    icon: CreditCard,
    title: 'Transaction History',
    text: 'Review purchases, receipts, and wallet activity from one organised view.',
  },
  {
    icon: Zap,
    title: 'Electricity',
    text: 'Pay electricity bills in a calm, structured flow when the service is available.',
  },
  {
    icon: Tv2,
    title: 'Cable TV',
    text: 'Renew cable subscriptions in one place without switching between screens.',
  },
  {
    icon: BookOpen,
    title: 'Education PINs',
    text: 'Handle exam and education PIN purchases where that service is enabled.',
  },
  {
    icon: Banknote,
    title: 'Account Funding',
    text: 'Use your dedicated virtual account to fund your wallet and keep the record clear.',
  },
];

const trustPoints = [
  {
    icon: ShieldCheck,
    title: 'Secure wallet system',
    text: 'Wallet activity stays structured and easy to review.',
  },
  {
    icon: BadgeCheck,
    title: 'Transaction PIN',
    text: 'Sensitive actions can be protected with a PIN before confirmation.',
  },
  {
    icon: FileText,
    title: 'Clean receipts',
    text: 'Each payment keeps a record that is easy to revisit later.',
  },
  {
    icon: History,
    title: 'Reliable records',
    text: 'Users can follow what happened without digging through noise.',
  },
];

const aboutBullets = [
  'A simple VTU and payments experience for everyday use',
  'Designed for individuals, small businesses, and resellers',
  'Built around clarity, reliability, and clean account management',
];

const faqs = [
  {
    q: 'How do I fund my wallet?',
    a: 'Transfer money to your dedicated account, then wait for confirmation before making purchases.',
  },
  {
    q: 'How fast are data purchases?',
    a: 'Data purchases are designed to complete quickly once the transaction is approved.',
  },
  {
    q: 'What happens if a transaction fails?',
    a: 'Failed transactions are kept in the history so you can review the status and follow up if needed.',
  },
  {
    q: 'How secure is my account?',
    a: 'AxisVTU uses a transaction PIN flow for sensitive actions and keeps records organized for review.',
  },
  {
    q: 'Can I view receipts?',
    a: 'Yes. Receipts and transaction history are kept together so they are easy to find later.',
  },
];

const motionFadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

function BrandLogo({ className = '' }) {
  return <img src="/brand/axisvtu-logo.svg" alt="AxisVTU" className={`h-10 w-auto ${className}`.trim()} />;
}

function PageSection({ eyebrow, title, description, align = 'left' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <div className="axis-label text-primary">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-lg leading-8 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function MobileMenu({ open, onClose }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-x-4 top-4 rounded-3xl border border-border bg-card p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <BrandLogo className="h-8" />
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {navLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className="rounded-2xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition hover:border-orange-200 hover:bg-orange-50 hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button asChild variant="secondary" className="h-11 rounded-full border-border bg-card text-muted-foreground">
                <Link href="/login" onClick={onClose}>
                  Sign In
                </Link>
              </Button>
              <Button asChild className="h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/register" onClick={onClose}>
                  Get Started
                </Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b bg-card/85 backdrop-blur-xl transition-shadow ${
          scrolled ? 'border-border shadow-[0_8px_30px_rgba(15,23,42,0.05)]' : 'border-transparent'
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo className="h-9 sm:h-10" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex">
            {navLinks.map((item) => (
              <a key={item.label} href={item.href} className="transition hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Button asChild variant="secondary" className="h-11 rounded-full border-border bg-card px-5 text-muted-foreground hover:bg-secondary">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="h-11 rounded-full bg-primary px-5 text-primary-foreground shadow-sm shadow-orange-200 hover:bg-primary/90">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-28 lg:pt-16">
        <div className="flex flex-col justify-center">
          <motion.div
            variants={motionFadeUp}
            initial="hidden"
            animate="show"
            custom={0}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-card px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AxisVTU for everyday payments
          </motion.div>

          <motion.h1
            variants={motionFadeUp}
            initial="hidden"
            animate="show"
            custom={0.08}
            className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Buy Airtime, Data & Pay Bills in Seconds
          </motion.h1>

          <motion.p
            variants={motionFadeUp}
            initial="hidden"
            animate="show"
            custom={0.16}
            className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl"
          >
            Top up any network, fund your wallet, and manage everyday payments with a simple, reliable AxisVTU account.
          </motion.p>

          <motion.div
            variants={motionFadeUp}
            initial="hidden"
            animate="show"
            custom={0.24}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Button asChild className="h-12 rounded-full bg-primary px-6 text-base text-primary-foreground shadow-sm shadow-orange-200 hover:bg-primary/90">
              <Link href="/register">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-12 rounded-full border-border bg-card px-6 text-base text-muted-foreground hover:bg-secondary">
              <Link href="/login">Log in</Link>
            </Button>
          </motion.div>

          <motion.div
            variants={motionFadeUp}
            initial="hidden"
            animate="show"
            custom={0.32}
            className="mt-9 flex flex-wrap gap-3"
          >
            {heroPoints.map((point) => (
              <div key={point} className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
                {point}
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute inset-x-16 top-20 h-44 rounded-full bg-orange-100/40 blur-3xl" />
          <Card className="relative w-full max-w-xl overflow-hidden border-border bg-card shadow-[0_22px_60px_rgba(15,23,42,0.06)]">
            <CardContent className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <BrandLogo className="h-7" />
                    <span className="axis-label text-primary">Product preview</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Clean dashboard preview</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    The interface is designed for quick top-ups, wallet funding, and clear transaction records on desktop.
                  </p>
                </div>
                  <div className="rounded-2xl bg-orange-50 p-3 text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-secondary p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Wallet balance</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Available for purchases</div>
                  <div className="mt-2 text-sm text-muted-foreground">Funded through the dedicated account route.</div>
                </div>
                <div className="rounded-3xl border border-border bg-secondary p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Receipts</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Easy to review</div>
                  <div className="mt-2 text-sm text-muted-foreground">Each purchase keeps a clear record for later.</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-border bg-card p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Recent activity</div>
                  <div className="mt-4 space-y-3">
                    {[
                      ['Data purchase', 'MTN 2GB - ₦1,500', 'Completed'],
                      ['Wallet funding', 'Virtual account transfer', 'Confirmed'],
                      ['Airtime top-up', 'Glo - ₦2,000', 'Completed'],
                    ].map(([title, detail, status]) => (
                      <div key={title} className="flex items-center justify-between rounded-2xl border border-border bg-secondary px-3 py-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">{title}</div>
                          <div className="text-xs text-muted-foreground">{detail}</div>
                        </div>
                        <div className="text-xs font-semibold text-primary">{status}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-3xl border border-border bg-card p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Quick actions</div>
                    <div className="mt-4 grid gap-2">
                      {['Buy Data', 'Buy Airtime', 'Fund Wallet', 'View History'].map((item) => (
                        <div key={item} className="rounded-2xl border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-orange-200 bg-orange-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Protection</div>
                    <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                      <BadgeCheck className="h-5 w-5 shrink-0 text-primary" />
                      Sensitive actions stay protected with a transaction PIN.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section id="services" className="bg-card px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PageSection
          eyebrow="What you can do with AxisVTU"
          title="The actions are clear, familiar, and easy to scan"
          description="A visitor should understand the product in a few seconds and know exactly where to begin."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {services.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                variants={motionFadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                custom={index * 0.05}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full border-border bg-card shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <CardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section id="trust" className="bg-background px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <motion.div variants={motionFadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} custom={0}>
            <PageSection
              eyebrow="Why choose us"
              title="A calmer VTU experience for everyday use"
              description="AxisVTU is built for people who want speed without confusion, and structure without a crowded interface."
            />
            <div className="mt-6 grid gap-3">
              {aboutBullets.map((bullet) => (
                <div key={bullet} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2">
            {trustPoints.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  variants={motionFadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.2 }}
                  custom={index * 0.06}
                  whileHover={{ y: -2 }}
                >
                  <Card className="h-full border-border bg-card shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <CardContent className="p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-lg font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="bg-card px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <motion.div variants={motionFadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} custom={0}>
          <div className="axis-label text-primary">About AxisVTU</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            A simple platform for airtime, data, wallet funding, and utility payments
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            AxisVTU is a Nigerian VTU and payments platform designed to help people handle ordinary account tasks without friction. It brings top-ups, wallet funding, receipts, and transaction history into one clear web experience.
          </p>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            The goal is straightforward: keep the interface human, the flow reliable, and the account details easy to understand.
          </p>
        </motion.div>

        <motion.div
          variants={motionFadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          custom={0.08}
          className="grid gap-5 sm:grid-cols-2"
        >
          <Card className="border-border bg-secondary shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <CardContent className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">Human support flow</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">The product keeps support and contact points easy to find when users need help.</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-secondary shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <CardContent className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-primary">
                <Headphones className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">Built for trust</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Clear records, predictable actions, and a calm layout help the product feel official.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section id="faq" className="bg-background px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PageSection
          eyebrow="FAQ / Support"
          title="Helpful answers before you get started"
          description="A few common questions users usually ask before opening an account or funding their wallet."
          align="center"
        />

        <div className="mt-12 space-y-4">
          {faqs.map((item, index) => {
            const open = activeIndex === index;
            return (
              <Card key={item.q} className="overflow-hidden border-border bg-card shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <button
                  type="button"
                  onClick={() => setActiveIndex(open ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                >
                  <span className="text-base font-semibold text-foreground sm:text-lg">{item.q}</span>
                  <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-orange-500">
                    <ChevronDown className="h-5 w-5" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-0 text-sm leading-7 text-muted-foreground sm:px-6">{item.a}</div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>

        <motion.div
          variants={motionFadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10"
        >
          <Card className="border-orange-200 bg-card shadow-[0_12px_35px_rgba(234,115,69,0.05)]">
            <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <div className="flex items-center gap-3">
                  <BrandLogo className="h-7" />
                  <div className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Support</div>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                  If you need help, reach out through email and the team can guide you from there. The goal is to keep the process simple and direct.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="h-11 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90">
                  <a href="mailto:support@axisvtu.com">Email Support</a>
                </Button>
                <Button asChild variant="secondary" className="h-11 rounded-full border-border bg-card px-5 text-muted-foreground hover:bg-secondary">
                  <Link href="/login">Log in</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card px-4 py-16 text-muted-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <BrandLogo />
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
              AxisVTU helps users buy airtime, data, and everyday utility services while keeping wallet funding and transaction records clear.
            </p>
            <div className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>support@axisvtu.com</span>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <div className="text-sm font-semibold text-foreground">AxisVTU</div>
              <div className="mt-4 space-y-3 text-sm">
                <div><a href="#services" className="hover:text-foreground">What you can do</a></div>
                <div><a href="#trust" className="hover:text-foreground">Why choose us</a></div>
                <div><a href="#about" className="hover:text-foreground">About</a></div>
                <div><a href="#faq" className="hover:text-foreground">FAQ</a></div>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Policies</div>
              <div className="mt-4 space-y-3 text-sm">
                <div><a href="#" className="hover:text-foreground">Terms &amp; Conditions</a></div>
                <div><a href="#" className="hover:text-foreground">Privacy Policy</a></div>
              </div>
            </div>
          </div>
        </div>
        <Separator className="my-10 bg-border" />
        <div className="flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div>© 2026 AxisVTU. All rights reserved.</div>
          <div className="flex gap-4">
            <span>Official web platform</span>
            <span>Nigerian VTU services</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <ServicesSection />
      <TrustSection />
      <AboutSection />
      <FaqSection />
      <Footer />
    </div>
  );
}
