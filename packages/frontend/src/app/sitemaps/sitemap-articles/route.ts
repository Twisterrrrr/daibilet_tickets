import { NextResponse } from 'next/server';

import { api } from '@/lib/api';
import { SITE_URL, type SitemapUrl, toUrlSetXml } from '@/lib/sitemap-xml';

const LASTMOD = new Date().toISOString().slice(0, 10);

export async function GET() {
  const urls: SitemapUrl[] = [{ loc: `${SITE_URL}/blog`, lastmod: LASTMOD, changefreq: 'weekly', priority: 0.6 }];

  try {
    const { items: articles } = await api.getArticles({ limit: 500 });
    for (const a of articles ?? []) {
      const lastmod = typeof a.updatedAt === 'string' || typeof a.updatedAt === 'number' || a.updatedAt instanceof Date
        ? new Date(a.updatedAt as string | number | Date).toISOString().slice(0, 10)
        : LASTMOD;
      urls.push({
        loc: `${SITE_URL}/blog/${a.slug}`,
        lastmod,
        changefreq: 'monthly',
        priority: 0.5,
      });
    }
  } catch {
    // API недоступен
  }

  const xml = toUrlSetXml(urls);
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
