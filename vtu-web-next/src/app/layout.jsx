import './globals.css';
import { LegacyCacheCleanup } from '@/components/legacy-cache-cleanup';

export const metadata = {
  title: {
    default: 'MELE DATA',
    template: '%s | MELE DATA',
  },
  description: 'Premium utility services dashboard for MELE DATA',
  applicationName: 'MELE DATA',
  metadataBase: new URL('https://meledata.ng'),
  icons: {
    icon: '/brand/meledata-icon-clean.png',
    shortcut: '/brand/meledata-icon-clean.png',
    apple: '/brand/meledata-icon-clean.png',
  },
  verification: {
    google: 'BYzwpVMC9af2r91Y5yd5lR5FBQJEOk7cwx45Hl9iU9c',
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
        <meta
          name="google-site-verification"
          content="BYzwpVMC9af2r91Y5yd5lR5FBQJEOk7cwx45Hl9iU9c"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <LegacyCacheCleanup />
        {children}
      </body>
    </html>
  );
}
