import { LandingPage } from '@/components/landing-page';

export const metadata = {
  title: 'AxisVTU',
  description: 'Fast, reliable VTU payments for data, airtime, wallet funding, and everyday utility services.',
  alternates: {
    canonical: 'https://axisvtu.com',
  },
  openGraph: {
    title: 'AxisVTU',
    description: 'AxisVTU helps users buy data, buy airtime, fund wallets, and track transactions from one secure workspace.',
    url: 'https://axisvtu.com',
    siteName: 'AxisVTU',
    type: 'website',
  },
};

export default function Page() {
  return <LandingPage />;
}
