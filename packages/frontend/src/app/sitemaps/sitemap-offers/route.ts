import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { toUrlSetXml, SITE_URL, type SitemapUrl } from '@/lib/sitemap-xml';

const LASTMOD = new Date().toISOString().slice(0, 10);

export async function GET() {
  const urls: SitemapUrl[] = [];

  try {
    const { items: venues } = await api.getVenues({ limit: 2000 });
    for (const v of venues ?? []) {
      const vWithDate = v as { slug: string; updatedAt?: string };
      urls.push({
        loc: `${SITE_URL}/venues/${v.slug}`,
        lastmod: vWithDate.updatedAt ? new Date(vWithDate.updatedAt).toISOString().slice(0, 10) : LASTMOD,
        changefreq: 'weekly',
        priority: 0.7,
      });
    }

    const { items: events } = await api.getEvents({ limit: 2000 });
    for (const e of events ?? []) {
      urls.push({
        loc: `${SITE_URL}/events/${e.slug}`,
        lastmod: LASTMOD,
        changefreq: 'weekly' as const,
        priority: 0.6,
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
