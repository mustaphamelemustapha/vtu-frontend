import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  History,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const heroPoints = [
  'Instant data and airtime purchase',
  'Dedicated wallet funding account',
  'Clear receipts and transaction history',
  'Secure transaction PIN protection',
];

const features = [
  {
    icon: Wifi,
    title: 'Buy Data',
    text: 'Purchase affordable data plans for major Nigerian networks through a simple guided flow.',
  },
  {
    icon: Smartphone,
    title: 'Buy Airtime',
    text: 'Top up your own line or send airtime to someone else without a complicated process.',
  },
  {
    icon: Wallet,
    title: 'Fund Wallet',
    text: 'Transfer money to your dedicated account and see your wallet balance update after confirmation.',
  },
  {
    icon: History,
    title: 'Track Transactions',
    text: 'Review purchases, receipts, and wallet movements from one organised history view.',
  },
];

const trustPoints = [
  {
    icon: ShieldCheck,
    title: 'Secure wallet system',
    text: 'Built to keep wallet activity structured, traceable, and easy to review.',
  },
  {
    icon: LockKeyhole,
    title: 'Transaction PIN protection',
    text: 'Sensitive actions stay protected with a PIN step before final confirmation.',
  },
  {
    icon: ReceiptText,
    title: 'Clean receipts',
    text: 'Users can keep clear records of what was purchased, when it happened, and what was charged.',
  },
  {
    icon: CheckCircle2,
    title: 'Reliable transaction records',
    text: 'Every action is logged so users can follow what changed without guesswork.',
  },
];

const walletSteps = [
  'Transfer funds to your dedicated AxisVTU account.',
  'Wait for confirmation and watch the wallet update.',
  'Use the balance to buy data, airtime, or utility services.',
];

const faqs = [
  {
    q: 'How do I get started?',
    a: 'Create an account, sign in, and fund your wallet before making your first purchase.',
  },
  {
    q: 'What can I do on AxisVTU?',
    a: 'You can buy data, buy airtime, fund your wallet, and track your transaction history in one place.',
  },
  {
    q: 'How does wallet funding work?',
    a: 'You transfer money to your dedicated account and your wallet updates after the payment is confirmed.',
  },
  {
    q: 'Will I receive receipts?',
    a: 'Yes. AxisVTU keeps clear transaction receipts and records so you can review activity later.',
  },
];

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/[0.78] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img src="/brand/axisvtu-logo.svg" alt="AxisVTU" className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 lg:flex">
          <a href="#features" className="transition hover:text-white">What you can do</a>
          <a href="#trust" className="transition hover:text-white">Why trust us</a>
          <a href="#wallet" className="transition hover:text-white">Wallet funding</a>
          <a href="#faq" className="transition hover:text-white">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-medium text-slate-300 transition hover:text-white sm:inline-flex">
            Sign In
          </Link>
          <Button asChild className="rounded-full px-5 shadow-lg shadow-orange-500/20">
            <Link href="/register">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,115,69,0.18),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(36,87,245,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0)_100%)]" />
      <div className="absolute inset-0 axis-grid-bg opacity-[0.18]" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-32 lg:pt-20">
        <div className="flex flex-col justify-center">
          <div className="animate-fade-up inline-flex w-fit items-center gap-2 rounded-full border border-orange-400/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-200/90">
            <Sparkles className="h-3.5 w-3.5" />
            AxisVTU for everyday payments
          </div>

          <h1 className="animate-fade-up delay-1 mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Buy Data, Airtime, and Pay Bills with Ease
          </h1>

          <p className="animate-fade-up delay-2 mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            AxisVTU helps you purchase data, airtime, and utility services quickly, while keeping your wallet, receipts, and transaction history organised in one secure place.
          </p>

          <div className="animate-fade-up delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 rounded-full px-6 text-base shadow-lg shadow-orange-500/20">
              <Link href="/register">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-12 rounded-full border-white/10 bg-white/5 px-6 text-base text-white hover:bg-white/10">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>

          <div className="animate-fade-up delay-4 mt-9 flex flex-wrap gap-3">
            {heroPoints.map((point) => (
              <div key={point} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                {point}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-x-8 top-12 h-72 rounded-full bg-orange-500/20 blur-3xl" />
          <Card className="animate-rise relative w-full max-w-xl border-white/10 bg-white/[0.06] shadow-[0_30px_80px_rgba(3,7,18,0.48)] backdrop-blur-xl">
            <CardContent className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div className="axis-label text-slate-400">Product preview</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Desktop dashboard view</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
                    The web experience is structured for people who want quick actions, clear receipts, and an account view they can trust.
                  </p>
                </div>
                <div className="rounded-2xl border border-orange-400/20 bg-orange-500/10 p-3 text-orange-200">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Wallet balance</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-white">₦ 248,500.00</div>
                  <div className="mt-2 text-sm text-slate-400">Ready for service purchases and daily usage.</div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Receipts</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-white">Clear records</div>
                  <div className="mt-2 text-sm text-slate-400">Track every transaction from a clean history view.</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Recent activity</div>
                  <div className="mt-4 space-y-3">
                    {[
                      ['Data purchase', 'MTN 2GB - ₦1,500', 'Completed'],
                      ['Wallet funding', 'Virtual account transfer', 'Confirmed'],
                      ['Airtime top-up', 'Glo - ₦2,000', 'Completed'],
                    ].map(([title, detail, status]) => (
                      <div key={title} className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/5 px-3 py-3">
                        <div>
                          <div className="text-sm font-medium text-white">{title}</div>
                          <div className="text-xs text-slate-400">{detail}</div>
                        </div>
                        <div className="text-xs font-semibold text-orange-200">{status}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Quick actions</div>
                    <div className="mt-4 grid gap-2">
                      {['Buy Data', 'Buy Airtime', 'Fund Wallet', 'View History'].map((item) => (
                        <div key={item} className="rounded-2xl border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-slate-200">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-orange-400/20 bg-orange-500/10 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-100/80">Protection</div>
                    <div className="mt-2 flex items-center gap-3 text-sm text-orange-50">
                      <BadgeCheck className="h-5 w-5 shrink-0" />
                      Transaction PIN protection enabled on sensitive actions.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="bg-[#070b12] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <div className="axis-label">What you can do with AxisVTU</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The core actions are clear and easy to follow
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            The page introduces the platform plainly, then leads users into the exact actions they need most often.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="animate-card-up border-white/10 bg-white/5 shadow-panel backdrop-blur-xl"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/[0.15] bg-orange-500/10 text-orange-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section id="trust" className="bg-slate-950 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="animate-fade-in">
            <div className="axis-label">Why users can trust AxisVTU</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Built for clarity, not noise
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              AxisVTU is shaped around the everyday things people need from a VTU platform: a safe wallet, a clean trail of transactions, and a product that stays understandable.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {trustPoints.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className="animate-card-up border-white/10 bg-white/5 shadow-panel backdrop-blur-xl"
                  style={{ animationDelay: `${index * 95}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/[0.15] bg-orange-500/10 text-orange-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function WalletSection() {
  return (
    <section id="wallet" className="bg-[#070b12] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Card className="border-white/10 bg-slate-900/80 shadow-panel">
          <CardContent className="grid gap-8 p-8 lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
            <div>
              <div className="axis-label">Wallet funding</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Fund your wallet through your dedicated account
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Fund your wallet by transferring money to your dedicated account. Once confirmed, your balance updates and you can start purchasing services.
              </p>
              <div className="mt-8 space-y-4">
                {walletSteps.map((step, index) => (
                  <div key={step} className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/[0.15] text-sm font-semibold text-orange-200">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-orange-400/[0.15] bg-orange-500/10 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-100/80">Dedicated account</div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-white">Transfer to a unique wallet account</div>
                <p className="mt-3 text-sm leading-6 text-orange-50/80">
                  Every user gets a structured funding route that keeps wallet top-ups clear and easy to review.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Confirmation</div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-white">Balance updates after payment clears</div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Users can see when funds arrive, what they were used for, and how their wallet changed over time.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:col-span-2">
                <div className="flex items-center gap-3 text-sm font-semibold text-white">
                  <CreditCard className="h-5 w-5 text-orange-200" />
                  Clean receipt trail
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Each purchase and wallet movement is stored in a format that makes support, reconciliation, and personal record keeping easier.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-[#070b12] px-4 pb-24 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Card className="border-orange-400/[0.15] bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-white/5 shadow-[0_30px_90px_rgba(234,115,69,0.16)]">
          <CardContent className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-100/80">Ready when you are</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Start using AxisVTU today and manage your everyday VTU payments with more clarity and control.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="h-12 rounded-full px-6 text-base shadow-lg shadow-orange-500/20">
                <Link href="/register">Create Account</Link>
              </Button>
              <Button asChild variant="secondary" className="h-12 rounded-full border-white/10 bg-white/5 px-6 text-base text-white hover:bg-white/10">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 px-4 py-16 text-slate-400 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <img src="/brand/axisvtu-logo.svg" alt="AxisVTU" className="h-10 w-auto brightness-0 invert" />
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
              AxisVTU is a Nigerian VTU and fintech-style platform for data, airtime, wallet funding, receipts, and everyday utility payments.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="text-sm font-semibold text-white">AxisVTU</div>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                <div><a href="#features" className="hover:text-white">What you can do</a></div>
                <div><a href="#trust" className="hover:text-white">Why trust us</a></div>
                <div><a href="#wallet" className="hover:text-white">Wallet funding</a></div>
                <div><a href="#faq" className="hover:text-white">FAQ</a></div>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Support</div>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                <div><Link href="/login" className="hover:text-white">Sign In</Link></div>
                <div><Link href="/register" className="hover:text-white">Create Account</Link></div>
                <div><Link href="/dashboard" className="hover:text-white">Dashboard</Link></div>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Contact</div>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                <div><a href="mailto:support@axisvtu.com" className="hover:text-white">support@axisvtu.com</a></div>
                <div>Lagos, Nigeria</div>
              </div>
            </div>
          </div>
        </div>
        <Separator className="my-10 bg-white/10" />
        <div className="flex flex-col gap-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>© 2026 AxisVTU. All rights reserved.</div>
          <div className="flex gap-4">
            <span>Privacy Policy</span>
            <span>Terms &amp; Conditions</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <Hero />
      <FeaturesSection />
      <TrustSection />
      <WalletSection />
      <FinalCta />
      <FaqSection />
      <Footer />
    </div>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="bg-[#070b12] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="axis-label">FAQ</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            A few common questions before getting started
          </h2>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((item) => (
            <details key={item.q} className="group rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur-xl">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-white">
                {item.q}
                <ChevronRight className="h-5 w-5 shrink-0 text-orange-200 transition group-open:rotate-90" />
              </summary>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
