import { LandingPage } from '@/components/landing-page';

export const metadata = {
  title: 'AxisVTU',
  description: 'Fast, reliable top-ups for data, airtime, account credit, and everyday utility services.',
  alternates: {
    canonical: 'https://axisvtu.com',
  },
  openGraph: {
    title: 'AxisVTU',
    description: 'AxisVTU helps users buy data, buy airtime, add account credit, and track service orders from one secure workspace.',
    url: 'https://axisvtu.com',
    siteName: 'AxisVTU',
    type: 'website',
  },
};

export default function Page() {
  return <LandingPage />;
}
