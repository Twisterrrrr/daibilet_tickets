/**
 * Сценарный сид для демо/UX (каталог, venue-program, quality/issues).
 * Не дублирует справочники из базового seed; идемпотентен по slug / стабильным ключам.
 *
 * Требуется: города moscow, saint-petersburg и подкатегории из основного seed (exhibition, museum, walking-excursion).
 *
 * Запуск: pnpm --filter @daibilet/backend db:seed:scenarios
 *    или: npx tsx prisma/seed-scenarios.ts (из packages/backend)
 */
import * as path from 'path';

import * as dotenv from 'dotenv';
import {
  type EventCategory,
  type EventSubcategory,
  type OfferStatus,
  type Prisma,
  type VenueType,
} from '../src/prisma-client';
import { createScriptPrismaClient } from '../scripts/_prisma';

dotenv.config({ path: path.join(__dirname, '../.env') });

const { prisma, pool } = createScriptPrismaClient();

const IMG = 'https://images.unsplash.com/photo-1545989250-0d0a39a9ed30?auto=format&fit=crop&w=1400&q=80';
const IMG2 = 'https://images.unsplash.com/photo-1518998053901-5348d0561edb?auto=format&fit=crop&w=1400&q=80';

function rub(n: number): number {
  return Math.round(n * 100);
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

const museumContentBlocks = (): Prisma.InputJsonValue => ({
  program:
    'Постоянные и временные экспозиции, лекторий и образовательные программы. Демо-данные для проверки витрины и админки.',
  visitorTips: 'Рекомендуем выделить не менее 2 часов на посещение. Демо.',
  bookingRules:
    'Билеты действуют в выбранный день. Демо-сценарий: проверка OPEN_DATE, цен и ограничений в интерфейсе.',
  extraFaq: [{ q: 'Это реальная продажа?', a: 'Нет, это демонстрационные данные сценарного сида.' }],
});

const excursionContentBlocks = (lat: number, lng: number): Prisma.InputJsonValue => ({
  routeDescription:
    'Экскурсия по залам демо-площадки: ключевые работы коллекции и история пространства. Сценарный сид.',
  routeMap: {
    lat,
    lng,
    zoom: 15,
    points: [{ lat, lng, label: 'Точка сбора — демо' }],
  },
  program:
    'Встреча у входа · Обзорная экскурсия по маршруту · Вопросы и ответы. Демо для SCHEDULED и сеансов.',
  bookingRules: 'Приходите за 15 минут до начала слота. Демо.',
  advantages: ['Фиксированные слоты', 'Небольшая группа', 'Демо-данные'],
});

async function requireCity(slug: string) {
  const c = await prisma.city.findUnique({ where: { slug } });
  if (!c) {
    throw new Error(
      `Город "${slug}" не найден. Сначала выполните базовый seed (pnpm --filter @daibilet/backend db:seed).`,
    );
  }
  return c;
}

async function requireSubcategoryId(slug: string): Promise<string> {
  const s = await prisma.subcategory.findUnique({ where: { slug } });
  if (!s) {
    // Backward-compatible fallbacks: scenario seed historically used older slugs.
    const fallbackBySlug: Record<string, { code: string; type: 'EVENT_ONLY' | 'VENUE_ONLY' }> = {
      'gallery-venue': { code: 'GALLERY', type: 'VENUE_ONLY' },
      'museum-venue': { code: 'MUSEUM', type: 'VENUE_ONLY' },
      exhibition: { code: 'EXHIBITION', type: 'EVENT_ONLY' },
      museum: { code: 'MUSEUM_CLASSIC', type: 'EVENT_ONLY' },
      'walking-excursion': { code: 'WALKING', type: 'EVENT_ONLY' },
    };

    const fb = fallbackBySlug[slug];
    if (fb) {
      const byCode = await prisma.subcategory.findFirst({
        where: { code: fb.code, type: fb.type },
        select: { id: true },
      });
      if (byCode) return byCode.id;
    }

    throw new Error(`Подкатегория "${slug}" не найдена. Нужен базовый seed со справочником подкатегорий.`);
  }
  return s.id;
}

async function ensureVenueSubcategoryLink(venueId: string, subcategorySlug: string) {
  const subId = await requireSubcategoryId(subcategorySlug);
  await prisma.venueSubcategoryLink.upsert({
    where: { venueId_subcategoryId: { venueId, subcategoryId: subId } },
    update: {},
    create: { venueId, subcategoryId: subId },
  });
}

async function ensureEventSubcategoryLink(eventId: string, subcategorySlug: string) {
  const subId = await requireSubcategoryId(subcategorySlug);
  await prisma.eventSubcategoryLink.upsert({
    where: { eventId_subcategoryId: { eventId, subcategoryId: subId } },
    update: {},
    create: { eventId, subcategoryId: subId },
  });
}

async function ensureVenue(input: {
  slug: string;
  cityId: string;
  title: string;
  shortDescription: string;
  description: string;
  address: string;
  venueType: VenueType;
  lat: number;
  lng: number;
  imageUrl: string;
  galleryUrls: string[];
  openingHours?: Prisma.InputJsonValue;
  venueTemplateData?: Prisma.InputJsonValue;
}) {
  return prisma.venue.upsert({
    where: { slug: input.slug },
    update: {
      cityId: input.cityId,
      title: input.title,
      normalizedName: input.title,
      shortDescription: input.shortDescription,
      description: input.description,
      address: input.address,
      venueType: input.venueType,
      lat: input.lat,
      lng: input.lng,
      imageUrl: input.imageUrl,
      galleryUrls: input.galleryUrls,
      isActive: true,
      isDeleted: false,
      openingHours: input.openingHours ?? undefined,
      venueTemplateData: input.venueTemplateData ?? undefined,
    },
    create: {
      slug: input.slug,
      cityId: input.cityId,
      title: input.title,
      normalizedName: input.title,
      shortDescription: input.shortDescription,
      description: input.description,
      address: input.address,
      venueType: input.venueType,
      lat: input.lat,
      lng: input.lng,
      imageUrl: input.imageUrl,
      galleryUrls: input.galleryUrls,
      isActive: true,
      openingHours: input.openingHours ?? undefined,
      venueTemplateData: input.venueTemplateData ?? undefined,
    },
  });
}

async function ensureManualEvent(input: {
  slug: string;
  cityId: string;
  venueId: string | null;
  title: string;
  shortDescription: string;
  description: string;
  category: EventCategory;
  subcategories: EventSubcategory[];
  dateMode: 'OPEN_DATE' | 'SCHEDULED';
  isPermanent: boolean;
  endDate: Date | null;
  createdAt?: Date;
  imageUrl: string | null;
  galleryUrls: string[];
  priceFrom: number | null;
  moderationStatus: 'APPROVED';
  defaultCapacityTotal?: number | null;
}) {
  const tcEventId = `scenario-${input.slug}`;
  const base = {
    cityId: input.cityId,
    venueId: input.venueId,
    title: input.title,
    shortDescription: input.shortDescription,
    description: input.description,
    category: input.category,
    subcategories: input.subcategories,
    dateMode: input.dateMode,
    isPermanent: input.isPermanent,
    endDate: input.endDate,
    imageUrl: input.imageUrl,
    galleryUrls: input.galleryUrls,
    priceFrom: input.priceFrom,
    isActive: true,
    isDeleted: false,
    moderationStatus: input.moderationStatus,
    source: 'MANUAL' as const,
    tcEventId,
    defaultCapacityTotal: input.defaultCapacityTotal ?? undefined,
  };

  const existing = await prisma.event.findUnique({ where: { slug: input.slug } });
  if (existing) {
    return prisma.event.update({
      where: { id: existing.id },
      data: {
        ...base,
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
      },
    });
  }
  return prisma.event.create({
    data: {
      slug: input.slug,
      ...base,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
  });
}

async function ensurePublishedOverride(
  eventId: string,
  contentTemplateData: Prisma.InputJsonValue,
  extra?: { imageUrl?: string | null; description?: string | null },
) {
  await prisma.eventOverride.upsert({
    where: { eventId },
    update: {
      editorStatus: 'PUBLISHED',
      isHidden: false,
      showInVenueProgram: true,
      contentTemplateData,
      subcategoriesMode: 'INHERIT',
      subcategoriesOverride: [],
      ...(extra?.imageUrl !== undefined ? { imageUrl: extra.imageUrl } : {}),
      ...(extra?.description !== undefined ? { description: extra.description } : {}),
    },
    create: {
      eventId,
      editorStatus: 'PUBLISHED',
      isHidden: false,
      showInVenueProgram: true,
      contentTemplateData,
      subcategoriesMode: 'INHERIT',
      subcategoriesOverride: [],
      ...(extra?.imageUrl !== undefined ? { imageUrl: extra.imageUrl } : {}),
      ...(extra?.description !== undefined ? { description: extra.description } : {}),
    },
  });
}

async function upsertManualOffer(input: {
  eventId: string;
  externalEventId: string;
  priceFrom: number | null;
  status: OfferStatus;
  isPrimary: boolean;
  priority: number;
  deeplink?: string;
  externalData?: Prisma.InputJsonValue;
}) {
  const deeplink = input.deeplink ?? 'https://example.com/scenario-demo-ticket';
  return prisma.eventOffer.upsert({
    where: {
      source_externalEventId: { source: 'MANUAL', externalEventId: input.externalEventId },
    },
    update: {
      eventId: input.eventId,
      purchaseType: 'REDIRECT',
      deeplink,
      priceFrom: input.priceFrom,
      status: input.status,
      isPrimary: input.isPrimary,
      priority: input.priority,
      externalData: input.externalData ?? undefined,
      isDeleted: false,
      deletedAt: null,
    },
    create: {
      eventId: input.eventId,
      source: 'MANUAL',
      purchaseType: 'REDIRECT',
      externalEventId: input.externalEventId,
      deeplink,
      priceFrom: input.priceFrom,
      status: input.status,
      isPrimary: input.isPrimary,
      priority: input.priority,
      externalData: input.externalData ?? undefined,
    },
  });
}

async function syncEventPriceFromMin(eventId: string) {
  const offers = await prisma.eventOffer.findMany({
    where: { eventId, status: 'ACTIVE', isDeleted: false, priceFrom: { not: null } },
    select: { priceFrom: true },
  });
  const nums = offers.map((o) => o.priceFrom!).filter((p) => p > 0);
  const min = nums.length ? Math.min(...nums) : null;
  await prisma.event.update({
    where: { id: eventId },
    data: { priceFrom: min },
  });
}

async function upsertScenarioSession(input: {
  eventId: string;
  offerId: string;
  tcSessionId: string;
  startsAt: Date;
  endsAt: Date;
  prices: Prisma.InputJsonValue;
  isActive: boolean;
  canceledAt: Date | null;
  availableTickets: number;
  capacityTotal: number | null;
}) {
  await prisma.eventSession.upsert({
    where: { tcSessionId: input.tcSessionId },
    update: {
      eventId: input.eventId,
      offerId: input.offerId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      prices: input.prices,
      isActive: input.isActive,
      canceledAt: input.canceledAt,
      availableTickets: input.availableTickets,
      capacityTotal: input.capacityTotal,
    },
    create: {
      eventId: input.eventId,
      offerId: input.offerId,
      tcSessionId: input.tcSessionId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      prices: input.prices,
      isActive: input.isActive,
      canceledAt: input.canceledAt,
      availableTickets: input.availableTickets,
      capacityTotal: input.capacityTotal,
    },
  });
}

async function main() {
  const summary: string[] = [];
  const now = new Date();
  const moscow = await requireCity('moscow');
  const spb = await requireCity('saint-petersburg');

  // ─── Сценарий 1: Garage ART_SPACE + программа ─────────────────────────────
  const garage = await ensureVenue({
    slug: 'garage-moscow-demo',
    cityId: moscow.id,
    title: 'Гараж (демо) — арт-пространство',
    shortDescription: 'Демо-площадка для проверки venue-program: current / upcoming / past и OPEN_DATE + SCHEDULED.',
    description:
      'Сценарный сид: вымышленная площадка по мотивам музея современного искусства. Полноценный контент для витрины и админки.',
    address: 'Крымский Вал, 9, стр. 32, Москва (демо-адрес)',
    venueType: 'ART_SPACE',
    lat: 55.7286,
    lng: 37.601,
    imageUrl: IMG,
    galleryUrls: [IMG2],
    openingHours: { mon: '11:00–21:00', tue: '11:00–21:00', wed: '11:00–21:00', thu: '11:00–22:00', fri: '11:00–22:00', sat: '11:00–22:00', sun: '11:00–21:00' },
  });
  await ensureVenueSubcategoryLink(garage.id, 'gallery-venue');
  summary.push(`Venue ${garage.slug} (hub программы)`);

  const permanent = await ensureManualEvent({
    slug: 'garage-permanent-exhibition-demo',
    cityId: moscow.id,
    venueId: garage.id,
    title: 'Постоянная экспозиция — демо',
    shortDescription: 'OPEN_DATE, постоянная выставка; несколько ценовых «категорий» в офферах.',
    description:
      '<p>Постоянная коллекция демо-площадки. Проверка oldPrice, weekday restriction и groupSize — в <code>externalData</code> офферов.</p>',
    category: 'MUSEUM',
    subcategories: ['EXHIBITION'],
    dateMode: 'OPEN_DATE',
    isPermanent: true,
    endDate: null,
    imageUrl: IMG,
    galleryUrls: [IMG2],
    priceFrom: rub(400),
    moderationStatus: 'APPROVED',
  });
  await ensurePublishedOverride(permanent.id, museumContentBlocks());
  await ensureEventSubcategoryLink(permanent.id, 'exhibition');

  await upsertManualOffer({
    eventId: permanent.id,
    externalEventId: 'scenario-offer-garage-permanent-adult',
    priceFrom: rub(800),
    status: 'ACTIVE',
    isPrimary: true,
    priority: 30,
    externalData: { demoCategory: 'Взрослый', oldPrice: rub(1000) },
  });
  await upsertManualOffer({
    eventId: permanent.id,
    externalEventId: 'scenario-offer-garage-permanent-concession',
    priceFrom: rub(400),
    status: 'ACTIVE',
    isPrimary: false,
    priority: 20,
    externalData: { demoCategory: 'Льготный', weekdayRestriction: 'MON-FRI' },
  });
  await upsertManualOffer({
    eventId: permanent.id,
    externalEventId: 'scenario-offer-garage-permanent-family',
    priceFrom: rub(1500),
    status: 'ACTIVE',
    isPrimary: false,
    priority: 10,
    externalData: { demoCategory: 'Семейный', groupSize: 4, maxPurchasesPerCategory: 2 },
  });
  await syncEventPriceFromMin(permanent.id);
  summary.push(`Event ${permanent.slug}`);

  const temporary = await ensureManualEvent({
    slug: 'garage-temporary-exhibition-demo',
    cityId: moscow.id,
    venueId: garage.id,
    title: 'Временная выставка — демо',
    shortDescription: 'OPEN_DATE с окном дат (createdAt / endDate).',
    description: '<p>Временная экспозиция в рамках демо-сценария. Окно активности задаётся датами относительно запуска сида.</p>',
    category: 'MUSEUM',
    subcategories: ['EXHIBITION'],
    dateMode: 'OPEN_DATE',
    isPermanent: false,
    endDate: addDays(now, 20),
    createdAt: addDays(now, -10),
    imageUrl: IMG2,
    galleryUrls: [IMG],
    priceFrom: rub(500),
    moderationStatus: 'APPROVED',
  });
  await ensurePublishedOverride(temporary.id, museumContentBlocks());
  await ensureEventSubcategoryLink(temporary.id, 'exhibition');
  await upsertManualOffer({
    eventId: temporary.id,
    externalEventId: 'scenario-offer-garage-temporary-std',
    priceFrom: rub(900),
    status: 'ACTIVE',
    isPrimary: true,
    priority: 20,
    externalData: { demoCategory: 'Стандарт' },
  });
  await upsertManualOffer({
    eventId: temporary.id,
    externalEventId: 'scenario-offer-garage-temporary-student',
    priceFrom: rub(500),
    status: 'ACTIVE',
    isPrimary: false,
    priority: 10,
    externalData: { demoCategory: 'Студент' },
  });
  await syncEventPriceFromMin(temporary.id);
  summary.push(`Event ${temporary.slug}`);

  const tour = await ensureManualEvent({
    slug: 'garage-tour-demo',
    cityId: moscow.id,
    venueId: garage.id,
    title: 'Экскурсия по выставке — демо',
    shortDescription: 'SCHEDULED: сеансы (будущие, прошлые, пауза, отмена).',
    description: '<p>Демо экскурсии по залам. В программе площадки участвует как выставка (EXHIBITION + walking).</p>',
    category: 'EXCURSION',
    subcategories: ['EXHIBITION', 'WALKING'],
    dateMode: 'SCHEDULED',
    isPermanent: false,
    endDate: null,
    imageUrl: IMG,
    galleryUrls: [IMG2],
    priceFrom: rub(700),
    moderationStatus: 'APPROVED',
  });
  await ensurePublishedOverride(tour.id, excursionContentBlocks(55.7286, 37.601));
  await ensureEventSubcategoryLink(tour.id, 'exhibition');
  await ensureEventSubcategoryLink(tour.id, 'walking-excursion');

  const tourOfferAdult = await upsertManualOffer({
    eventId: tour.id,
    externalEventId: 'scenario-offer-garage-tour-adult',
    priceFrom: rub(1200),
    status: 'ACTIVE',
    isPrimary: true,
    priority: 30,
    externalData: { demoCategory: 'Взрослый' },
  });
  await upsertManualOffer({
    eventId: tour.id,
    externalEventId: 'scenario-offer-garage-tour-child',
    priceFrom: rub(700),
    status: 'ACTIVE',
    isPrimary: false,
    priority: 20,
    externalData: { demoCategory: 'Детский' },
  });
  await upsertManualOffer({
    eventId: tour.id,
    externalEventId: 'scenario-offer-garage-tour-mini',
    priceFrom: rub(2500),
    status: 'ACTIVE',
    isPrimary: false,
    priority: 10,
    externalData: { demoCategory: 'Мини-группа', groupSize: 3 },
  });
  await syncEventPriceFromMin(tour.id);

  const tourPrices: Prisma.InputJsonValue = [
    { type: 'adult', price: rub(1200) },
    { type: 'child', price: rub(700) },
    { type: 'mini_group', price: rub(2500) },
  ];

  const baseDay = new Date(now);
  baseDay.setHours(0, 0, 0, 0);

  await upsertScenarioSession({
    eventId: tour.id,
    offerId: tourOfferAdult.id,
    tcSessionId: 'scenario-garage-tour-past-1',
    startsAt: atHour(baseDay, -5, 12),
    endsAt: atHour(baseDay, -5, 13, 30),
    prices: tourPrices,
    isActive: true,
    canceledAt: null,
    availableTickets: 0,
    capacityTotal: 40,
  });
  await upsertScenarioSession({
    eventId: tour.id,
    offerId: tourOfferAdult.id,
    tcSessionId: 'scenario-garage-tour-past-2',
    startsAt: atHour(baseDay, -12, 11),
    endsAt: atHour(baseDay, -12, 12, 30),
    prices: tourPrices,
    isActive: true,
    canceledAt: null,
    availableTickets: 0,
    capacityTotal: 40,
  });
  await upsertScenarioSession({
    eventId: tour.id,
    offerId: tourOfferAdult.id,
    tcSessionId: 'scenario-garage-tour-future-1',
    startsAt: atHour(baseDay, 3, 12),
    endsAt: atHour(baseDay, 3, 13, 30),
    prices: tourPrices,
    isActive: true,
    canceledAt: null,
    availableTickets: 18,
    capacityTotal: 25,
  });
  await upsertScenarioSession({
    eventId: tour.id,
    offerId: tourOfferAdult.id,
    tcSessionId: 'scenario-garage-tour-future-2',
    startsAt: atHour(baseDay, 5, 14),
    endsAt: atHour(baseDay, 5, 15, 30),
    prices: tourPrices,
    isActive: true,
    canceledAt: null,
    availableTickets: 30,
    capacityTotal: 30,
  });
  await upsertScenarioSession({
    eventId: tour.id,
    offerId: tourOfferAdult.id,
    tcSessionId: 'scenario-garage-tour-future-3',
    startsAt: atHour(baseDay, 7, 12),
    endsAt: atHour(baseDay, 7, 13, 30),
    prices: tourPrices,
    isActive: true,
    canceledAt: null,
    availableTickets: 25,
    capacityTotal: 30,
  });
  await upsertScenarioSession({
    eventId: tour.id,
    offerId: tourOfferAdult.id,
    tcSessionId: 'scenario-garage-tour-future-4',
    startsAt: atHour(baseDay, 10, 11),
    endsAt: atHour(baseDay, 10, 12, 30),
    prices: tourPrices,
    isActive: true,
    canceledAt: null,
    availableTickets: 20,
    capacityTotal: 30,
  });
  await upsertScenarioSession({
    eventId: tour.id,
    offerId: tourOfferAdult.id,
    tcSessionId: 'scenario-garage-tour-paused',
    startsAt: atHour(baseDay, 14, 12),
    endsAt: atHour(baseDay, 14, 13, 30),
    prices: tourPrices,
    isActive: false,
    canceledAt: null,
    availableTickets: 30,
    capacityTotal: 30,
  });
  await upsertScenarioSession({
    eventId: tour.id,
    offerId: tourOfferAdult.id,
    tcSessionId: 'scenario-garage-tour-cancelled',
    startsAt: atHour(baseDay, 2, 18),
    endsAt: atHour(baseDay, 2, 19, 30),
    prices: tourPrices,
    isActive: true,
    canceledAt: addDays(now, -1),
    availableTickets: 30,
    capacityTotal: 30,
  });
  summary.push(`Event ${tour.slug} (+8 сеансов)`);

  const pastEx = await ensureManualEvent({
    slug: 'garage-past-exhibition-demo',
    cityId: moscow.id,
    venueId: garage.id,
    title: 'Прошедшая выставка — демо',
    shortDescription: 'OPEN_DATE в прошлом — блок past программы.',
    description: '<p>Выставка завершена. Используется для проверки секции past на странице площадки.</p>',
    category: 'MUSEUM',
    subcategories: ['EXHIBITION'],
    dateMode: 'OPEN_DATE',
    isPermanent: false,
    endDate: addDays(now, -10),
    createdAt: addDays(now, -60),
    imageUrl: IMG2,
    galleryUrls: [IMG],
    priceFrom: rub(500),
    moderationStatus: 'APPROVED',
  });
  await ensurePublishedOverride(pastEx.id, museumContentBlocks());
  await ensureEventSubcategoryLink(pastEx.id, 'exhibition');
  await upsertManualOffer({
    eventId: pastEx.id,
    externalEventId: 'scenario-offer-garage-past-std',
    priceFrom: rub(500),
    status: 'ACTIVE',
    isPrimary: true,
    priority: 10,
  });
  await syncEventPriceFromMin(pastEx.id);
  summary.push(`Event ${pastEx.slug}`);

  // ─── Сценарий 2: Музей СПб без программы выставок + входной билет ─────────
  const museumVenue = await ensureVenue({
    slug: 'demo-museum-spb',
    cityId: spb.id,
    title: 'Демо-музей Санкт-Петербург',
    shortDescription: 'Самостоятельная площадка: без дочерних exhibition-events в программе.',
    description:
      'Сценарий для проверки витрины venue без блока программы выставок. Коммерция через отдельное событие «входной билет».',
    address: 'Невский проспект, 1, Санкт-Петербург (выдуманный адрес для демо)',
    venueType: 'MUSEUM',
    lat: 59.9343,
    lng: 30.3062,
    imageUrl: IMG2,
    galleryUrls: [IMG],
    openingHours: { mon: '10:00–18:00', tue: '10:00–18:00', wed: '10:00–21:00', thu: '10:00–18:00', fri: '10:00–18:00', sat: '11:00–19:00', sun: '11:00–19:00' },
    venueTemplateData: {
      visitRules: '<p>Фото без вспышки. Демо-текст правил посещения для шаблона музея.</p>',
    } as Prisma.InputJsonValue,
  });
  await ensureVenueSubcategoryLink(museumVenue.id, 'museum-venue');
  summary.push(`Venue ${museumVenue.slug} (без exhibition-программы)`);

  const museumTicket = await ensureManualEvent({
    slug: 'demo-museum-entry-ticket',
    cityId: spb.id,
    venueId: museumVenue.id,
    title: 'Входной билет в музей — демо',
    shortDescription: 'OPEN_DATE, постоянный вход; отдельный продукт для витрины и мастера события.',
    description:
      '<p>Входной билет с открытой датой. Подкатегория «музей», без EXHIBITION — не попадает в программу выставок площадки.</p>',
    category: 'MUSEUM',
    subcategories: ['MUSEUM_CLASSIC'],
    dateMode: 'OPEN_DATE',
    isPermanent: true,
    endDate: null,
    imageUrl: IMG,
    galleryUrls: [IMG2],
    priceFrom: rub(350),
    moderationStatus: 'APPROVED',
    defaultCapacityTotal: 5000,
  });
  await ensurePublishedOverride(museumTicket.id, museumContentBlocks());
  await ensureEventSubcategoryLink(museumTicket.id, 'museum');

  await upsertManualOffer({
    eventId: museumTicket.id,
    externalEventId: 'scenario-offer-museum-entry-adult',
    priceFrom: rub(700),
    status: 'ACTIVE',
    isPrimary: true,
    priority: 30,
    externalData: { demoCategory: 'Взрослый', oldPrice: rub(900) },
  });
  await upsertManualOffer({
    eventId: museumTicket.id,
    externalEventId: 'scenario-offer-museum-entry-concession',
    priceFrom: rub(350),
    status: 'ACTIVE',
    isPrimary: false,
    priority: 20,
    externalData: { demoCategory: 'Льготный', weekdayRestriction: 'MON-FRI' },
  });
  await upsertManualOffer({
    eventId: museumTicket.id,
    externalEventId: 'scenario-offer-museum-entry-family',
    priceFrom: rub(1800),
    status: 'ACTIVE',
    isPrimary: false,
    priority: 10,
    externalData: { demoCategory: 'Семейный', groupSize: 4, maxPurchasesPerCategory: 2 },
  });
  await syncEventPriceFromMin(museumTicket.id);
  summary.push(`Event ${museumTicket.slug}`);

  // ─── Сценарий 3: Quality lab ───────────────────────────────────────────────
  const lab = await ensureVenue({
    slug: 'quality-lab-venue-demo',
    cityId: moscow.id,
    title: 'Quality Lab — демо-площадка',
    shortDescription: 'Площадка для проверки quality/issues в админке.',
    description: 'Техническая демо-площадка для событий с намеренными дефектами данных.',
    address: 'Москва, демо-адрес quality-lab',
    venueType: 'ART_SPACE',
    lat: 55.75,
    lng: 37.62,
    imageUrl: IMG,
    galleryUrls: [],
  });
  summary.push(`Venue ${lab.slug}`);

  const qNoPrice = await ensureManualEvent({
    slug: 'quality-no-price-demo',
    cityId: moscow.id,
    venueId: lab.id,
    title: 'Событие без цены — демо',
    shortDescription: 'Активный оффер без priceFrom.',
    description: '<p>Ожидается <code>NO_VALID_PRICE</code> при проверке качества.</p>',
    category: 'MUSEUM',
    subcategories: ['EXHIBITION'],
    dateMode: 'OPEN_DATE',
    isPermanent: true,
    endDate: null,
    imageUrl: IMG,
    galleryUrls: [IMG2],
    priceFrom: null,
    moderationStatus: 'APPROVED',
  });
  await ensurePublishedOverride(qNoPrice.id, museumContentBlocks());
  await ensureEventSubcategoryLink(qNoPrice.id, 'exhibition');
  await upsertManualOffer({
    eventId: qNoPrice.id,
    externalEventId: 'scenario-offer-quality-no-price',
    priceFrom: null,
    status: 'ACTIVE',
    isPrimary: true,
    priority: 10,
  });
  summary.push(`Event ${qNoPrice.slug} (NO_VALID_PRICE)`);

  const qNoFuture = await ensureManualEvent({
    slug: 'quality-no-future-sessions-demo',
    cityId: moscow.id,
    venueId: lab.id,
    title: 'Событие без будущих сеансов — демо',
    shortDescription: 'SCHEDULED, только прошлые сеансы.',
    description: '<p>Ожидается <code>NO_FUTURE_SESSIONS</code>.</p>',
    category: 'EXCURSION',
    subcategories: ['EXHIBITION', 'WALKING'],
    dateMode: 'SCHEDULED',
    isPermanent: false,
    endDate: null,
    imageUrl: IMG2,
    galleryUrls: [IMG],
    priceFrom: rub(500),
    moderationStatus: 'APPROVED',
  });
  await ensurePublishedOverride(qNoFuture.id, excursionContentBlocks(55.75, 37.62));
  await ensureEventSubcategoryLink(qNoFuture.id, 'exhibition');
  const qnfOffer = await upsertManualOffer({
    eventId: qNoFuture.id,
    externalEventId: 'scenario-offer-quality-no-future',
    priceFrom: rub(800),
    status: 'ACTIVE',
    isPrimary: true,
    priority: 10,
  });
  const pastOnlyPrices: Prisma.InputJsonValue = [{ type: 'adult', price: rub(800) }];
  await upsertScenarioSession({
    eventId: qNoFuture.id,
    offerId: qnfOffer.id,
    tcSessionId: 'scenario-quality-nf-1',
    startsAt: atHour(baseDay, -20, 10),
    endsAt: atHour(baseDay, -20, 11, 30),
    prices: pastOnlyPrices,
    isActive: true,
    canceledAt: null,
    availableTickets: 0,
    capacityTotal: 20,
  });
  await upsertScenarioSession({
    eventId: qNoFuture.id,
    offerId: qnfOffer.id,
    tcSessionId: 'scenario-quality-nf-2',
    startsAt: atHour(baseDay, -14, 15),
    endsAt: atHour(baseDay, -14, 16, 30),
    prices: pastOnlyPrices,
    isActive: true,
    canceledAt: null,
    availableTickets: 0,
    capacityTotal: 20,
  });
  await upsertScenarioSession({
    eventId: qNoFuture.id,
    offerId: qnfOffer.id,
    tcSessionId: 'scenario-quality-nf-3',
    startsAt: atHour(baseDay, -3, 12),
    endsAt: atHour(baseDay, -3, 13),
    prices: pastOnlyPrices,
    isActive: true,
    canceledAt: null,
    availableTickets: 0,
    capacityTotal: 20,
  });
  await syncEventPriceFromMin(qNoFuture.id);
  summary.push(`Event ${qNoFuture.slug} (NO_FUTURE_SESSIONS)`);

  const qWeak = await ensureManualEvent({
    slug: 'quality-weak-content-demo',
    cityId: moscow.id,
    venueId: lab.id,
    title: 'Слабый контент — демо',
    shortDescription: '—',
    description: '   ',
    category: 'MUSEUM',
    subcategories: ['EXHIBITION'],
    dateMode: 'OPEN_DATE',
    isPermanent: true,
    endDate: null,
    imageUrl: null,
    galleryUrls: [],
    priceFrom: rub(100),
    moderationStatus: 'APPROVED',
  });
  await ensureEventSubcategoryLink(qWeak.id, 'exhibition');
  await prisma.eventOverride.upsert({
    where: { eventId: qWeak.id },
    update: {
      editorStatus: 'PUBLISHED',
      isHidden: false,
      showInVenueProgram: true,
      imageUrl: '',
      description: '   ',
      contentTemplateData: {},
      subcategoriesMode: 'INHERIT',
      subcategoriesOverride: [],
    },
    create: {
      eventId: qWeak.id,
      editorStatus: 'PUBLISHED',
      isHidden: false,
      showInVenueProgram: true,
      imageUrl: '',
      description: '   ',
      contentTemplateData: {},
      subcategoriesMode: 'INHERIT',
      subcategoriesOverride: [],
    },
  });
  await upsertManualOffer({
    eventId: qWeak.id,
    externalEventId: 'scenario-offer-quality-weak',
    priceFrom: rub(100),
    status: 'ACTIVE',
    isPrimary: true,
    priority: 10,
  });
  await syncEventPriceFromMin(qWeak.id);
  summary.push(`Event ${qWeak.slug} (MISSING_DESCRIPTION / MISSING_IMAGE)`);

  const qInactive = await ensureManualEvent({
    slug: 'quality-inactive-offer-demo',
    cityId: moscow.id,
    venueId: lab.id,
    title: 'Неактивные офферы — демо',
    shortDescription: 'Все офферы DISABLED.',
    description: '<p>Ожидается <code>MISSING_ACTIVE_OFFER</code>.</p>',
    category: 'MUSEUM',
    subcategories: ['EXHIBITION'],
    dateMode: 'OPEN_DATE',
    isPermanent: true,
    endDate: null,
    imageUrl: IMG,
    galleryUrls: [IMG2],
    priceFrom: null,
    moderationStatus: 'APPROVED',
  });
  await ensurePublishedOverride(qInactive.id, museumContentBlocks());
  await ensureEventSubcategoryLink(qInactive.id, 'exhibition');
  await upsertManualOffer({
    eventId: qInactive.id,
    externalEventId: 'scenario-offer-quality-inactive-a',
    priceFrom: rub(500),
    status: 'DISABLED',
    isPrimary: true,
    priority: 20,
  });
  await upsertManualOffer({
    eventId: qInactive.id,
    externalEventId: 'scenario-offer-quality-inactive-b',
    priceFrom: rub(400),
    status: 'DISABLED',
    isPrimary: false,
    priority: 10,
  });
  await syncEventPriceFromMin(qInactive.id);
  summary.push(`Event ${qInactive.slug} (MISSING_ACTIVE_OFFER)`);

  // ─── Итог ─────────────────────────────────────────────────────────────────
  console.log('\n=== seed-scenarios: готово ===\n');
  for (const line of summary) {
    console.log(`  • ${line}`);
  }
  console.log('\nПроверка: /venues/garage-moscow-demo, /venues/demo-museum-spb, quality в админке для quality-* slug.\n');
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
