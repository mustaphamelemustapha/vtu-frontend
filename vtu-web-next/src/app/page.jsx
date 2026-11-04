import { LandingPage } from '@/components/landing-page';

export const metadata = {
  title: 'MELE DATA | Instant VTU, Airtime & Utility Bills',
  description: 'Fast, reliable VTU payments for data, airtime, wallet funding, and everyday utility services.',
  alternates: {
    canonical: 'https://meledata.ng',
  },
  openGraph: {
    title: 'MELE DATA',
    description: 'MELE DATA helps users buy data, airtime, fund wallets, and track transactions from one secure workspace.',
    url: 'https://meledata.ng',
    siteName: 'MELE DATA',
    type: 'website',
  },
};

export default function Page() {
  return <LandingPage />;
}
