/**
 * Добавляет сеансы и три категории билетов для события test-event-buyer-account.
 * Цены: взрослый 1500₽, детский 700₽, льготный 1000₽ (в копейках: 150000, 70000, 100000).
 *
 * Запуск: pnpm --filter @daibilet/backend db:seed:event-sessions-test
 * Требуется: событие test-event-buyer-account уже существует (например после db:seed:buyer-test).
 */
import * as dotenv from 'dotenv';
import { createScriptPrismaClient } from '../scripts/_prisma';

dotenv.config({ path: '../../.env' });

const { prisma, pool } = createScriptPrismaClient();

const PRICES = [
  { type: 'adult', price: 150000 }, // 1500₽
  { type: 'child', price: 70000 }, // 700₽
  { type: 'concession', price: 100000 }, // 1000₽ (льготный)
] as const;

function nextSessionTime(base: Date, dayOffset: number, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log('=== Seed: Сеансы + 3 категории билетов для test-event-buyer-account ===\n');

  const event = await prisma.event.findUnique({
    where: { slug: 'test-event-buyer-account' },
    include: { offers: { where: { status: 'ACTIVE' }, take: 1 } },
  });

  if (!event) {
    console.error('Событие test-event-buyer-account не найдено. Сначала выполните: pnpm --filter @daibilet/backend db:seed:buyer-test');
    process.exit(1);
  }

  const offer = event.offers[0];
  if (!offer) {
    console.error('У события нет активного оффера.');
    process.exit(1);
  }

  const base = new Date();
  base.setHours(0, 0, 0, 0);

  const slots: { startsAt: Date; endsAt: Date }[] = [];

  // Первые 5 дней — несколько слотов в день для UI слотов
  for (const [dayOffset, hours] of [
    [1, [10, 14, 18]] as const,
    [2, [10, 13, 19]] as const,
    [3, [9, 12, 19]] as const,
    [4, [10, 15, 19]] as const,
    [5, [10, 14, 21]] as const,
  ]) {
    for (const h of hours) {
      slots.push({
        startsAt: nextSessionTime(base, dayOffset, h, 0),
        endsAt: nextSessionTime(base, dayOffset, h + 1, 0),
      });
    }
  }

  // Далее — по одному слоту на каждый день до 30-го, чтобы в мини-календаре было 30 разных дат
  for (let day = 6; day <= 30; day += 1) {
    slots.push({
      startsAt: nextSessionTime(base, day, 19, 0),
      endsAt: nextSessionTime(base, day, 20, 0),
    });
  }

  for (const slot of slots) {
    await prisma.eventSession.upsert({
      where: {
        eventId_startsAt: { eventId: event.id, startsAt: slot.startsAt },
      },
      update: {
        prices: PRICES,
        availableTickets: 50,
        capacityTotal: 50,
        isActive: true,
        canceledAt: null,
        offerId: offer.id,
      },
      create: {
        eventId: event.id,
        offerId: offer.id,
        tcSessionId: `manual-${event.id.slice(0, 8)}-${slot.startsAt.getTime()}`,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        availableTickets: 50,
        capacityTotal: 50,
        prices: PRICES,
        isActive: true,
      },
    });
  }

  const minPrice = 70000; // детский 700₽
  await prisma.event.update({
    where: { id: event.id },
    data: { priceFrom: minPrice },
  });

  await prisma.eventOffer.update({
    where: { id: offer.id },
    data: { priceFrom: minPrice },
  });

  console.log(`  ✓ Событие: ${event.title}`);
  console.log(`  ✓ Оффер: ${offer.id}`);
  console.log(`  ✓ Сеансов: ${slots.length} (несколько дат и временных слотов)`);
  console.log(`  ✓ Категории билетов: взрослый 1500₽, детский 700₽, льготный 1000₽`);
  console.log(`  ✓ priceFrom события и оффера: 700₽`);
  console.log('\nГотово. Страница: http://localhost:3000/events/test-event-buyer-account');
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
