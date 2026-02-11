import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  // Standalone output — минимальный образ для Docker (~100 MB вместо ~500 MB)
  output: 'standalone',

  // Проксирование API запросов — только в dev-режиме.
  // В production Nginx проксирует /api/* напрямую на backend.
  async rewrites() {
    if (!isDev) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.ticketscloud.com',
      },
      {
        protocol: 'https',
        hostname: '**.ticketscloud.org',
      },
    ],
  },
};

export default nextConfig;
