/**
 * Data migration: создать EventOffer для каждого существующего Event
 * и проставить offerId в EventSession.
 *
 * Запуск: npx ts-node prisma/seed-offers.ts
 * (или через npx tsx prisma/seed-offers.ts)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Data migration: Event → EventOffer ===\n');

  // 1. Получить все события, у которых ещё нет offer
  const eventsWithoutOffer = await prisma.event.findMany({
    where: {
      offers: { none: {} },
    },
    select: {
      id: true,
      source: true,
      tcEventId: true,
      tcMetaEventId: true,
      priceFrom: true,
      tcData: true,
    },
  });

  console.log(`Событий без offer: ${eventsWithoutOffer.length}`);

  if (eventsWithoutOffer.length === 0) {
    console.log('Все события уже имеют offer. Пропуск.');
    return;
  }

  let created = 0;
  let sessionsUpdated = 0;

  for (const event of eventsWithoutOffer) {
    // Определяем source → OfferSource и PurchaseType
    const offerSource = event.source === 'TEPLOHOD' ? 'TEPLOHOD' : 'TC';
    const purchaseType = event.source === 'TEPLOHOD' ? 'REDIRECT' : 'TC_WIDGET';
    const deeplink =
      event.source === 'TEPLOHOD' && event.tcEventId
        ? `https://teplohod.info/event/${event.tcEventId.replace('tep-', '')}`
        : null;

    // Создать EventOffer
    const offer = await prisma.eventOffer.create({
      data: {
        eventId: event.id,
        source: offerSource as any,
        purchaseType: purchaseType as any,
        externalEventId: event.tcEventId,
        metaEventId: event.tcMetaEventId,
        deeplink,
        priceFrom: event.priceFrom,
        isPrimary: true,
        status: 'ACTIVE',
        priority: 0,
        externalData: event.tcData ?? undefined,
        lastSyncAt: new Date(),
      },
    });
    created++;

    // Проставить offerId в сессиях этого события
    const result = await prisma.eventSession.updateMany({
      where: { eventId: event.id, offerId: null },
      data: { offerId: offer.id },
    });
    sessionsUpdated += result.count;

    if (created % 100 === 0) {
      console.log(`  ...создано ${created} offers, обновлено ${sessionsUpdated} sessions`);
    }
  }

  console.log(`\nГотово:`);
  console.log(`  Создано offers: ${created}`);
  console.log(`  Обновлено sessions (offerId): ${sessionsUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
