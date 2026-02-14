import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://daibilet.ru';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  // Главная
  entries.push({
    url: SITE_URL,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 1.0,
  });

  // Города (featured)
  try {
    const cities = await api.getCities(true);
    for (const city of cities) {
      entries.push({
        url: `${SITE_URL}/cities/${city.slug}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.9,
      });
    }
  } catch {
    // API недоступен — пропускаем
  }

  // Лендинги
  try {
    const landings = await api.getLandings();
    for (const lp of landings) {
      entries.push({
        url: `${SITE_URL}/cities/${lp.city.slug}/${lp.slug}`,
        lastModified: lp.updatedAt ? new Date(lp.updatedAt) : now,
        changeFrequency: 'daily',
        priority: 0.95,
      });
    }
  } catch {
    // API недоступен — пропускаем
  }

  // Combo-программы
  try {
    const combos = await api.getCombos();
    for (const combo of combos) {
      entries.push({
        url: `${SITE_URL}/combo/${combo.slug}`,
        lastModified: combo.updatedAt ? new Date(combo.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    }
  } catch {
    // API недоступен — пропускаем
  }

  // Музеи и арт-пространства
  try {
    const { items: venues } = await api.getVenues({ limit: 500 });
    for (const venue of venues ?? []) {
      entries.push({
        url: `${SITE_URL}/venues/${venue.slug}`,
        lastModified: venue.updatedAt ? new Date(venue.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.9,
      });
    }
  } catch {
    // API недоступен — пропускаем
  }

  // Подборки
  try {
    const collections = await api.getCollections();
    // Индексная страница
    entries.push({
      url: `${SITE_URL}/podborki`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
    for (const col of collections) {
      entries.push({
        url: `${SITE_URL}/podborki/${col.slug}`,
        lastModified: col.updatedAt ? new Date(col.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    }
  } catch {
    // API недоступен — пропускаем
  }

  // События (первые 500)
  try {
    const { items: events } = await api.getEvents({ limit: 500 });
    for (const ev of events) {
      entries.push({
        url: `${SITE_URL}/events/${ev.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } catch {
    // API недоступен — пропускаем
  }

  // Статические страницы
  const staticPages = [
    { path: '/about', priority: 0.5 },
    { path: '/contacts', priority: 0.5 },
    { path: '/blog', priority: 0.6 },
  ];

  for (const page of staticPages) {
    entries.push({
      url: `${SITE_URL}${page.path}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: page.priority,
    });
  }

  return entries;
}
