import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { toUrlSetXml, SITE_URL } from '@/lib/sitemap-xml';

const LASTMOD = new Date().toISOString().slice(0, 10);

export async function GET() {
  const urls: { loc: string; lastmod: string; changefreq: string; priority: number }[] = [];

  try {
    const { items: venues } = await api.getVenues({ limit: 2000 });
    for (const v of venues ?? []) {
      urls.push({
        loc: `${SITE_URL}/venues/${v.slug}`,
        lastmod: v.updatedAt ? new Date(v.updatedAt).toISOString().slice(0, 10) : LASTMOD,
        changefreq: 'weekly',
        priority: 0.7,
      });
    }

    const { items: events } = await api.getEvents({ limit: 2000 });
    for (const e of events ?? []) {
      urls.push({
        loc: `${SITE_URL}/events/${e.slug}`,
        lastmod: LASTMOD,
        changefreq: 'weekly',
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
