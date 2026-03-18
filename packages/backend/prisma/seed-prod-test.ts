/**
 * Production-safe test data for Gate 0 / Gate 1 prep.
 *
 * Создаёт:
 * - MANUAL событие `test-event-prod` в Санкт-Петербурге с несколькими сеансами;
 * - venue (если отсутствует);
 * - пару отзывов (<10) и фото;
 * - тестового пользователя `test.yookassa@daibilet.ru`;
 * - CheckoutSession + PaymentIntent(PAID, provider='YOOKASSA') + FulfillmentItem(CONFIRMED)
 *   для проверки ЛК / истории заказов / билета.
 *
 * Идемпотентно: повторный запуск не плодит дубли.
 *
 * Запуск (prod, с корректным DATABASE_URL):
 *   cd packages/backend
 *   npx tsx prisma/seed-prod-test.ts
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: '../../.env' });

const prisma = new PrismaClient();

async function main() {
  console.log('=== Seed: Production-safe test data (test-event-prod + test.yookassa@daibilet.ru) ===\n');

  // ── City ─────────────────────────────────────────────────────────────────────
  let spbCity = await prisma.city.findUnique({ where: { slug: 'saint-petersburg' } });
  if (!spbCity) {
    spbCity = await prisma.city.create({
      data: {
        slug: 'saint-petersburg',
        name: 'Санкт-Петербург',
        description:
          'Культурная столица России — город белых ночей, разводных мостов и величественной архитектуры.',
        lat: 59.9343,
        lng: 30.3351,
        timezone: 'Europe/Moscow',
        metaTitle: 'Экскурсии и билеты в Санкт-Петербурге — Дайбилет',
        metaDescription:
          'Билеты на экскурсии, музеи и мероприятия в Петербурге. Прогулки по рекам и каналам, музеи и шоу.',
        isFeatured: true,
      },
    });
    console.log('  ✓ City saint-petersburg created');
  }

  // ── Venue ────────────────────────────────────────────────────────────────────
  const prodVenue = await prisma.venue.upsert({
    where: { slug: 'test-embankment-prod' },
    update: {},
    create: {
      cityId: spbCity.id,
      slug: 'test-embankment-prod',
      title: 'Тестовая набережная (prod)',
      shortTitle: 'Тестовая набережная',
      venueType: 'PARK',
      description: 'Тестовая площадка для проверки билетов и отзывов в production.',
      address: 'Санкт-Петербург, Невская набережная, 1',
      lat: 59.9386,
      lng: 30.3141,
      metro: 'Адмиралтейская',
      isActive: true,
      isFeatured: false,
    },
  });
  console.log('  ✓ Venue test-embankment-prod upserted');

  // ── Event ────────────────────────────────────────────────────────────────────
  const eventSlug = 'test-event-prod';
  const tcEventId = 'seed-prod-test-event';

  const event = await prisma.event.upsert({
    where: { slug: eventSlug },
    update: {
      cityId: spbCity.id,
      venueId: prodVenue.id,
      isActive: true,
      priceFrom: 150000,
    },
    create: {
      cityId: spbCity.id,
      venueId: prodVenue.id,
      source: 'MANUAL',
      tcEventId,
      title: 'Тестовое событие (prod) — прогулка по Неве',
      slug: eventSlug,
      description:
        'Тестовое событие для проверки заказа, оплаты и билета в боевом окружении. Используется только для внутреннего тестирования YooKassa и Личного кабинета.',
      shortDescription: 'Тестовое событие (prod)',
      category: 'EXCURSION',
      audience: 'ALL',
      subcategories: ['RIVER'],
      minAge: 0,
      durationMinutes: 60,
      address: prodVenue.address,
      priceFrom: 150000,
      isActive: true,
      imageUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80',
      galleryUrls: [
        'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?auto=format&fit=crop&w=1400&q=80',
      ],
      moderationStatus: 'APPROVED',
      createdByType: 'ADMIN',
    },
  });
  console.log(`  ✓ Event: ${event.title} (${event.slug})`);

  // ── EventOverride: контент + публикация ─────────────────────────────────────
  await prisma.eventOverride.upsert({
    where: { eventId: event.id },
    update: {
      title: event.title,
      subcategoriesOverride: [],
      subcategoriesMode: 'INHERIT',
      contentTemplateData: {
        routeDescription:
          'Маршрут проходит по Неве с видом на стрелку Васильевского острова, Петропавловскую крепость и Дворцовую набережную.',
        routeMap: {
          lat: prodVenue.lat,
          lng: prodVenue.lng,
          zoom: 14,
          points: [
            {
              lat: prodVenue.lat,
              lng: prodVenue.lng,
              label: 'Место отправления — тестовая набережная',
            },
          ],
        },
        program:
          'Сбор группы у тестовой набережной · Инструктаж и посадка · Прогулка по Неве · Возвращение к месту отправления.',
        menu:
          'Тестовый чай/кофе и лёгкие закуски. Описание используется для проверки отображения на странице события.',
        advantages: [
          'Используется только для внутренних проверок цепочки оплаты и билетов.',
          'Не предназначено для реальной продажи и не рекламируется пользователям.',
        ],
        bookingRules:
          'Это тестовое событие. Информация о возвратах и переносах используется только для проверки интерфейса.',
      },
      refundPolicyMode: 'INHERIT_SUPPLIER',
      isHidden: false,
      editorStatus: 'PUBLISHED',
    },
    create: {
      eventId: event.id,
      title: event.title,
      subcategoriesOverride: [],
      subcategoriesMode: 'INHERIT',
      contentTemplateData: {
        routeDescription:
          'Маршрут проходит по Неве с видом на стрелку Васильевского острова, Петропавловскую крепость и Дворцовую набережную.',
        routeMap: {
          lat: prodVenue.lat,
          lng: prodVenue.lng,
          zoom: 14,
          points: [
            {
              lat: prodVenue.lat,
              lng: prodVenue.lng,
              label: 'Место отправления — тестовая набережная',
            },
          ],
        },
        program:
          'Сбор группы у тестовой набережной · Инструктаж и посадка · Прогулка по Неве · Возвращение к месту отправления.',
        menu:
          'Тестовый чай/кофе и лёгкие закуски. Описание используется для проверки отображения на странице события.',
        advantages: [
          'Используется только для внутренних проверок цепочки оплаты и билетов.',
          'Не предназначено для реальной продажи и не рекламируется пользователям.',
        ],
        bookingRules:
          'Это тестовое событие. Информация о возвратах и переносах используется только для проверки интерфейса.',
      },
      refundPolicyMode: 'INHERIT_SUPPLIER',
      isHidden: false,
      editorStatus: 'PUBLISHED',
    },
  });
  console.log('  ✓ EventOverride for test-event-prod ensured (PUBLISHED)');

  // ── Offer ───────────────────────────────────────────────────────────────────
  const offer = await prisma.eventOffer.upsert({
    where: {
      source_externalEventId: { source: 'MANUAL', externalEventId: tcEventId },
    },
    update: {
      eventId: event.id,
      priceFrom: 150000,
      status: 'ACTIVE',
      isPrimary: true,
    },
    create: {
      eventId: event.id,
      source: 'MANUAL',
      purchaseType: 'WIDGET',
      externalEventId: tcEventId,
      priceFrom: 150000,
      isPrimary: true,
      status: 'ACTIVE',
      priority: 0,
      badge: 'hit',
    },
  });
  console.log('  ✓ EventOffer for test-event-prod upserted');

  // ── EventSessions ───────────────────────────────────────────────────────────
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const sessionTimes = [11, 15, 19] as const;

  function nextSession(offsetDays: number, hour: number): { startsAt: Date; endsAt: Date } {
    const d = new Date(base);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, 0, 0, 0);
    const startsAt = new Date(d);
    const endsAt = new Date(d.getTime() + 60 * 60 * 1000);
    return { startsAt, endsAt };
  }

  const prices = [
    { type: 'adult', price: 150000 },
    { type: 'child', price: 70000 },
    { type: 'concession', price: 100000 },
  ] as const;

  const sessionsToEnsure: { startsAt: Date; endsAt: Date }[] = [];
  for (let day = 1; day <= 3; day += 1) {
    for (const h of sessionTimes) {
      sessionsToEnsure.push(nextSession(day, h));
    }
  }

  for (const slot of sessionsToEnsure) {
    await prisma.eventSession.upsert({
      where: {
        eventId_startsAt: {
          eventId: event.id,
          startsAt: slot.startsAt,
        },
      },
      update: {
        offerId: offer.id,
        endsAt: slot.endsAt,
        availableTickets: 30,
        capacityTotal: 30,
        prices,
        isActive: true,
        canceledAt: null,
      },
      create: {
        eventId: event.id,
        offerId: offer.id,
        tcSessionId: `manual-prod-${event.id.slice(0, 8)}-${slot.startsAt.getTime()}`,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        availableTickets: 30,
        capacityTotal: 30,
        prices,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ EventSessions ensured: ${sessionsToEnsure.length}`);

  // ── Reviews (<10) ──────────────────────────────────────────────────────────
  const [r1, r2] = await Promise.all([
    prisma.review.upsert({
      where: {
        authorEmail_eventId_venueId: {
          authorEmail: 'test.reviewer+prod1@daibilet.ru',
          eventId: event.id,
          venueId: prodVenue.id,
        },
      },
      update: {},
      create: {
        eventId: event.id,
        venueId: prodVenue.id,
        rating: 5,
        title: 'Отличный тестовый рейс',
        text: 'Используем это событие, чтобы проверить отображение отзывов, рейтинга и карточки события в боевом окружении.',
        authorName: 'Тестовый покупатель (prod)',
        authorEmail: 'test.reviewer+prod1@daibilet.ru',
        isVerified: false,
        status: 'APPROVED',
        publishedAt: new Date(),
      },
    }),
    prisma.review.upsert({
      where: {
        authorEmail_eventId_venueId: {
          authorEmail: 'test.reviewer+prod2@daibilet.ru',
          eventId: event.id,
          venueId: prodVenue.id,
        },
      },
      update: {},
      create: {
        eventId: event.id,
        venueId: prodVenue.id,
        rating: 4,
        title: 'Реалистичный тестовый сценарий',
        text: 'Этот отзыв помогает проверить поведение псевдорейтинга и работу раздела «Отзывы» на странице события.',
        authorName: 'Продакт-менеджер',
        authorEmail: 'test.reviewer+prod2@daibilet.ru',
        isVerified: false,
        status: 'APPROVED',
        publishedAt: new Date(),
      },
    }),
  ]);

  const photosCount = await prisma.reviewPhoto.count({
    where: { reviewId: { in: [r1.id, r2.id] } },
  });
  if (photosCount === 0) {
    await prisma.reviewPhoto.createMany({
      data: [
        {
          reviewId: r1.id,
          url: 'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?auto=format&fit=crop&w=1400&q=80',
          thumbUrl:
            'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?auto=format&fit=crop&w=320&q=70',
          filename: 'seed-prod-review1.webp',
          thumbFilename: 'seed-prod-review1-thumb.webp',
          sortOrder: 0,
        },
        {
          reviewId: r2.id,
          url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80',
          thumbUrl:
            'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=320&q=70',
          filename: 'seed-prod-review2.webp',
          thumbFilename: 'seed-prod-review2-thumb.webp',
          sortOrder: 0,
        },
      ],
      skipDuplicates: true,
    });
  }
  console.log('  ✓ Reviews (<10) ensured for test-event-prod');

  // ── Test user + checkout chain ─────────────────────────────────────────────
  const userEmail = 'test.yookassa@daibilet.ru';
  const passwordHash = await bcrypt.hash('TestUser123!', 10);

  const testUser = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      name: 'Test YooKassa User',
      passwordHash,
      isActive: true,
    },
  });
  console.log(`  ✓ Test user upserted: ${testUser.email}`);

  // Берём один из ближайших сеансов
  const anySession = await prisma.eventSession.findFirst({
    where: { eventId: event.id, isActive: true },
    orderBy: { startsAt: 'asc' },
  });

  if (!anySession) {
    throw new Error('No EventSession found for test-event-prod');
  }

  const offersSnapshot = [
    {
      eventTitle: event.title,
      eventSlug: event.slug,
      sessionId: anySession.id,
      quantity: 1,
      priceSnapshot: 150000,
    },
  ];
  const totalPrice = 150000;

  let checkout = await prisma.checkoutSession.findFirst({
    where: { shortCode: 'CS-PROD-TEST' },
  });
  if (!checkout) {
    checkout = await prisma.checkoutSession.create({
      data: {
        shortCode: 'CS-PROD-TEST',
        userId: testUser.id,
        cartSnapshot: {},
        validatedSnapshot: {},
        offersSnapshot,
        customerName: testUser.name ?? 'Test YooKassa User',
        customerEmail: testUser.email ?? userEmail,
        status: 'COMPLETED',
        totalPrice,
        completedAt: new Date(),
      },
    });
  } else {
    checkout = await prisma.checkoutSession.update({
      where: { id: checkout.id },
      data: {
        userId: testUser.id,
        offersSnapshot,
        totalPrice,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }
  console.log(`  ✓ CheckoutSession ensured: ${checkout.shortCode}`);

  const existingPayment = await prisma.paymentIntent.findFirst({
    where: {
      checkoutSessionId: checkout.id,
      idempotencyKey: 'seed-prod-yookassa-payment',
    },
  });
  if (!existingPayment) {
    await prisma.paymentIntent.create({
      data: {
        checkoutSessionId: checkout.id,
        idempotencyKey: 'seed-prod-yookassa-payment',
        amount: totalPrice,
        currency: 'RUB',
        status: 'PAID',
        provider: 'YOOKASSA', // семантически готово к Gate 1; реальных запросов к YooKassa нет
        paidAt: new Date(),
      },
    });
    console.log('  ✓ PaymentIntent (PAID, provider=YOOKASSA) created');
  } else {
    console.log('  ✓ PaymentIntent already exists, skipping create');
  }

  const existingFulfillment = await prisma.fulfillmentItem.findFirst({
    where: { checkoutSessionId: checkout.id, lineItemIndex: 0 },
  });
  if (!existingFulfillment) {
    await prisma.fulfillmentItem.create({
      data: {
        checkoutSessionId: checkout.id,
        lineItemIndex: 0,
        offerId: offer.id,
        purchaseFlow: 'PLATFORM',
        provider: 'INTERNAL',
        status: 'CONFIRMED',
        amount: totalPrice,
      },
    });
    console.log('  ✓ FulfillmentItem (CONFIRMED) created');
  } else {
    console.log('  ✓ FulfillmentItem already exists, skipping create');
  }

  console.log('\nГотово. Prod-safe тестовый сценарий:');
  console.log('  - Событие: /events/test-event-prod');
  console.log('  - Пользователь: test.yookassa@daibilet.ru / TestUser123!');
  console.log('  - ЛК: /account (после логина) → покупки / билеты / трекинг CS-PROD-TEST');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

