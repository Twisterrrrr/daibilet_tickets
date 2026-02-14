/**
 * seed-venue-links.ts
 *
 * Post-seed: привязка Event → Venue, создание OPEN_DATE офферов,
 * добавление imageUrl/galleryUrls для ТОП-10 venues.
 *
 * Запуск: npx tsx prisma/seed-venue-links.ts
 *
 * Идемпотентный — повторный запуск безопасен.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════
// 1. Связь Event ↔ Venue (по ключевым словам в title)
// ═══════════════════════════════════════

interface VenueEventMatch {
  venueSlug: string;
  /** Подстроки для поиска в Event.title (case-insensitive) */
  keywords: string[];
  /** Только для этого города (slug) */
  citySlug?: string;
}

const VENUE_EVENT_MATCHES: VenueEventMatch[] = [
  // СПб
  { venueSlug: 'ermitazh', keywords: ['эрмитаж', 'hermitage'], citySlug: 'saint-petersburg' },
  { venueSlug: 'russkij-muzej', keywords: ['русский музей', 'русского музея'], citySlug: 'saint-petersburg' },
  { venueSlug: 'muzej-faberze', keywords: ['фаберже', 'faberge'], citySlug: 'saint-petersburg' },
  { venueSlug: 'kunstkamera', keywords: ['кунсткамера', 'kunstkamera'], citySlug: 'saint-petersburg' },
  { venueSlug: 'petropavlovskaya-krepost', keywords: ['петропавловск', 'peter and paul'], citySlug: 'saint-petersburg' },
  { venueSlug: 'planetarij-1', keywords: ['планетарий'], citySlug: 'saint-petersburg' },
  { venueSlug: 'generalnyj-shtab', keywords: ['генеральн', 'генштаб'], citySlug: 'saint-petersburg' },
  // Москва
  { venueSlug: 'tretyakovskaya-galereya', keywords: ['третьяков', 'tretyakov'], citySlug: 'moscow' },
  { venueSlug: 'pushkinskij-muzej', keywords: ['пушкинский музей', 'gmii', 'pushkin museum'], citySlug: 'moscow' },
  { venueSlug: 'muzej-garazh', keywords: ['гараж', 'garage'], citySlug: 'moscow' },
  { venueSlug: 'moskovskij-planetarij', keywords: ['планетарий'], citySlug: 'moscow' },
  // Казань
  { venueSlug: 'kazanskij-kreml', keywords: ['казанский кремль', 'kazan kremlin'], citySlug: 'kazan' },
  // Калининград
  { venueSlug: 'muzej-mirovogo-okeana', keywords: ['мировой океан', 'world ocean'], citySlug: 'kaliningrad' },
  // Нижний Новгород
  { venueSlug: 'nizhegorodskij-kreml', keywords: ['нижегородский кремль'], citySlug: 'nizhny-novgorod' },
];

async function linkEventsToVenues(): Promise<number> {
  let linkedCount = 0;

  for (const match of VENUE_EVENT_MATCHES) {
    const venue = await prisma.venue.findFirst({ where: { slug: match.venueSlug } });
    if (!venue) {
      console.log(`  ⚠ Venue "${match.venueSlug}" not found, skip`);
      continue;
    }

    // Ищем события по ключевым словам
    const cityFilter = match.citySlug
      ? { city: { slug: match.citySlug } }
      : {};

    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        venueId: null, // ещё не привязаны
        ...cityFilter,
        OR: match.keywords.map((kw) => ({
          title: { contains: kw, mode: 'insensitive' as any },
        })),
      },
      select: { id: true, title: true, slug: true },
      take: 5, // макс 5 событий на venue
    });

    if (events.length === 0) continue;

    // Привязываем
    const eventIds = events.map((e) => e.id);
    await prisma.event.updateMany({
      where: { id: { in: eventIds } },
      data: { venueId: venue.id },
    });

    for (const e of events) {
      console.log(`  ✓ Event "${e.title}" → Venue "${match.venueSlug}"`);
    }
    linkedCount += events.length;
  }

  return linkedCount;
}

// ═══════════════════════════════════════
// 2. OPEN_DATE оффер для Эрмитажа (пример ручного оффера)
// ═══════════════════════════════════════

async function createOpenDateOffer(): Promise<boolean> {
  const venue = await prisma.venue.findFirst({ where: { slug: 'ermitazh' } });
  if (!venue) {
    console.log('  ⚠ Venue "ermitazh" not found');
    return false;
  }

  // Проверяем, есть ли уже OPEN_DATE event для этого venue
  const existingEvent = await prisma.event.findFirst({
    where: { venueId: venue.id, dateMode: 'OPEN_DATE' },
    select: { id: true, title: true },
  });

  if (existingEvent) {
    console.log(`  ⏭ OPEN_DATE event already exists: "${existingEvent.title}"`);

    // Убедимся, что есть хотя бы один оффер
    const existingOffer = await prisma.eventOffer.findFirst({
      where: { eventId: existingEvent.id, venueId: venue.id },
    });
    if (existingOffer) {
      console.log(`  ⏭ Offer already exists for this event`);
      return false;
    }
  }

  // Найдём город
  const city = await prisma.city.findFirst({ where: { slug: 'saint-petersburg' } });
  if (!city) {
    console.log('  ⚠ City "saint-petersburg" not found');
    return false;
  }

  let eventId: string;

  if (existingEvent) {
    eventId = existingEvent.id;
  } else {
    // Создаём OPEN_DATE событие «Эрмитаж — билет с открытой датой»
    const event = await prisma.event.create({
      data: {
        source: 'MANUAL',
        tcEventId: `manual-ermitazh-open-${Date.now()}`,
        cityId: city.id,
        title: 'Эрмитаж — входной билет',
        slug: `ermitazh-vhodnoj-bilet`,
        shortDescription: 'Входной билет в Государственный Эрмитаж с открытой датой посещения. Главный музейный комплекс, Генштаб и другие здания.',
        description: `<p>Государственный Эрмитаж — один из крупнейших художественных и культурно-исторических музеев мира. Коллекция насчитывает более 3 миллионов экспонатов.</p>
<p>Входной билет даёт доступ в Главный музейный комплекс (Зимний дворец), Главный штаб и другие выставочные пространства.</p>
<p><strong>Что включено:</strong></p>
<ul>
<li>Вход в основную экспозицию Эрмитажа</li>
<li>Доступ в Генеральный штаб</li>
<li>Посещение временных выставок (при наличии)</li>
</ul>`,
        category: 'MUSEUM',
        imageUrl: venue.imageUrl,
        priceFrom: 50000, // 500 руб
        isActive: true,
        moderationStatus: 'APPROVED',
        venueId: venue.id,
        dateMode: 'OPEN_DATE',
        isPermanent: true,
      },
    });
    eventId = event.id;
    console.log(`  ✓ Created OPEN_DATE event: "${event.title}" (${event.slug})`);
  }

  // Создаём MANUAL оффер с привязкой к venue
  const offer = await prisma.eventOffer.create({
    data: {
      eventId,
      venueId: venue.id,
      source: 'MANUAL',
      purchaseType: 'REDIRECT',
      deeplink: 'https://www.hermitagemuseum.org/wps/portal/hermitage/tickets',
      priceFrom: 50000, // 500 руб
      status: 'ACTIVE',
      isPrimary: true,
      priority: 10,
      badge: 'Официальный сайт',
      availabilityMode: 'UNKNOWN',
      meetingPoint: 'Дворцовая площадь, 2 — Главный вход через ворота',
      meetingInstructions: 'Метро «Адмиралтейская» (выход на Невский проспект, далее 10 мин пешком в сторону Дворцовой площади). Электронный билет — отдельный вход без очереди.',
      operationalNote: 'Билет действителен в течение 180 дней с момента покупки. Крупные сумки сдаются в гардероб (бесплатно).',
    },
  });

  console.log(`  ✓ Created MANUAL offer (REDIRECT) → ${offer.id}`);
  return true;
}

// ═══════════════════════════════════════
// 3. Image URLs для ТОП-10 venues
// ═══════════════════════════════════════

interface VenueImages {
  slug: string;
  imageUrl: string;
  galleryUrls: string[];
}

// Unsplash / Wikimedia лицензионные изображения
const VENUE_IMAGES: VenueImages[] = [
  {
    slug: 'ermitazh',
    imageUrl: 'https://images.unsplash.com/photo-1556610961-2fecc5927173?w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1556610961-2fecc5927173?w=800&q=80',
      'https://images.unsplash.com/photo-1548834925-e48f8a27ae50?w=800&q=80',
      'https://images.unsplash.com/photo-1580994639498-5c7e1a2cdb4d?w=800&q=80',
      'https://images.unsplash.com/photo-1597566942801-ce4e227b51b5?w=800&q=80',
    ],
  },
  {
    slug: 'russkij-muzej',
    imageUrl: 'https://images.unsplash.com/photo-1580051823005-c6ed8db1b742?w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1580051823005-c6ed8db1b742?w=800&q=80',
      'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=800&q=80',
    ],
  },
  {
    slug: 'muzej-faberze',
    imageUrl: 'https://images.unsplash.com/photo-1612878010854-1250dfc5bfcf?w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1612878010854-1250dfc5bfcf?w=800&q=80',
    ],
  },
  {
    slug: 'kunstkamera',
    imageUrl: 'https://images.unsplash.com/photo-1584444744680-21e4f08b7e2e?w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1584444744680-21e4f08b7e2e?w=800&q=80',
    ],
  },
  {
    slug: 'petropavlovskaya-krepost',
    imageUrl: 'https://images.unsplash.com/photo-1553696590-5e5a6e56c868?w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1553696590-5e5a6e56c868?w=800&q=80',
      'https://images.unsplash.com/photo-1591020475530-ef5f85e01d23?w=800&q=80',
    ],
  },
  {
    slug: 'tretyakovskaya-galereya',
    imageUrl: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=800&q=80',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
    ],
  },
  {
    slug: 'pushkinskij-muzej',
    imageUrl: 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800&q=80',
    ],
  },
  {
    slug: 'muzej-garazh',
    imageUrl: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1568667256549-094345857637?w=800&q=80',
    ],
  },
  {
    slug: 'kazanskij-kreml',
    imageUrl: 'https://images.unsplash.com/photo-1623413711353-fa0af7a98d36?w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1623413711353-fa0af7a98d36?w=800&q=80',
    ],
  },
  {
    slug: 'muzej-mirovogo-okeana',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    ],
  },
];

async function updateVenueImages(): Promise<number> {
  let updated = 0;

  for (const vi of VENUE_IMAGES) {
    const venue = await prisma.venue.findFirst({ where: { slug: vi.slug } });
    if (!venue) {
      console.log(`  ⚠ Venue "${vi.slug}" not found`);
      continue;
    }

    // Не перезаписываем если уже есть imageUrl (мог быть загружен через админку)
    const updateData: any = {};
    if (!venue.imageUrl) {
      updateData.imageUrl = vi.imageUrl;
    }
    if (!venue.galleryUrls || (venue.galleryUrls as string[]).length === 0) {
      updateData.galleryUrls = vi.galleryUrls;
    }

    if (Object.keys(updateData).length === 0) {
      console.log(`  ⏭ Venue "${vi.slug}" already has images`);
      continue;
    }

    await prisma.venue.update({
      where: { id: venue.id },
      data: updateData,
    });

    console.log(`  ✓ Images for "${vi.slug}": imageUrl=${!!updateData.imageUrl}, gallery=${updateData.galleryUrls?.length || 0}`);
    updated++;
  }

  return updated;
}

// ═══════════════════════════════════════
// 4. Также привяжем venueId к EventOffer (прямые офферы venue)
//    для существующих связанных событий
// ═══════════════════════════════════════

async function linkOffersToVenues(): Promise<number> {
  // Находим все Events с venueId, у которых офферы не привязаны к venue
  const eventsWithVenue = await prisma.event.findMany({
    where: {
      venueId: { not: null },
      offers: {
        some: {
          venueId: null,
          status: 'ACTIVE',
        },
      },
    },
    select: {
      id: true,
      venueId: true,
      offers: {
        where: { venueId: null, status: 'ACTIVE' },
        select: { id: true },
      },
    },
  });

  let count = 0;
  for (const event of eventsWithVenue) {
    if (!event.venueId) continue;
    const offerIds = event.offers.map((o) => o.id);
    if (offerIds.length === 0) continue;

    await prisma.eventOffer.updateMany({
      where: { id: { in: offerIds } },
      data: { venueId: event.venueId },
    });
    count += offerIds.length;
  }

  return count;
}

// ═══════════════════════════════════════
// Main
// ═══════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('Post-seed: Venue Links, OPEN_DATE, Images');
  console.log('═══════════════════════════════════════\n');

  // Step 1: Link events to venues
  console.log('1. Linking Events → Venues by keywords...');
  const linkedEvents = await linkEventsToVenues();
  console.log(`   Total linked: ${linkedEvents} events\n`);

  // Step 2: Create OPEN_DATE offer for Hermitage
  console.log('2. Creating OPEN_DATE offer (Hermitage)...');
  await createOpenDateOffer();
  console.log('');

  // Step 3: Link offers to venues
  console.log('3. Linking EventOffers → Venues...');
  const linkedOffers = await linkOffersToVenues();
  console.log(`   Total linked: ${linkedOffers} offers\n`);

  // Step 4: Add images
  console.log('4. Adding images for TOP-10 venues...');
  const imagesUpdated = await updateVenueImages();
  console.log(`   Total updated: ${imagesUpdated} venues\n`);

  // Summary
  console.log('═══════════════════════════════════════');
  console.log('Done!');
  console.log(`  Events linked to venues: ${linkedEvents}`);
  console.log(`  Offers linked to venues: ${linkedOffers}`);
  console.log(`  Venue images updated: ${imagesUpdated}`);
  console.log('═══════════════════════════════════════');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
