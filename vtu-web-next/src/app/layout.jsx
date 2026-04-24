import './globals.css';
import { LegacyCacheCleanup } from '@/components/legacy-cache-cleanup';

export const metadata = {
  title: {
    default: 'AxisVTU',
    template: '%s | AxisVTU',
  },
  description: 'Premium fintech dashboard for AxisVTU',
  applicationName: 'AxisVTU',
  metadataBase: new URL('https://axisvtu.com'),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <LegacyCacheCleanup />
        {children}
      </body>
    </html>
  );
}
