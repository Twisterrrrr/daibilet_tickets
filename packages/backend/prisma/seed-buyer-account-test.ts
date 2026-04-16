/**
 * Тестовые данные для проверки контура «Мои покупки» (Buyer Account).
 * Создаёт: тестовое событие, оффер, сессию и оплаченный заказ для test.user@daibilet.ru.
 *
 * Запуск: npm run db:seed:buyer-test
 * Требуется: уже созданы пользователи и города (например, после основного seed или миграций).
 *
 * Логин для проверки: test.user@daibilet.ru / TestUser123!
 * После входа откройте «Мои покупки» — должна быть карточка «Тестовое событие для ЛК покупателя».
 */
import * as dotenv from 'dotenv';
import { createScriptPrismaClient } from '../scripts/_prisma';

dotenv.config({ path: '../../.env' });

const { prisma, pool } = createScriptPrismaClient();

async function main() {
  console.log('=== Seed: Buyer Account test (event + user + paid order) ===\n');

  const buyerTestUser = await prisma.user.findUnique({ where: { email: 'test.user@daibilet.ru' } });
  if (!buyerTestUser) {
    console.error('User test.user@daibilet.ru not found. Run main seed first (db:seed) or create the user.');
    process.exit(1);
  }

  let spbCity = await prisma.city.findUnique({ where: { slug: 'saint-petersburg' } });
  if (!spbCity) {
    spbCity = await prisma.city.create({
      data: {
        slug: 'saint-petersburg',
        name: 'Санкт-Петербург',
        description: 'Культурная столица России.',
        lat: 59.9343,
        lng: 30.3351,
        timezone: 'Europe/Moscow',
        metaTitle: 'Экскурсии и билеты в Санкт-Петербурге — Дайбилет',
        metaDescription: 'Билеты на экскурсии и мероприятия в Петербурге.',
        isFeatured: true,
      },
    });
    console.log('  ✓ City saint-petersburg created');
  }

  // Venue: Сквер Достоевского (реальная площадка в СПб)
  const dostoevskyVenue = await prisma.venue.upsert({
    where: { slug: 'skver-dostoevskogo' },
    update: {},
    create: {
      cityId: spbCity.id,
      slug: 'skver-dostoevskogo',
      title: 'Сквер Достоевского',
      normalizedName: 'Сквер Достоевского',
      shortTitle: 'Сквер Достоевского',
      venueType: 'PARK',
      description: 'Зелёный сквер в центре Санкт-Петербурга рядом со станцией метро «Достоевская».',
      address: 'Санкт-Петербург, наб. реки Фонтанки, 114',
      lat: 59.9245,
      lng: 30.3475,
      metro: 'Достоевская',
      isActive: true,
      isFeatured: false,
    },
  });
  console.log('  ✓ Venue: Сквер Достоевского');

  const buyerEvent = await prisma.event.upsert({
    where: { slug: 'test-event-buyer-account' },
    update: {
      venueId: dostoevskyVenue.id,
    },
    create: {
      cityId: spbCity.id,
      source: 'MANUAL',
      tcEventId: 'seed-buyer-account',
      title: 'Тестовое событие для ЛК покупателя',
      slug: 'test-event-buyer-account',
      description:
        'Событие для проверки контура «Мои покупки»: вход под test.user@daibilet.ru, пароль TestUser123!',
      shortDescription: 'Тест ЛК',
      category: 'EXCURSION',
      audience: 'ALL',
      subcategories: ['RIVER'],
      minAge: 0,
      durationMinutes: 60,
      address: 'Санкт-Петербург, наб. реки Фонтанки, 114',
      priceFrom: 150000,
      isActive: true,
      imageUrl:
        'https://images.unsplash.com/photo-1521292270410-a8c53642e9d0?auto=format&fit=crop&w=1600&q=80',
      galleryUrls: [
        'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
      ],
      moderationStatus: 'APPROVED',
      createdByType: 'ADMIN',
    },
  });
  console.log(`  ✓ Event: ${buyerEvent.title}`);

  // Тестовые теги
  const familyTag = await prisma.tag.upsert({
    where: { slug: 'test-family' },
    update: {},
    create: {
      slug: 'test-family',
      name: 'Для всей семьи (тест)',
      category: 'AUDIENCE',
      isActive: true,
    },
  });

  const eveningTag = await prisma.tag.upsert({
    where: { slug: 'test-evening' },
    update: {},
    create: {
      slug: 'test-evening',
      name: 'Вечерняя прогулка (тест)',
      category: 'THEME',
      isActive: true,
    },
  });

  await prisma.eventTag.upsert({
    where: { eventId_tagId: { eventId: buyerEvent.id, tagId: familyTag.id } },
    update: {},
    create: { eventId: buyerEvent.id, tagId: familyTag.id },
  });
  await prisma.eventTag.upsert({
    where: { eventId_tagId: { eventId: buyerEvent.id, tagId: eveningTag.id } },
    update: {},
    create: { eventId: buyerEvent.id, tagId: eveningTag.id },
  });

  const buyerOffer = await prisma.eventOffer.upsert({
    where: {
      source_externalEventId: { source: 'MANUAL', externalEventId: 'seed-buyer-account' },
    },
    update: { eventId: buyerEvent.id, badge: 'hit' },
    create: {
      eventId: buyerEvent.id,
      source: 'MANUAL',
      purchaseType: 'WIDGET',
      externalEventId: 'seed-buyer-account',
      priceFrom: 150000,
      isPrimary: true,
      status: 'ACTIVE',
      priority: 0,
      badge: 'hit',
    },
  });

  const sessionStartsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  sessionStartsAt.setHours(14, 0, 0, 0);
  const sessionEndsAt = new Date(sessionStartsAt.getTime() + 60 * 60 * 1000);
  let buyerSession = await prisma.eventSession.findFirst({
    where: { eventId: buyerEvent.id },
  });
  if (!buyerSession) {
    buyerSession = await prisma.eventSession.create({
      data: {
        eventId: buyerEvent.id,
        offerId: buyerOffer.id,
        tcSessionId: `manual-${buyerEvent.id.slice(0, 8)}`,
        startsAt: sessionStartsAt,
        endsAt: sessionEndsAt,
        availableTickets: 50,
        prices: [
          { type: 'adult', price: 150000 },
          { type: 'child', price: 70000 },
          { type: 'concession', price: 100000 },
        ],
        isActive: true,
      },
    });
    console.log('  ✓ EventSession created');
  }

  const offersSnapshot = [
    {
      eventTitle: buyerEvent.title,
      eventSlug: buyerEvent.slug,
      sessionId: buyerSession.id,
      quantity: 1,
      priceSnapshot: 150000,
    },
  ];
  const totalPrice = 150000;

  let buyerCheckout = await prisma.checkoutSession.findFirst({
    where: { shortCode: 'CS-BUYER-TEST' },
  });
  if (!buyerCheckout) {
    buyerCheckout = await prisma.checkoutSession.create({
      data: {
        shortCode: 'CS-BUYER-TEST',
        userId: buyerTestUser.id,
        cartSnapshot: {},
        validatedSnapshot: {},
        offersSnapshot,
        customerName: buyerTestUser.name ?? 'Test User',
        customerEmail: buyerTestUser.email ?? 'test.user@daibilet.ru',
        status: 'COMPLETED',
        totalPrice,
        completedAt: new Date(),
      },
    });
    console.log('  ✓ CheckoutSession created:', buyerCheckout.shortCode);
  } else {
    await prisma.checkoutSession.update({
      where: { id: buyerCheckout.id },
      data: {
        userId: buyerTestUser.id,
        offersSnapshot,
        totalPrice,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
    console.log('  ✓ CheckoutSession updated:', buyerCheckout.shortCode);
  }

  const existingPayment = await prisma.paymentIntent.findFirst({
    where: { checkoutSessionId: buyerCheckout.id, idempotencyKey: 'seed-buyer-account-payment' },
  });
  if (!existingPayment) {
    await prisma.paymentIntent.create({
      data: {
        checkoutSessionId: buyerCheckout.id,
        idempotencyKey: 'seed-buyer-account-payment',
        amount: totalPrice,
        currency: 'RUB',
        status: 'PAID',
        provider: 'STUB',
        paidAt: new Date(),
      },
    });
    console.log('  ✓ PaymentIntent (PAID) created');
  }

  const existingFulfillment = await prisma.fulfillmentItem.findFirst({
    where: { checkoutSessionId: buyerCheckout.id, lineItemIndex: 0 },
  });
  if (!existingFulfillment) {
    await prisma.fulfillmentItem.create({
      data: {
        checkoutSessionId: buyerCheckout.id,
        lineItemIndex: 0,
        offerId: buyerOffer.id,
        purchaseFlow: 'PLATFORM',
        provider: 'INTERNAL',
        status: 'CONFIRMED',
        amount: totalPrice,
      },
    });
    console.log('  ✓ FulfillmentItem (CONFIRMED) created');
  }

  // Контентные блоки и политика возврата на уровне события (override через EventOverride)
  await prisma.eventOverride.upsert({
    where: { eventId: buyerEvent.id },
    update: {
      subcategoriesOverride: [],
      subcategoriesMode: 'INHERIT',
      contentTemplateData: {
        routeDescription:
          'Отправление от Сквера Достоевского, прогулка по Фонтанке и Неве с видом на разведённые мосты.',
        routeMap: {
          lat: 59.922222,
          lng: 30.339167,
          zoom: 15,
          points: [
            {
              lat: 59.922222,
              lng: 30.339167,
              label: 'Сквер Достоевского — точка сбора',
            },
          ],
        },
        program:
          'Сбор группы в Сквере Достоевского · Инструктаж и посадка на теплоход · Прогулка по маршруту «Ночные мосты» · Фото‑паузы и рассказы гида · Возвращение к месту посадки.',
        menu:
          'Включён приветственный напиток и лёгкие закуски. В баре на борту можно дополнительно заказать горячие напитки и десерты.',
        advantages: [
          'Старт прямо из центра Петербурга — удобно добираться на метро',
          'Комфортный тёплый салон и открытая палуба для фото',
          'Небольшие группы — не будет ощущения «туристического автобуса»',
        ],
        bookingRules:
          'Билет можно перенести один раз не позднее чем за 24 часа до начала сеанса. Для переноса напишите нам на почту, указанную в письме с билетом.',
      },
      refundPolicyMode: 'INHERIT_SUPPLIER',
    },
    create: {
      eventId: buyerEvent.id,
      title: buyerEvent.title,
      subcategoriesOverride: [],
      subcategoriesMode: 'INHERIT',
      contentTemplateData: {
        routeDescription:
          'Отправление от Сквера Достоевского, прогулка по Фонтанке и Неве с видом на разведённые мосты.',
        routeMap: {
          lat: 59.922222,
          lng: 30.339167,
          zoom: 15,
          points: [
            {
              lat: 59.922222,
              lng: 30.339167,
              label: 'Сквер Достоевского — точка сбора',
            },
          ],
        },
        program:
          'Сбор группы в Сквере Достоевского · Инструктаж и посадка на теплоход · Прогулка по маршруту «Ночные мосты» · Фото‑паузы и рассказы гида · Возвращение к месту посадки.',
        menu:
          'Включён приветственный напиток и лёгкие закуски. В баре на борту можно дополнительно заказать горячие напитки и десерты.',
        advantages: [
          'Старт прямо из центра Петербурга — удобно добираться на метро',
          'Комфортный тёплый салон и открытая палуба для фото',
          'Небольшие группы — не будет ощущения «туристического автобуса»',
        ],
        bookingRules:
          'Билет можно перенести один раз не позднее чем за 24 часа до начала сеанса. Для переноса напишите нам на почту, указанную в письме с билетом.',
      },
      refundPolicyMode: 'INHERIT_SUPPLIER',
      isHidden: false,
      editorStatus: 'PUBLISHED',
    },
  });

  // Тестовые отзывы для события
  // Сначала очищаем предыдущие сиды отзывов для этого события, чтобы избежать дубликатов при повторном запуске
  await prisma.review.deleteMany({
    where: { eventId: buyerEvent.id },
  });

  const [review1, review2] = await Promise.all([
    prisma.review.upsert({
      where: {
        authorEmail_eventId_venueId: {
          authorEmail: 'test.reviewer+buyer1@daibilet.ru',
          eventId: buyerEvent.id,
          venueId: dostoevskyVenue.id,
        },
      },
      update: {},
      create: {
        eventId: buyerEvent.id,
        venueId: dostoevskyVenue.id,
        rating: 5,
        title: 'Отличная тестовая прогулка',
        text: 'Очень удобное тестовое событие: быстро нашлось в каталоге, понятные условия, хорошая точка старта. Подходит для ручной проверки интерфейса.',
        authorName: 'Тестовый покупатель',
        authorEmail: 'test.reviewer+buyer1@daibilet.ru',
        isVerified: false,
        status: 'APPROVED',
        publishedAt: new Date(),
      },
    }),
    prisma.review.upsert({
      where: {
        authorEmail_eventId_venueId: {
          authorEmail: 'test.reviewer+buyer2@daibilet.ru',
          eventId: buyerEvent.id,
          venueId: dostoevskyVenue.id,
        },
      },
      update: {},
      create: {
        eventId: buyerEvent.id,
        venueId: dostoevskyVenue.id,
        rating: 4,
        title: 'Хороший кейс для UX‑проверок',
        text: 'Используем это событие для проверки работы ЛК, отзывов и модалки покупки. Всё выглядит реалистично и не мешает реальному каталогу.',
        authorName: 'UX‑исследователь',
        authorEmail: 'test.reviewer+buyer2@daibilet.ru',
        isVerified: false,
        status: 'APPROVED',
        publishedAt: new Date(),
      },
    }),
  ]);

  const reviewPhotosExist = await prisma.reviewPhoto.count({
    where: { reviewId: { in: [review1.id, review2.id] } },
  });

  if (reviewPhotosExist === 0) {
    await prisma.reviewPhoto.createMany({
      data: [
        {
          reviewId: review1.id,
          url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80',
          thumbUrl:
            'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=320&q=70',
          filename: 'seed-review1.webp',
          thumbFilename: 'seed-review1-thumb.webp',
          sortOrder: 0,
        },
        {
          reviewId: review2.id,
          url: 'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?auto=format&fit=crop&w=1400&q=80',
          thumbUrl:
            'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?auto=format&fit=crop&w=320&q=70',
          filename: 'seed-review2.webp',
          thumbFilename: 'seed-review2-thumb.webp',
          sortOrder: 0,
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log('\nГотово. Проверка контура:');
  console.log('  1) Войти на сайт: test.user@daibilet.ru / TestUser123!');
  console.log('  2) Открыть «Мои покупки» — должна быть карточка с билетом.');
  console.log('  3) Трекинг заказа: /orders/track?code=CS-BUYER-TEST');
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
