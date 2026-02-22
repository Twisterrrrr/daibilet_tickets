import { NextResponse } from 'next/server';

import { api } from '@/lib/api';
import { SITE_URL, type SitemapUrl, toUrlSetXml } from '@/lib/sitemap-xml';

const FEATURED_CITY_SLUGS = [
  'saint-petersburg',
  'moscow',
  'kazan',
  'nizhny-novgorod',
  'kaliningrad',
  'sochi',
  'ekaterinburg',
  'vladivostok',
  'novosibirsk',
  'yaroslavl',
];

const LASTMOD = new Date().toISOString().slice(0, 10);

export async function GET() {
  const urls: SitemapUrl[] = [];

  try {
    const cities = await api.getCities(true);
    const bySlug = new Map((cities || []).map((c: { slug: string }) => [c.slug, c]));

    for (const slug of FEATURED_CITY_SLUGS) {
      if (!bySlug.has(slug)) continue;
      urls.push(
        { loc: `${SITE_URL}/events?city=${slug}`, lastmod: LASTMOD, changefreq: 'daily', priority: 0.9 },
        { loc: `${SITE_URL}/venues?city=${slug}`, lastmod: LASTMOD, changefreq: 'daily', priority: 0.9 },
        { loc: `${SITE_URL}/cities/${slug}`, lastmod: LASTMOD, changefreq: 'daily', priority: 0.9 },
        { loc: `${SITE_URL}/cities/${slug}/museums`, lastmod: LASTMOD, changefreq: 'daily', priority: 0.9 },
      );
    }

    // Экскурсии, музеи, мероприятия — общие без города
    urls.push(
      { loc: `${SITE_URL}/events?category=EXCURSION`, lastmod: LASTMOD, changefreq: 'daily', priority: 0.85 },
      { loc: `${SITE_URL}/events?category=MUSEUM`, lastmod: LASTMOD, changefreq: 'daily', priority: 0.85 },
      { loc: `${SITE_URL}/events?category=EVENT`, lastmod: LASTMOD, changefreq: 'daily', priority: 0.85 },
    );

    // Лендинги, combo, подборки
    const landings = await api.getLandings();
    for (const lp of landings || []) {
      if (!lp.city) continue;
      urls.push({
        loc: `${SITE_URL}/cities/${lp.city.slug}/${lp.slug}`,
        lastmod: lp.updatedAt ? new Date(lp.updatedAt).toISOString().slice(0, 10) : LASTMOD,
        changefreq: 'daily',
        priority: 0.95,
      });
    }
    const combos = await api.getCombos();
    for (const c of combos || []) {
      urls.push({
        loc: `${SITE_URL}/combo/${c.slug}`,
        lastmod: c.updatedAt ? new Date(c.updatedAt).toISOString().slice(0, 10) : LASTMOD,
        changefreq: 'weekly',
        priority: 0.85,
      });
    }
    const collections = await api.getCollections();
    urls.push({ loc: `${SITE_URL}/podborki`, lastmod: LASTMOD, changefreq: 'weekly', priority: 0.8 });
    for (const col of collections || []) {
      urls.push({
        loc: `${SITE_URL}/podborki/${col.slug}`,
        lastmod: col.updatedAt ? new Date(col.updatedAt).toISOString().slice(0, 10) : LASTMOD,
        changefreq: 'weekly',
        priority: 0.85,
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
