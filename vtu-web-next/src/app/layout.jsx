import './globals.css';
import { LegacyCacheCleanup } from '@/components/legacy-cache-cleanup';

export const metadata = {
  title: {
    default: 'KULLOMA DATA | Fast, Reliable Airtime & Utility Top-Ups',
    template: '%s | KULLOMA DATA',
  },
  description: 'Fast, reliable VTU payments for data bundles, airtime, wallet funding, and utility services.',
  applicationName: 'KULLOMA DATA',
  metadataBase: new URL('https://www.kullomadata.com'),
  icons: {
    icon: '/brand/kullomadata-icon.png',
    shortcut: '/brand/kullomadata-icon.png',
    apple: '/brand/kullomadata-icon.png',
  },
};

export default function RootLayout({ children }) {
  const themeScript = `
    (() => {
      try {
        const saved = localStorage.getItem('axis-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
      } catch {
        document.documentElement.classList.add('light');
      }
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <LegacyCacheCleanup />
        {children}
      </body>
    </html>
  );
}
