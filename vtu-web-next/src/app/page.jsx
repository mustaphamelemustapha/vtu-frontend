import { LandingPage } from '@/components/landing-page';

export const metadata = {
  title: 'KULLOMA DATA | Fast, Reliable Airtime & Utility Top-Ups',
  description: 'Fast, reliable VTU payments for data bundles, airtime, wallet funding, and everyday utility services.',
  alternates: {
    canonical: 'https://www.kullomadata.com',
  },
  openGraph: {
    title: 'KULLOMA DATA',
    description: 'KULLOMA DATA helps users buy data, airtime, fund wallets, and track transactions from one secure workspace.',
    url: 'https://www.kullomadata.com',
    siteName: 'KULLOMA DATA',
    type: 'website',
  },
};

export default function Page() {
  return <LandingPage />;
}
