import { LandingPage } from '@/components/landing-page';

export const metadata = {
  title: 'MELE DATA',
  description: 'Fast, reliable VTU payments for data, airtime, wallet funding, and everyday utility services.',
  alternates: {
    canonical: 'https://axisvtu.com',
  },
  openGraph: {
    title: 'MELE DATA',
    description: 'MELE DATA helps users buy data, buy airtime, fund wallets, and track transactions from one secure workspace.',
    url: 'https://axisvtu.com',
    siteName: 'MELE DATA',
    type: 'website',
  },
};

export default function Page() {
  return <LandingPage />;
}
