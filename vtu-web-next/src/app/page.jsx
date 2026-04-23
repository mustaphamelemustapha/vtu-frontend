import { LandingPage } from '@/components/landing-page';

export const metadata = {
  title: 'AxisVTU',
  description: 'Buy airtime, data, and bills in one premium fintech workspace.',
  alternates: {
    canonical: 'https://axisvtu.com',
  },
  openGraph: {
    title: 'AxisVTU',
    description: 'Premium VTU platform for airtime, data, bills, wallet actions, and referrals.',
    url: 'https://axisvtu.com',
    siteName: 'AxisVTU',
    type: 'website',
  },
};

export default function Page() {
  return <LandingPage />;
}
