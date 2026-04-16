/**
 * Foundation fixtures seed for Phase C (C1/C2/C4).
 *
 * Goals:
 * - Populate a small but meaningful graph for Admin V3 smoke-check
 * - Include controlled scenarios: HAPPY / LEGACY_ONLY / NORMALIZED_ONLY / MIXED / BROKEN / INACTIVE
 * - Be idempotent (upsert by stable keys)
 *
 * Run:
 *   - From packages/backend:
 *     - DATABASE_URL=... npx tsx prisma/seed-foundation-fixtures.ts
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { type TagCategory } from '../src/prisma-client';
import { createScriptPrismaClient } from '../scripts/_prisma';

dotenv.config({ path: path.join(__dirname, '../.env') });

const { prisma, pool } = createScriptPrismaClient();

const FIXTURE_SCENARIOS = {
  HAPPY: 'HAPPY',
  LEGACY_ONLY: 'LEGACY_ONLY',
  NORMALIZED_ONLY: 'NORMALIZED_ONLY',
  MIXED: 'MIXED',
  BROKEN: 'BROKEN',
  INACTIVE: 'INACTIVE',
} as const;

const IMG = 'https://images.unsplash.com/photo-1545989250-0d0a39a9ed30?auto=format&fit=crop&w=1400&q=80';
const IMG2 = 'https://images.unsplash.com/photo-1518998053901-5348d0561edb?auto=format&fit=crop&w=1400&q=80';

function asKopecks(rub: number): number {
  return Math.round(rub * 100);
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function atHour(base: Date, dayOffset: number, h: number, m = 0): Date {
  const d = addDays(base, dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

async function ensureCity(input: {
  slug: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  isFeatured?: boolean;
}) {
  return prisma.city.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      description: input.description,
      lat: input.lat,
      lng: input.lng,
      isFeatured: input.isFeatured ?? false,
      isActive: true,
    },
    create: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      lat: input.lat,
      lng: input.lng,
      timezone: 'Europe/Moscow',
      isFeatured: input.isFeatured ?? false,
      isActive: true,
      metaTitle: `${input.name} — fixtures`,
      metaDescription: `Fixture city for Admin V3 smoke-check: ${input.name}`,
    },
  });
}

async function ensureSupplierOperator(input: {
  slug: string;
  name: string;
  isActive: boolean;
  status: 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED';
}) {
  return prisma.operator.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      isActive: input.isActive,
      status: input.status,
      isSupplier: true,
    },
    create: {
      slug: input.slug,
      name: input.name,
      isActive: input.isActive,
      status: input.status,
      isSupplier: true,
      website: 'https://example.com',
    },
  });
}

async function ensureTag(input: {
  slug: string;
  name: string;
  category: TagCategory;
  isActive: boolean;
  isDeleted?: boolean;
}) {
  return prisma.tag.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      category: input.category,
      isActive: input.isActive,
      isDeleted: input.isDeleted ?? false,
      deletedAt: input.isDeleted ? new Date() : null,
    },
    create: {
      slug: input.slug,
      name: input.name,
      category: input.category,
      isActive: input.isActive,
      isDeleted: input.isDeleted ?? false,
      deletedAt: input.isDeleted ? new Date() : null,
      metaTitle: `${input.name} — fixtures`,
      metaDescription: `Fixture tag: ${input.slug}`,
    },
  });
}

async function ensureVenue(input: {
  slug: string;
  cityId: string;
  operatorId: string | null;
  title: string;
  venueType: 'PARK' | 'MUSEUM' | 'GALLERY' | 'ART_SPACE' | 'EXHIBITION_HALL' | 'THEATER' | 'PALACE';
  address: string;
  lat: number;
  lng: number;
  isActive: boolean;
  needsReview?: boolean;
  lifecycleStatus?: 'ACTIVE' | 'DRAFT' | 'MERGED' | 'REJECTED';
}) {
  return prisma.venue.upsert({
    where: { slug: input.slug },
    update: {
      cityId: input.cityId,
      operatorId: input.operatorId ?? undefined,
      title: input.title,
      normalizedName: input.title,
      venueType: input.venueType,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      imageUrl: IMG,
      galleryUrls: [IMG, IMG2],
      isActive: input.isActive,
      needsReview: input.needsReview ?? false,
      lifecycleStatus: input.lifecycleStatus ?? 'ACTIVE',
      isDeleted: false,
    },
    create: {
      cityId: input.cityId,
      operatorId: input.operatorId ?? undefined,
      slug: input.slug,
      title: input.title,
      normalizedName: input.title,
      venueType: input.venueType,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      imageUrl: IMG,
      galleryUrls: [IMG, IMG2],
      isActive: input.isActive,
      needsReview: input.needsReview ?? false,
      lifecycleStatus: input.lifecycleStatus ?? 'ACTIVE',
      isPublished: true,
      sourceType: 'MANUAL',
      createdByType: 'ADMIN',
    },
  });
}

async function ensureManualEvent(input: {
  slug: string;
  cityId: string;
  supplierId: string | null;
  venueId: string | null;
  title: string;
  category: 'EXCURSION' | 'MUSEUM' | 'EVENT';
  audience?: 'ALL' | 'KIDS' | 'FAMILY';
  subcategories?: Array<
    | 'RIVER'
    | 'WALKING'
    | 'BUS'
    | 'COMBINED'
    | 'QUEST'
    | 'GASTRO'
    | 'ROOFTOP'
    | 'EXTREME'
    | 'MUSEUM_CLASSIC'
    | 'EXHIBITION'
    | 'GALLERY'
    | 'PALACE'
    | 'PARK'
    | 'ART_SPACE'
    | 'SCULPTURE'
    | 'CONTEMPORARY'
    | 'CONCERT'
    | 'SHOW'
    | 'STANDUP'
    | 'THEATER'
    | 'SPORT'
    | 'FESTIVAL'
    | 'MASTERCLASS'
    | 'PARTY'
  >;
  isActive: boolean;
  withOffersAndSessions: boolean;
}) {
  const event = await prisma.event.upsert({
    where: { slug: input.slug },
    update: {
      cityId: input.cityId,
      supplierId: input.supplierId ?? undefined,
      venueId: input.venueId ?? undefined,
      title: input.title,
      category: input.category,
      audience: input.audience ?? 'ALL',
      subcategories: input.subcategories ?? [],
      isActive: input.isActive,
      isDeleted: false,
      moderationStatus: 'APPROVED',
      source: 'MANUAL',
      tcEventId: `fixture-${input.slug}`,
      imageUrl: IMG,
      galleryUrls: [IMG, IMG2],
      priceFrom: input.withOffersAndSessions ? asKopecks(1200) : null,
      createdByType: 'ADMIN',
    },
    create: {
      cityId: input.cityId,
      supplierId: input.supplierId ?? undefined,
      venueId: input.venueId ?? undefined,
      title: input.title,
      slug: input.slug,
      description: `Fixture event (${input.slug}) for Admin V3 smoke-check.`,
      shortDescription: `Fixture: ${input.title}`,
      category: input.category,
      audience: input.audience ?? 'ALL',
      subcategories: input.subcategories ?? [],
      minAge: 0,
      durationMinutes: 90,
      address: 'Fixture address',
      priceFrom: input.withOffersAndSessions ? asKopecks(1200) : null,
      isActive: input.isActive,
      imageUrl: IMG,
      galleryUrls: [IMG, IMG2],
      moderationStatus: 'APPROVED',
      source: 'MANUAL',
      tcEventId: `fixture-${input.slug}`,
      createdByType: 'ADMIN',
    },
  });

  if (!input.withOffersAndSessions) {
    return event;
  }

  const offer = await prisma.eventOffer.upsert({
    where: {
      source_externalEventId: { source: 'MANUAL', externalEventId: `fixture-${input.slug}` },
    },
    update: { eventId: event.id, status: 'ACTIVE', isPrimary: true, priceFrom: asKopecks(1200) },
    create: {
      eventId: event.id,
      source: 'MANUAL',
      purchaseType: 'WIDGET',
      externalEventId: `fixture-${input.slug}`,
      priceFrom: asKopecks(1200),
      isPrimary: true,
      status: 'ACTIVE',
      priority: 0,
    },
  });

  const base = new Date();
  const startsAt = atHour(base, 7, 19, 0);
  const endsAt = new Date(startsAt.getTime() + 90 * 60 * 1000);

  const existingSession = await prisma.eventSession.findFirst({
    where: { eventId: event.id, offerId: offer.id },
  });
  if (!existingSession) {
    await prisma.eventSession.create({
      data: {
        eventId: event.id,
        offerId: offer.id,
        tcSessionId: `manual-${event.id.slice(0, 8)}-${offer.id.slice(0, 8)}`,
        startsAt,
        endsAt,
        availableTickets: 50,
        prices: [
          { type: 'adult', price: asKopecks(1200) },
          { type: 'child', price: asKopecks(600) },
        ],
        isActive: true,
      },
    });
  }

  return event;
}

async function ensureUser(email: string) {
  return prisma.user.upsert({
    where: { email },
    update: { isActive: true, name: 'Fixture User' },
    create: {
      email,
      name: 'Fixture User',
      isActive: true,
      // Не используется в админке; нужен только чтобы favorites/orders не были сиротами.
      passwordHash: '$2b$10$fixture.fixture.fixture.fixture.fixture.fixture.fixture.fixture',
    },
  });
}

async function ensureLanding(input: {
  stableSlug: string;
  cityId: string | null;
  title: string;
  filterTag: string;
  filterTagId: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  isActive: boolean;
  isDeleted: boolean;
  landingType?: 'CITY' | 'HUB' | 'MULTI_CITY';
  parentLandingId?: string | null;
}) {
  // Prisma does not allow using a compound unique where with a nullable field (cityId),
  // so HUB/MULTI_CITY landings (cityId = null) are handled via findFirst + update/create.
  if (input.cityId === null) {
    const existing = await prisma.landingPage.findFirst({
      where: { cityId: null, slug: input.stableSlug },
      select: { id: true },
    });

    if (existing) {
      return prisma.landingPage.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          filterTag: input.filterTag,
          filterTagId: input.filterTagId ?? undefined,
          status: input.status,
          isActive: input.isActive,
          isDeleted: input.isDeleted,
          deletedAt: input.isDeleted ? new Date() : null,
          landingType: input.landingType ?? 'HUB',
          parentLandingId: input.parentLandingId ?? undefined,
        },
      });
    }

    return prisma.landingPage.create({
      data: {
        slug: input.stableSlug,
        landingType: input.landingType ?? 'HUB',
        parentLandingId: input.parentLandingId ?? undefined,
        filterTag: input.filterTag,
        filterTagId: input.filterTagId ?? undefined,
        title: input.title,
        subtitle: `Fixture landing (${input.stableSlug})`,
        heroText: 'Fixture landing content for Admin V3 smoke-check.',
        templateType: 'GENERIC_CARDS',
        status: input.status,
        isActive: input.isActive,
        isDeleted: input.isDeleted,
        deletedAt: input.isDeleted ? new Date() : null,
        isIndexable: true,
      },
    });
  }

  return prisma.landingPage.upsert({
    where: {
      cityId_slug: { cityId: input.cityId, slug: input.stableSlug },
    },
    update: {
      title: input.title,
      filterTag: input.filterTag,
      filterTagId: input.filterTagId ?? undefined,
      status: input.status,
      isActive: input.isActive,
      isDeleted: input.isDeleted,
      deletedAt: input.isDeleted ? new Date() : null,
      landingType: input.landingType ?? 'CITY',
      parentLandingId: input.parentLandingId ?? undefined,
    },
    create: {
      slug: input.stableSlug,
      cityId: input.cityId,
      landingType: input.landingType ?? 'CITY',
      parentLandingId: input.parentLandingId ?? undefined,
      filterTag: input.filterTag,
      filterTagId: input.filterTagId ?? undefined,
      title: input.title,
      subtitle: `Fixture landing (${input.stableSlug})`,
      heroText: 'Fixture landing content for Admin V3 smoke-check.',
      templateType: 'GENERIC_CARDS',
      status: input.status,
      isActive: input.isActive,
      isDeleted: input.isDeleted,
      deletedAt: input.isDeleted ? new Date() : null,
      isIndexable: true,
    },
  });
}

async function ensureCollection(input: {
  slug: string;
  cityId: string | null;
  title: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  isActive: boolean;
  isDeleted: boolean;
  legacyFilterTags: string[];
  normalizedTagIds: string[];
}) {
  const collection = await prisma.collection.upsert({
    where: { slug: input.slug },
    update: {
      cityId: input.cityId ?? undefined,
      title: input.title,
      status: input.status,
      isActive: input.isActive,
      isDeleted: input.isDeleted,
      deletedAt: input.isDeleted ? new Date() : null,
      filterTags: input.legacyFilterTags,
      metaTitle: `${input.title} — fixtures`,
      metaDescription: `Fixture collection: ${input.slug}`,
    },
    create: {
      slug: input.slug,
      cityId: input.cityId ?? undefined,
      title: input.title,
      subtitle: `Fixture collection (${input.slug})`,
      description: 'Fixture collection for Admin V3 smoke-check.',
      status: input.status,
      isActive: input.isActive,
      isDeleted: input.isDeleted,
      deletedAt: input.isDeleted ? new Date() : null,
      filterTags: input.legacyFilterTags,
      pinnedEventIds: [],
      excludedEventIds: [],
      sourceType: 'MANUAL',
      selectionBasis: 'MANUAL',
      metaTitle: `${input.title} — fixtures`,
      metaDescription: `Fixture collection: ${input.slug}`,
    },
  });

  // Normalized layer: CollectionTagFilter
  if (input.normalizedTagIds.length > 0) {
    for (let i = 0; i < input.normalizedTagIds.length; i++) {
      await prisma.collectionTagFilter.upsert({
        where: { collectionId_tagId: { collectionId: collection.id, tagId: input.normalizedTagIds[i] } },
        update: { position: i },
        create: { collectionId: collection.id, tagId: input.normalizedTagIds[i], position: i },
      });
    }
  }

  return collection;
}

async function ensureArticle(input: {
  slug: string;
  title: string;
  cityId: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  legacyLandingIds: string[];
  legacyCollectionIds: string[];
  normalizedLandingIds: string[];
  normalizedCollectionIds: string[];
}) {
  const article = await prisma.article.upsert({
    where: { slug: input.slug },
    update: {
      title: input.title,
      content: `# ${input.title}\n\nFixture article (${input.slug}).`,
      status: input.status,
      cityId: input.cityId ?? undefined,
      relatedLandingIds: input.legacyLandingIds,
      relatedCollectionIds: input.legacyCollectionIds,
      publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
    },
    create: {
      slug: input.slug,
      title: input.title,
      content: `# ${input.title}\n\nFixture article (${input.slug}).`,
      excerpt: 'Fixture excerpt.',
      cityId: input.cityId ?? undefined,
      status: input.status,
      relatedLandingIds: input.legacyLandingIds,
      relatedCollectionIds: input.legacyCollectionIds,
      publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      coverImage: IMG,
      metaTitle: `${input.title} — fixtures`,
      metaDescription: `Fixture article: ${input.slug}`,
    },
  });

  // Normalized layer: ArticleLandingLink / ArticleCollectionLink
  for (let i = 0; i < input.normalizedLandingIds.length; i++) {
    await prisma.articleLandingLink.upsert({
      where: { articleId_landingId: { articleId: article.id, landingId: input.normalizedLandingIds[i] } },
      update: { position: i, priority: 0 },
      create: { articleId: article.id, landingId: input.normalizedLandingIds[i], position: i, priority: 0 },
    });
  }

  for (let i = 0; i < input.normalizedCollectionIds.length; i++) {
    await prisma.articleCollectionLink.upsert({
      where: { articleId_collectionId: { articleId: article.id, collectionId: input.normalizedCollectionIds[i] } },
      update: { position: i, priority: 0 },
      create: { articleId: article.id, collectionId: input.normalizedCollectionIds[i], position: i, priority: 0 },
    });
  }

  return article;
}

async function ensureFavorite(input: { userId: string; eventSlug: string; eventId: string | null }) {
  // Unique constraint is (userId, eventSlug). For the normalized-only scenario we still
  // need a stable eventSlug value; we use the real event.slug.
  return prisma.userFavorite.upsert({
    where: { userId_eventSlug: { userId: input.userId, eventSlug: input.eventSlug } },
    update: { eventId: input.eventId ?? undefined },
    create: { userId: input.userId, eventSlug: input.eventSlug, eventId: input.eventId ?? undefined },
  });
}

async function main() {
  console.log(`=== Seed: Foundation fixtures (${Object.values(FIXTURE_SCENARIOS).join(', ')}) ===\n`);

  // --- Core reference: cities ---
  const spb = await ensureCity({
    slug: 'saint-petersburg',
    name: 'Санкт-Петербург',
    description: 'Fixture hub city with richer content.',
    lat: 59.9343,
    lng: 30.3351,
    isFeatured: true,
  });
  const moscow = await ensureCity({
    slug: 'moscow',
    name: 'Москва',
    description: 'Fixture city with medium coverage.',
    lat: 55.7558,
    lng: 37.6173,
    isFeatured: true,
  });
  const kazan = await ensureCity({
    slug: 'kazan',
    name: 'Казань',
    description: 'Fixture city with minimal coverage.',
    lat: 55.7961,
    lng: 49.1064,
    isFeatured: false,
  });

  // --- Suppliers (Operators) ---
  const supplierMain = await ensureSupplierOperator({
    slug: 'supplier_active_main',
    name: 'Supplier Active Main (fixtures)',
    isActive: true,
    status: 'ACTIVE',
  });
  const supplierSmall = await ensureSupplierOperator({
    slug: 'supplier_active_small',
    name: 'Supplier Active Small (fixtures)',
    isActive: true,
    status: 'ACTIVE',
  });
  const supplierInactive = await ensureSupplierOperator({
    slug: 'supplier_inactive',
    name: 'Supplier Inactive (fixtures)',
    isActive: false,
    status: 'ARCHIVED',
  });

  // --- Tags (including problematic ones) ---
  const tagSlugs = [
    'river-cruises',
    'night-cruises',
    'museums',
    'jazz',
    'kids',
    'history',
    'weekend',
    'petersburg-classic',
    'family',
    'outdoor',
    'inactive-tag',
    'deleted-tag',
  ] as const;

  const tags = await Promise.all([
    ensureTag({ slug: 'river-cruises', name: 'Речные прогулки', category: 'THEME', isActive: true }),
    ensureTag({ slug: 'night-cruises', name: 'Ночные прогулки', category: 'THEME', isActive: true }),
    ensureTag({ slug: 'museums', name: 'Музеи', category: 'THEME', isActive: true }),
    ensureTag({ slug: 'jazz', name: 'Джаз', category: 'THEME', isActive: true }),
    ensureTag({ slug: 'kids', name: 'Детям', category: 'AUDIENCE', isActive: true }),
    ensureTag({ slug: 'history', name: 'История', category: 'THEME', isActive: true }),
    ensureTag({ slug: 'weekend', name: 'На выходные', category: 'SPECIAL', isActive: true }),
    ensureTag({ slug: 'petersburg-classic', name: 'Классика Петербурга', category: 'SPECIAL', isActive: true }),
    ensureTag({ slug: 'family', name: 'Семейное', category: 'AUDIENCE', isActive: true }),
    ensureTag({ slug: 'outdoor', name: 'На свежем воздухе', category: 'THEME', isActive: true }),
    ensureTag({ slug: 'inactive-tag', name: 'Неактивный тег (fixtures)', category: 'SPECIAL', isActive: false }),
    ensureTag({ slug: 'deleted-tag', name: 'Удалённый тег (fixtures)', category: 'SPECIAL', isActive: false, isDeleted: true }),
  ]);

  const tagBySlug = new Map(tags.map((t) => [t.slug, t]));

  // --- Venues ---
  const spbPier = await ensureVenue({
    slug: 'pier-neva',
    cityId: spb.id,
    operatorId: supplierMain.id,
    title: 'Причал на Неве (fixtures)',
    venueType: 'PARK',
    address: 'Санкт-Петербург, набережная Невы (fixtures)',
    lat: 59.938,
    lng: 30.32,
    isActive: true,
  });

  const spbBoat = await ensureVenue({
    slug: 'ship-northern-venice',
    cityId: spb.id,
    operatorId: supplierMain.id,
    title: 'Теплоход “Северная Венеция” (fixtures)',
    venueType: 'PARK',
    address: 'Санкт-Петербург, причал (fixtures)',
    lat: 59.936,
    lng: 30.315,
    isActive: true,
  });

  const spbJazzSalon = await ensureVenue({
    slug: 'jazz-salon-on-water',
    cityId: spb.id,
    operatorId: supplierSmall.id,
    title: 'Джазовый салон на воде (fixtures)',
    venueType: 'PARK',
    address: 'Санкт-Петербург, на воде (fixtures)',
    lat: 59.93,
    lng: 30.31,
    isActive: true,
  });

  const moscowMuseum = await ensureVenue({
    slug: 'museum-city-history',
    cityId: moscow.id,
    operatorId: supplierSmall.id,
    title: 'Музей истории города (fixtures)',
    venueType: 'MUSEUM',
    address: 'Москва, центр (fixtures)',
    lat: 55.758,
    lng: 37.615,
    isActive: true,
  });

  await ensureVenue({
    slug: 'venue-candidate-draft',
    cityId: spb.id,
    operatorId: supplierMain.id,
    title: 'Площадка-кандидат (fixtures)',
    venueType: 'GALLERY',
    address: 'Санкт-Петербург, draft (fixtures)',
    lat: 59.925,
    lng: 30.35,
    isActive: true,
    needsReview: true,
    lifecycleStatus: 'DRAFT',
  });

  await ensureVenue({
    slug: 'venue-inactive',
    cityId: kazan.id,
    operatorId: supplierInactive.id,
    title: 'Неактивная площадка (fixtures)',
    venueType: 'PARK',
    address: 'Казань (fixtures)',
    lat: 55.79,
    lng: 49.11,
    isActive: false,
  });

  // --- Events (minimal but meaningful) ---
  const eventRiver = await ensureManualEvent({
    slug: 'river-walk-neva',
    cityId: spb.id,
    supplierId: supplierMain.id,
    venueId: spbPier.id,
    title: 'Речная прогулка по Неве (fixtures)',
    category: 'EXCURSION',
    subcategories: ['RIVER'],
    isActive: true,
    withOffersAndSessions: true,
  });

  const eventNightJazz = await ensureManualEvent({
    slug: 'night-jazz-on-water',
    cityId: spb.id,
    supplierId: supplierMain.id,
    venueId: spbJazzSalon.id,
    title: 'Ночной джаз на воде (fixtures)',
    category: 'EVENT',
    subcategories: ['CONCERT'],
    isActive: true,
    withOffersAndSessions: true,
  });

  const eventKids = await ensureManualEvent({
    slug: 'kids-sailor-program',
    cityId: spb.id,
    supplierId: supplierSmall.id,
    venueId: spbBoat.id,
    title: 'Детская программа “Посвящение в моряки” (fixtures)',
    category: 'EVENT',
    audience: 'KIDS',
    subcategories: ['SHOW'],
    isActive: true,
    withOffersAndSessions: true,
  });

  const eventNoVenue = await ensureManualEvent({
    slug: 'event-without-venue',
    cityId: spb.id,
    supplierId: supplierSmall.id,
    venueId: null,
    title: 'Событие без площадки (fixtures)',
    category: 'EVENT',
    subcategories: ['SHOW'],
    isActive: true,
    withOffersAndSessions: true,
  });

  const _eventNoOffers = await ensureManualEvent({
    slug: 'event-without-offers',
    cityId: moscow.id,
    supplierId: supplierSmall.id,
    venueId: moscowMuseum.id,
    title: 'Событие без offers (fixtures)',
    category: 'MUSEUM',
    subcategories: ['MUSEUM_CLASSIC'],
    isActive: true,
    withOffersAndSessions: false,
  });

  const eventInactive = await ensureManualEvent({
    slug: 'event-inactive',
    cityId: kazan.id,
    supplierId: supplierInactive.id,
    venueId: null,
    title: 'Неактивное событие (fixtures)',
    category: 'EXCURSION',
    subcategories: ['WALKING'],
    isActive: false,
    withOffersAndSessions: false,
  });

  // Event tags (enough to drive filters)
  const tagLinks: Array<[string, string]> = [
    [eventRiver.id, tagBySlug.get('river-cruises')!.id],
    [eventNightJazz.id, tagBySlug.get('jazz')!.id],
    [eventNightJazz.id, tagBySlug.get('night-cruises')!.id],
    [eventKids.id, tagBySlug.get('kids')!.id],
    [eventKids.id, tagBySlug.get('family')!.id],
    [eventNoVenue.id, tagBySlug.get('weekend')!.id],
  ];
  for (const [eventId, tagId] of tagLinks) {
    await prisma.eventTag.upsert({
      where: { eventId_tagId: { eventId, tagId } },
      update: {},
      create: { eventId, tagId, assignmentSource: 'MANUAL_ADMIN' },
    });
  }

  // --- User for favorites ---
  const fixtureUser = await ensureUser('fixture.user@daibilet.local');

  // --- Landings (C2: filterTagId vs filterTag) ---
  const landingFilterTagIdOnly = await ensureLanding({
    stableSlug: 'night-cruises',
    cityId: spb.id,
    title: 'Ночные прогулки в СПб (fixtures)',
    filterTag: 'night-cruises',
    filterTagId: tagBySlug.get('night-cruises')!.id,
    status: 'ACTIVE',
    isActive: true,
    isDeleted: false,
  });

  const landingLegacyOnly = await ensureLanding({
    stableSlug: 'legacy-night-cruises',
    cityId: spb.id,
    title: 'Легаси-лендинг: night-cruises (fixtures)',
    filterTag: 'night-cruises',
    filterTagId: null,
    status: 'ACTIVE',
    isActive: true,
    isDeleted: false,
  });

  const _landingMixed = await ensureLanding({
    stableSlug: 'mixed-landing',
    cityId: moscow.id,
    title: 'Смешанный лендинг (fixtures)',
    filterTag: 'museums', // legacy differs from FK to test normalized-first
    filterTagId: tagBySlug.get('night-cruises')!.id,
    status: 'ACTIVE',
    isActive: true,
    isDeleted: false,
  });

  const landingUnresolved = await ensureLanding({
    stableSlug: 'unresolved-legacy-tag',
    cityId: spb.id,
    title: 'Лендинг с нерешаемым legacy slug (fixtures)',
    filterTag: 'missing-legacy-tag', // intentionally NOT created
    filterTagId: null,
    status: 'ACTIVE',
    isActive: true,
    isDeleted: false,
  });

  const _landingThin = await ensureLanding({
    stableSlug: 'thin-landing',
    cityId: kazan.id,
    title: 'Тонкий лендинг (fixtures)',
    filterTag: 'weekend',
    filterTagId: tagBySlug.get('weekend')!.id,
    status: 'ACTIVE',
    isActive: true,
    isDeleted: false,
  });

  const hubLanding = await ensureLanding({
    stableSlug: 'river-cruises-hub',
    cityId: null,
    landingType: 'HUB',
    title: 'Хаб: речные прогулки (fixtures)',
    filterTag: 'river-cruises',
    filterTagId: tagBySlug.get('river-cruises')!.id,
    status: 'ACTIVE',
    isActive: true,
    isDeleted: false,
  });

  await ensureLanding({
    stableSlug: 'river-cruises-spb',
    cityId: spb.id,
    landingType: 'CITY',
    parentLandingId: hubLanding.id,
    title: 'Речные прогулки в СПб (fixtures)',
    filterTag: 'river-cruises',
    filterTagId: tagBySlug.get('river-cruises')!.id,
    status: 'ACTIVE',
    isActive: true,
    isDeleted: false,
  });

  // --- Collections (C2: CollectionTagFilter vs filterTags) ---
  const collectionNormalizedOnly = await ensureCollection({
    slug: 'collection-normalized-only',
    cityId: spb.id,
    title: 'Подборка (normalized-only) (fixtures)',
    status: 'ACTIVE',
    isActive: true,
    isDeleted: false,
    legacyFilterTags: [],
    normalizedTagIds: [tagBySlug.get('night-cruises')!.id, tagBySlug.get('jazz')!.id],
  });

  const collectionLegacyOnly = await ensureCollection({
    slug: 'collection-legacy-only',
    cityId: spb.id,
    title: 'Подборка (legacy-only) (fixtures)',
    status: 'ACTIVE',
    isActive: true,
    isDeleted: false,
    legacyFilterTags: ['river-cruises', 'weekend'],
    normalizedTagIds: [],
  });

  const _collectionMixed = await ensureCollection({
    slug: 'collection-mixed',
    cityId: moscow.id,
    title: 'Подборка (mixed) (fixtures)',
    status: 'ACTIVE',
    isActive: true,
    isDeleted: false,
    legacyFilterTags: ['museums'], // legacy differs from normalized
    normalizedTagIds: [tagBySlug.get('night-cruises')!.id],
  });

  const collectionBroken = await ensureCollection({
    slug: 'collection-broken-legacy-tag',
    cityId: spb.id,
    title: 'Подборка (битый legacy filterTags) (fixtures)',
    status: 'ACTIVE',
    isActive: true,
    isDeleted: false,
    legacyFilterTags: ['night-cruises', 'missing-legacy-tag'], // one missing on purpose
    normalizedTagIds: [],
  });

  const collectionDeletedTarget = await ensureCollection({
    slug: 'collection-deleted-target',
    cityId: spb.id,
    title: 'Подборка (удалённая цель) (fixtures)',
    status: 'ACTIVE',
    isActive: false,
    isDeleted: true, // used as "deleted target" for article links validation/unresolved
    legacyFilterTags: [],
    normalizedTagIds: [tagBySlug.get('river-cruises')!.id],
  });

  // --- Articles (C1: link tables vs legacy arrays) ---
  const fakeMissingLandingId = '00000000-0000-0000-0000-000000000001';

  await ensureArticle({
    slug: 'article-new-links-only',
    title: 'Статья с новыми link-таблицами (fixtures)',
    cityId: spb.id,
    status: 'PUBLISHED',
    legacyLandingIds: [],
    legacyCollectionIds: [],
    normalizedLandingIds: [landingFilterTagIdOnly.id],
    normalizedCollectionIds: [collectionNormalizedOnly.id],
  });

  await ensureArticle({
    slug: 'article-legacy-only',
    title: 'Статья (legacy-only links) (fixtures)',
    cityId: spb.id,
    status: 'PUBLISHED',
    legacyLandingIds: [landingLegacyOnly.id],
    legacyCollectionIds: [collectionLegacyOnly.id],
    normalizedLandingIds: [],
    normalizedCollectionIds: [],
  });

  await ensureArticle({
    slug: 'article-mixed',
    title: 'Статья (mixed links) (fixtures)',
    cityId: spb.id,
    status: 'PUBLISHED',
    // legacy intentionally differs from normalized to test normalized-first in dual-read
    legacyLandingIds: [landingLegacyOnly.id],
    legacyCollectionIds: [collectionLegacyOnly.id],
    normalizedLandingIds: [landingFilterTagIdOnly.id],
    normalizedCollectionIds: [collectionNormalizedOnly.id],
  });

  await ensureArticle({
    slug: 'article-unresolved-legacy-landing',
    title: 'Статья с битым legacy landing id (fixtures)',
    cityId: spb.id,
    status: 'PUBLISHED',
    legacyLandingIds: [fakeMissingLandingId],
    legacyCollectionIds: [],
    normalizedLandingIds: [],
    normalizedCollectionIds: [],
  });

  await ensureArticle({
    slug: 'article-with-deleted-target',
    title: 'Статья со ссылкой на deleted collection (fixtures)',
    cityId: spb.id,
    status: 'PUBLISHED',
    legacyLandingIds: [],
    legacyCollectionIds: [collectionDeletedTarget.id],
    normalizedLandingIds: [],
    normalizedCollectionIds: [],
  });

  await ensureArticle({
    slug: 'article-empty',
    title: 'Пустая статья без related links (fixtures)',
    cityId: moscow.id,
    status: 'PUBLISHED',
    legacyLandingIds: [],
    legacyCollectionIds: [],
    normalizedLandingIds: [],
    normalizedCollectionIds: [],
  });

  // --- Favorites (C4: eventSlug vs eventId) ---
  await ensureFavorite({ userId: fixtureUser.id, eventSlug: eventRiver.slug, eventId: null }); // legacy-only
  await ensureFavorite({ userId: fixtureUser.id, eventSlug: eventNightJazz.slug, eventId: eventNightJazz.id }); // normalized
  await ensureFavorite({ userId: fixtureUser.id, eventSlug: eventKids.slug, eventId: eventNightJazz.id }); // mixed-ish (inconsistent on purpose)
  await ensureFavorite({ userId: fixtureUser.id, eventSlug: 'missing-event-slug', eventId: null }); // broken legacy
  await ensureFavorite({ userId: fixtureUser.id, eventSlug: eventInactive.slug, eventId: eventInactive.id }); // inactive target

  // --- Notes ---
  const missingLegacyTag = 'missing-legacy-tag';
  const missingTagCreated = tagSlugs.includes(missingLegacyTag as (typeof tagSlugs)[number]);
  if (missingTagCreated) {
    throw new Error('Invariant broken: missing-legacy-tag must NOT be created in fixtures seed.');
  }

  console.log('\nDone.\n');
  console.log('Key fixtures:');
  console.log(`  - Cities: ${spb.slug}, ${moscow.slug}, ${kazan.slug}`);
  console.log(`  - Suppliers: ${supplierMain.slug}, ${supplierSmall.slug}, ${supplierInactive.slug}`);
  console.log(`  - Landings: ${landingFilterTagIdOnly.slug} (filterTagId), ${landingLegacyOnly.slug} (legacy), ${landingUnresolved.slug} (unresolved)`);
  console.log(`  - Collections: ${collectionNormalizedOnly.slug} (normalized), ${collectionLegacyOnly.slug} (legacy), ${collectionBroken.slug} (broken legacy)`);
  console.log('  - Articles: article-new-links-only / article-legacy-only / article-mixed / article-unresolved-legacy-landing / article-with-deleted-target / article-empty');
  console.log(`  - Favorites user: ${fixtureUser.email}`);
  console.log('\nNext step: run backfill scripts (dry-run) against this DB.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

