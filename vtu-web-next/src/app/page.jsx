import { LandingPage } from '@/components/landing-page';

export const metadata = {
  title: 'MELE DATA',
  description: 'Fast, reliable top-ups for data, airtime, account credit, and everyday utility services.',
  alternates: {
    canonical: 'https://meledata.ng',
  },
  openGraph: {
    title: 'MELE DATA',
    description: 'MELE DATA helps users buy data, buy airtime, add account credit, and track service orders from one secure workspace.',
    url: 'https://meledata.ng',
    siteName: 'MELE DATA',
    type: 'website',
  },
};

export default function Page() {
  return <LandingPage />;
}
