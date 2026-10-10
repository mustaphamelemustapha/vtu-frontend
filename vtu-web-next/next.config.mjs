const BACKEND_URL = (process.env.BACKEND_API_URL || 'https://api.meledata.ng').replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.meledata.ng',
      },
      {
        protocol: 'https',
        hostname: 'vtu-backend-8gsi.onrender.com',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/app', destination: '/dashboard', permanent: true },
      { source: '/app/login', destination: '/login', permanent: true },
      { source: '/app/register', destination: '/register', permanent: true },
      { source: '/app/wallet', destination: '/wallet', permanent: true },
      { source: '/app/services', destination: '/services', permanent: true },
      { source: '/app/data', destination: '/buy-data', permanent: true },
      { source: '/app/airtime', destination: '/airtime', permanent: true },
      { source: '/app/electricity', destination: '/electricity', permanent: true },
      { source: '/app/cable', destination: '/cable-tv', permanent: true },
      { source: '/app/cable-tv', destination: '/cable-tv', permanent: true },
      { source: '/app/exam', destination: '/exam-pins', permanent: true },
      { source: '/app/exam-pins', destination: '/exam-pins', permanent: true },
      { source: '/app/history', destination: '/history', permanent: true },
      { source: '/app/profile', destination: '/profile', permanent: true },
      { source: '/app/referrals', destination: '/referrals', permanent: true },
      { source: '/data', destination: '/buy-data', permanent: true },
      { source: '/cable', destination: '/cable-tv', permanent: true },
      { source: '/exam', destination: '/exam-pins', permanent: true },
      { source: '/transactions', destination: '/history', permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
      {
        source: '/healthz',
        destination: `${BACKEND_URL}/healthz`,
      },
      {
        source: '/readyz',
        destination: `${BACKEND_URL}/readyz`,
      },
    ];
  },
};

export default nextConfig;
