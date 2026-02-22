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

const MIN_COUNT_FOR_SITEMAP = 6;

const EXCURSION_FILTERS = ['walking', 'bus', 'boat', 'sightseeing', 'history', 'mystic', 'with-children'];
const VENUE_FILTERS = ['historical', 'art', 'interactive', 'with-guide', 'family'];
const EVENT_FILTERS = ['concert', 'theatre', 'festival', 'rock', 'classical'];

const LASTMOD = new Date().toISOString().slice(0, 10);

type Changefreq = NonNullable<SitemapUrl['changefreq']>;
type FilterDef = { qf: string; category: 'EXCURSION' | 'MUSEUM' | 'EVENT'; changefreq: Changefreq; priority: number };

const ALL_FILTERS: FilterDef[] = [
  ...EXCURSION_FILTERS.map((qf) => ({
    qf,
    category: 'EXCURSION' as const,
    changefreq: 'weekly' as Changefreq,
    priority: 0.7,
  })),
  ...VENUE_FILTERS.map((qf) => ({
    qf,
    category: 'MUSEUM' as const,
    changefreq: 'weekly' as Changefreq,
    priority: 0.6,
  })),
  ...EVENT_FILTERS.map((qf) => ({ qf, category: 'EVENT' as const, changefreq: 'daily' as Changefreq, priority: 0.7 })),
];

async function getCount(city: string, category: string, qf: string): Promise<number> {
  try {
    const res = await api.getCatalog({
      city,
      category,
      qf,
      page: 1,
      limit: 1,
    });
    return res?.total ?? 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  const candidates: { city: string; def: FilterDef }[] = [];
  for (const city of FEATURED_CITY_SLUGS) {
    for (const def of ALL_FILTERS) {
      candidates.push({ city, def });
    }
  }

  const BATCH = 25;
  const urls: SitemapUrl[] = [];

  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(({ city, def }) =>
        getCount(city, def.category, def.qf).then((total) =>
          total >= MIN_COUNT_FOR_SITEMAP
            ? { loc: `${SITE_URL}/events?city=${city}&category=${def.category}&qf=${def.qf}`, def }
            : null,
        ),
      ),
    );
    for (const r of results) {
      if (r) {
        urls.push({
          loc: r.loc,
          lastmod: LASTMOD,
          changefreq: r.def.changefreq,
          priority: r.def.priority,
        });
      }
    }
  }

  const xml = toUrlSetXml(urls);
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
