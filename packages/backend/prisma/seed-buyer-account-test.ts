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
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: '../../.env' });

const prisma = new PrismaClient();

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

  const buyerEvent = await prisma.event.upsert({
    where: { slug: 'test-event-buyer-account' },
    update: {},
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
      durationMinutes: 60,
      address: 'Санкт-Петербург',
      priceFrom: 150000,
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1521292270410-a8c53642e9d0?w=400',
      galleryUrls: [],
      moderationStatus: 'APPROVED',
      createdByType: 'ADMIN',
    },
  });
  console.log(`  ✓ Event: ${buyerEvent.title}`);

  const buyerOffer = await prisma.eventOffer.upsert({
    where: {
      source_externalEventId: { source: 'MANUAL', externalEventId: 'seed-buyer-account' },
    },
    update: { eventId: buyerEvent.id },
    create: {
      eventId: buyerEvent.id,
      source: 'MANUAL',
      purchaseType: 'WIDGET',
      externalEventId: 'seed-buyer-account',
      priceFrom: 150000,
      isPrimary: true,
      status: 'ACTIVE',
      priority: 0,
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
        prices: [{ type: 'adult', price: 150000 }],
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
  .finally(() => prisma.$disconnect());
