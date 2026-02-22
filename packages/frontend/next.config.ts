import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  // Standalone output — минимальный образ для Docker (~100 MB вместо ~500 MB)
  output: 'standalone',

  // Проксирование API запросов — только в dev-режиме.
  // В production Nginx проксирует /api/* напрямую на backend.
  // INTERNAL_API_URL может быть http://localhost:4000/api/v1 — извлекаем origin для rewrites
  async rewrites() {
    if (!isDev) return [];
    const internal = process.env.INTERNAL_API_URL || 'http://localhost:4000/api/v1';
    const backendOrigin = internal.replace(/\/api\/v1\/?$/, '') || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ticketscloud.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.ticketscloud.com',
      },
      {
        protocol: 'https',
        hostname: '**.ticketscloud.org',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'ticketscloud-prod.storage.yandexcloud.net',
      },
      {
        protocol: 'https',
        hostname: 'api.teplohod.info',
      },
      {
        protocol: 'http',
        hostname: 'api.teplohod.info',
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: 'daibilet',
  project: 'frontend',
});
