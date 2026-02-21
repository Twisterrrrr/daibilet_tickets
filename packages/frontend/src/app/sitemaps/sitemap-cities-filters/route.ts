import { NextResponse } from 'next/server';
import { toUrlSetXml, SITE_URL } from '@/lib/sitemap-xml';

const FEATURED_CITY_SLUGS = [
  'saint-petersburg', 'moscow', 'kazan', 'nizhny-novgorod', 'kaliningrad',
  'sochi', 'ekaterinburg', 'vladivostok', 'novosibirsk', 'yaroslavl',
];

// SEO-фильтры (QueryFilter isSeo=true). TODO: count >= 6 перед добавлением
const EXCURSION_FILTERS = ['walking', 'bus', 'boat', 'sightseeing', 'history', 'mystic', 'with-children'];
const VENUE_FILTERS = ['historical', 'art', 'interactive', 'with-guide', 'family'];
const EVENT_FILTERS = ['concert', 'theatre', 'festival', 'rock', 'classical'];

const LASTMOD = new Date().toISOString().slice(0, 10);

export async function GET() {
  const urls: { loc: string; lastmod: string; changefreq: string; priority: number }[] = [];

  for (const city of FEATURED_CITY_SLUGS) {
    for (const qf of EXCURSION_FILTERS) {
      urls.push({
        loc: `${SITE_URL}/events?city=${city}&category=EXCURSION&qf=${qf}`,
        lastmod: LASTMOD,
        changefreq: 'weekly',
        priority: 0.7,
      });
    }
    for (const qf of VENUE_FILTERS) {
      urls.push({
        loc: `${SITE_URL}/events?city=${city}&category=MUSEUM&qf=${qf}`,
        lastmod: LASTMOD,
        changefreq: 'weekly',
        priority: 0.6,
      });
    }
    for (const qf of EVENT_FILTERS) {
      urls.push({
        loc: `${SITE_URL}/events?city=${city}&category=EVENT&qf=${qf}`,
        lastmod: LASTMOD,
        changefreq: 'daily',
        priority: 0.7,
      });
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
