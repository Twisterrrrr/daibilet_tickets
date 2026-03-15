import { PrismaClient, ReviewStatus, ReviewDisputeStatus, ReviewDisputeReasonCode, ReviewSupplierResponseStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding supplier demo reviews (standalone script)...');

  const operator = await prisma.operator.findUnique({
    where: { slug: 'test-supplier' },
  });

  if (!operator) {
    console.error('❌ Operator with slug=test-supplier not found');
    return;
  }

  console.log(`  operatorId=${operator.id}`);

  const nightCruise = await prisma.event.findUnique({
    where: { slug: 'night-cruise-neva-test' },
  });
  const dayCruise = await prisma.event.findUnique({
    where: { slug: 'day-walking-tour-test' },
  });

  if (!nightCruise) {
    console.error('❌ Event night-cruise-neva-test not found');
  }
  if (!dayCruise) {
    console.error('❌ Event day-walking-tour-test not found');
  }

  if (!nightCruise) {
    return;
  }

  // Базовые отзывы (id авто‑UUID), idempotent через authorEmail+eventId.
  await prisma.review.createMany({
    data: [
      {
        eventId: nightCruise.id,
        supplierId: operator.id,
        rating: 5,
        title: 'Отличная прогулка',
        text: 'Очень понравилась ночная прогулка: комфортный теплоход, внимательный гид и красивая подсветка города.',
        authorName: 'Анна Путешественница',
        authorEmail: 'supplier.demo+positive@daibilet.ru',
        isVerified: true,
        voucherCode: 'DEMO-001',
        helpfulCount: 3,
        status: ReviewStatus.APPROVED,
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        eventId: nightCruise.id,
        supplierId: operator.id,
        rating: 2,
        title: 'Неудачная погода',
        text: 'Во время прогулки шёл дождь и было ветрено, хотелось бы заранее предупреждения об условиях.',
        authorName: 'Игорь',
        authorEmail: 'supplier.demo+needs-response@daibilet.ru',
        isVerified: false,
        helpfulCount: 0,
        status: ReviewStatus.APPROVED,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        eventId: nightCruise.id,
        supplierId: operator.id,
        rating: 4,
        title: 'Красиво, но многолюдно',
        text: 'Маршрут понравился, но хотелось бы меньше людей на борту в высокий сезон.',
        authorName: 'Мария',
        authorEmail: 'supplier.demo+responded@daibilet.ru',
        isVerified: true,
        helpfulCount: 1,
        status: ReviewStatus.APPROVED,
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      ...(dayCruise
        ? [
            {
              eventId: dayCruise.id,
              supplierId: operator.id,
              rating: 2,
              title: 'Не совпало с описанием',
              text: 'В отзыве указано, что прогулка длилась всего 30 минут, хотя фактически рейс стандартный — 1,5 часа.',
              authorName: 'Пользователь',
              authorEmail: 'supplier.demo+disputed@daibilet.ru',
              isVerified: true,
              helpfulCount: 0,
              status: ReviewStatus.APPROVED,
              publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            },
          ]
        : []),
    ],
    skipDuplicates: true,
  });

  const respondedReview = await prisma.review.findFirst({
    where: { eventId: nightCruise.id, authorEmail: 'supplier.demo+responded@daibilet.ru' },
  });
  if (!respondedReview) {
    console.error('❌ respondedReview not found');
    return;
  }

  await prisma.reviewSupplierResponse.upsert({
    where: { reviewId: respondedReview.id },
    update: {
      text: 'Спасибо за отзыв! В пиковые даты действительно бывает много гостей, мы уже добавили дополнительные рейсы, чтобы уменьшить загрузку.',
      status: ReviewSupplierResponseStatus.APPROVED,
      moderatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    create: {
      reviewId: respondedReview.id,
      supplierId: operator.id,
      text: 'Спасибо за отзыв! В пиковые даты действительно бывает много гостей, мы уже добавили дополнительные рейсы, чтобы уменьшить загрузку.',
      status: ReviewSupplierResponseStatus.APPROVED,
      moderatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  // 4) Отзыв с открытым оспариванием
  if (dayCruise) {
    const disputedReview = await prisma.review.findFirst({
      where: { eventId: dayCruise.id, authorEmail: 'supplier.demo+disputed@daibilet.ru' },
    });
    if (!disputedReview) {
      console.error('❌ disputedReview not found');
    } else {
    await prisma.reviewDispute.upsert({
        where: { reviewId: disputedReview.id },
        update: {
          status: ReviewDisputeStatus.MODERATOR_REVIEW,
          reasonCode: ReviewDisputeReasonCode.FALSE_FACTS,
          claimText:
            'Гость неверно указал продолжительность рейса. По навигационным данным и расписанию рейс прошёл в стандартном временном интервале.',
          supplierConfirmedTruth: true,
        },
        create: {
          reviewId: disputedReview.id,
          supplierId: operator.id,
          status: ReviewDisputeStatus.MODERATOR_REVIEW,
          reasonCode: ReviewDisputeReasonCode.FALSE_FACTS,
          claimText:
            'Гость неверно указал продолжительность рейса. По навигационным данным и расписанию рейс прошёл в стандартном временном интервале.',
          supplierConfirmedTruth: true,
        },
      });
    }
  }

  const total = await prisma.review.count({ where: { supplierId: operator.id } });
  console.log(`  ✓ Supplier demo reviews seeded via standalone script, count=${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

