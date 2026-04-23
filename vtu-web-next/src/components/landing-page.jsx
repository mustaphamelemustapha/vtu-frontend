import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bolt,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Layers3,
  LockKeyhole,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  Tv2,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const stats = [
  { value: '50K+', label: 'Active users' },
  { value: '2M+', label: 'Transactions' },
  { value: '24/7', label: 'Support' },
  { value: '8+', label: 'Product rails' },
];

const services = [
  { icon: Wifi, title: 'Buy Data', text: 'Fast bundle delivery across MTN, Airtel, Glo, and 9mobile.' },
  { icon: Bolt, title: 'Airtime', text: 'Instant recharge flow for personal and business top-ups.' },
  { icon: Tv2, title: 'Cable TV', text: 'Renew and subscribe for DStv, GOtv, and Startimes.' },
  { icon: Zap, title: 'Electricity', text: 'Pay postpaid and prepaid electricity bills without friction.' },
  { icon: Layers3, title: 'Education PINs', text: 'Sell WAEC, NECO, and JAMB pins from one clean surface.' },
  { icon: Banknote, title: 'Airtime to Cash', text: 'Convert airtime into wallet balance in a structured flow.' },
  { icon: MessageSquareMore, title: 'Bulk SMS', text: 'Send campaigns and notifications with clear delivery status.' },
  { icon: Building2, title: 'Bank Transfer', text: 'Move money with dedicated transfer accounts and ledger traces.' },
];

const features = [
  { icon: ShieldCheck, title: 'Secure transactions', text: 'Bank-grade patterns and clean session handling for trust.' },
  { icon: Clock3, title: 'Instant delivery', text: 'Transactions are built to move quickly and stay trackable.' },
  { icon: Users, title: 'Reseller ready', text: 'A web experience that works for operators and larger teams.' },
  { icon: CheckCircle2, title: 'Clear status flow', text: 'Users can see what happened without digging through noise.' },
  { icon: LockKeyhole, title: 'Account protection', text: 'Security-first profile and password flows are already wired.' },
  { icon: BadgeCheck, title: 'Referral rewards', text: 'First-deposit rewards are surfaced in the product, not hidden.' },
];

const steps = [
  { title: 'Create an account', text: 'Users join with email, phone, and an optional referral code.' },
  { title: 'Fund wallet', text: 'Dedicated transfer details and wallet views make funding simple.' },
  { title: 'Purchase and track', text: 'Buy services, view history, and manage everything from one dashboard.' },
];

const faqs = [
  { q: 'How do I get started?', a: 'Create an account, log in, and fund your wallet before making purchases.' },
  { q: 'What services do you support?', a: 'Data, airtime, cable TV, electricity, education PINs, SMS, and more.' },
  { q: 'Is there a referral system?', a: 'Yes. Referrals are already built in and tracked from the dashboard and profile screens.' },
  { q: 'How do users contact support?', a: 'The landing page and dashboard surface direct support and contact points.' },
];

function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img src="/brand/axisvtu-logo.svg" alt="AxisVTU" className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
          <a href="#features" className="transition hover:text-slate-950">Features</a>
          <a href="#services" className="transition hover:text-slate-950">Services</a>
          <a href="#about" className="transition hover:text-slate-950">About</a>
          <a href="#contact" className="transition hover:text-slate-950">Contact</a>
          <a href="#faq" className="transition hover:text-slate-950">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-950 sm:inline-flex">
            Log in
          </Link>
          <Button asChild className="rounded-full px-5 shadow-sm shadow-orange-500/20">
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
    <section className="relative overflow-hidden bg-[#f8f5f2]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(232,117,67,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.72)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/60 to-transparent" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-32 lg:pt-20">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-600 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Premium fintech dashboard
          </div>
          <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Buy Airtime, Data & Pay Bills in Seconds
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            A mature AxisVTU homepage for individuals, businesses, and resellers. Fast delivery, calm design, referral rewards, and a clear route into the dashboard.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 rounded-full px-6 text-base">
              <Link href="/register">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-12 rounded-full px-6 text-base">
              <a href="#services">Explore Services</a>
            </Button>
          </div>

          <div className="mt-10 grid max-w-lg grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label} className="rounded-3xl border border-slate-200 bg-white px-4 py-5 shadow-sm">
                <div className="text-2xl font-semibold tracking-tight text-slate-950">{item.value}</div>
                <div className="mt-1 text-sm text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-x-10 top-16 h-72 rounded-full bg-orange-300/20 blur-3xl" />
          <Card className="relative w-full max-w-xl overflow-hidden border-white/70 bg-white/85 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            <CardContent className="grid gap-6 p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="axis-label">Live workspace</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Operator dashboard preview</div>
                  <div className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    Everything is structured for the desktop workflow: balances, quick actions, history, and support.
                  </div>
                </div>
                <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Wallet balance', '₦ 1,248,500.00'],
                  ['Referral rewards', '₦ 56,000.00'],
                  ['Pending jobs', '4 queued'],
                  ['Support status', 'Online'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
                    <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  'Wallet funding',
                  'Service history',
                  'Referral tracking',
                ].map((label) => (
                  <div key={label} className="rounded-2xl border border-orange-100 bg-orange-50/80 px-4 py-3 text-sm font-medium text-orange-700">
                    {label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section id="features" className="bg-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="axis-label">Why choose AxisVTU</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Built to feel like a serious fintech platform
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Cleaner scanning, clearer actions, and a product experience that looks grown-up on desktop.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-slate-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-5 text-lg font-semibold text-slate-950">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section id="services" className="bg-[#f8fafc] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="axis-label">Services</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              All the rails your users already expect
            </h2>
            <p className="mt-3 text-lg leading-8 text-slate-600">
              One homepage, one product, many service surfaces. Users can move from discovery to purchase without feeling lost.
            </p>
          </div>
          <Button asChild variant="secondary" className="rounded-full">
            <Link href="/login">
              Open dashboard
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-5 text-lg font-semibold text-slate-950">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="bg-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <div className="axis-label">About VTU Axis</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Built for speed, structure, and trust
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            VTU Axis is designed for people who want fast airtime, data, and bill payments without a cluttered interface. The new web experience keeps that utility, but presents it like a modern financial platform.
          </p>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            It is responsive, desktop-first, and aligned with a serious product brand. The landing page introduces the platform clearly before taking people into login and account creation.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {features.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-slate-200 bg-[#fafafa] shadow-sm">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-5 text-lg font-semibold text-slate-950">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className="bg-[#f8fafc] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="axis-label">How it works</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Simple for users, structured for operators
          </h2>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-600">Step {index + 1}</div>
                <div className="mt-4 text-xl font-semibold text-slate-950">{step.title}</div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="bg-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="axis-label">FAQ</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Questions people usually ask before they join
          </h2>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((item) => (
            <details key={item.q} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-slate-950">
                {item.q}
                <ChevronRight className="h-5 w-5 shrink-0 text-orange-500 transition group-open:rotate-90" />
              </summary>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contact" className="bg-slate-950 px-4 py-16 text-slate-300 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <img src="/brand/axisvtu-logo.svg" alt="AxisVTU" className="h-10 w-auto brightness-0 invert" />
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
              AxisVTU is a premium VTU platform for airtime, data, cable, electricity, and related digital services.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="text-sm font-semibold text-white">Quick links</div>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                <div><a href="#features" className="hover:text-white">Features</a></div>
                <div><a href="#services" className="hover:text-white">Services</a></div>
                <div><a href="#about" className="hover:text-white">About</a></div>
                <div><a href="#faq" className="hover:text-white">FAQ</a></div>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Account</div>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                <div><Link href="/login" className="hover:text-white">Log in</Link></div>
                <div><Link href="/register" className="hover:text-white">Get started</Link></div>
                <div><Link href="/dashboard" className="hover:text-white">Dashboard</Link></div>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Contact</div>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                <div>support@vtuaxis.com</div>
                <div>+234 701 246 3225</div>
                <div>Lagos, Nigeria</div>
              </div>
            </div>
          </div>
        </div>
        <Separator className="my-10 bg-white/10" />
        <div className="flex flex-col gap-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>© 2026 AxisVTU. All rights reserved.</div>
          <div className="flex gap-4">
            <span>Twitter</span>
            <span>Facebook</span>
            <span>Instagram</span>
            <span>LinkedIn</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <TopNav />
      <Hero />
      <FeatureSection />
      <ServicesSection />
      <AboutSection />
      <WorkflowSection />
      <FaqSection />
      <div className="bg-[#f8fafc] px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="border-orange-200 bg-orange-500 text-white shadow-xl shadow-orange-500/20">
            <CardContent className="flex flex-col items-start justify-between gap-6 p-8 lg:flex-row lg:items-center">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-white/80">Still have questions?</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight">Start with the landing page, then move into the dashboard.</div>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">
                  Your users should understand the product before they log in. That is now the default experience on the domain root.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="h-12 rounded-full bg-white px-6 text-orange-600 hover:bg-orange-50">
                  <Link href="/register">Get Started</Link>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-full border-white/30 bg-transparent px-6 text-white hover:bg-white/10">
                  <Link href="/login">Log in</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
