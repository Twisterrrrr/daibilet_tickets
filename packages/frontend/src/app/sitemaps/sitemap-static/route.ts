import { NextResponse } from 'next/server';
import { toUrlSetXml, SITE_URL } from '@/lib/sitemap-xml';

const LASTMOD = new Date().toISOString().slice(0, 10);

export async function GET() {
  const urls = [
    { loc: SITE_URL, changefreq: 'daily' as const, priority: 1.0 },
    { loc: `${SITE_URL}/cities`, changefreq: 'weekly' as const, priority: 0.8 },
    { loc: `${SITE_URL}/events`, changefreq: 'daily' as const, priority: 0.9 },
    { loc: `${SITE_URL}/venues`, changefreq: 'daily' as const, priority: 0.9 },
    { loc: `${SITE_URL}/gift-certificate`, changefreq: 'monthly' as const, priority: 0.7 },
    { loc: `${SITE_URL}/blog`, changefreq: 'weekly' as const, priority: 0.6 },
    { loc: `${SITE_URL}/providers`, changefreq: 'monthly' as const, priority: 0.4 },
    { loc: `${SITE_URL}/requisites`, changefreq: 'yearly' as const, priority: 0.2 },
    { loc: `${SITE_URL}/offer`, changefreq: 'yearly' as const, priority: 0.2 },
    { loc: `${SITE_URL}/privacy`, changefreq: 'yearly' as const, priority: 0.2 },
    { loc: `${SITE_URL}/terms`, changefreq: 'yearly' as const, priority: 0.2 },
  ].map((u) => ({ ...u, lastmod: LASTMOD }));

  const xml = toUrlSetXml(urls);
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
