/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
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
      { source: '/app/data', destination: '/buy-data', permanent: true },
      { source: '/app/history', destination: '/history', permanent: true },
      { source: '/app/profile', destination: '/profile', permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'https://vtu-backend-8gsi.onrender.com/api/v1/:path*',
      },
      {
        source: '/healthz',
        destination: 'https://vtu-backend-8gsi.onrender.com/healthz',
      },
      {
        source: '/readyz',
        destination: 'https://vtu-backend-8gsi.onrender.com/readyz',
      },
    ];
  },
};

export default nextConfig;
