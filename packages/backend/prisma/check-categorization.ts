#!/usr/bin/env npx ts-node
/**
 * Скрипт проверки категоризации событий.
 * Выводит подозрительные случаи для ручной проверки:
 * - STANDUP в MUSEUM (должно быть EVENT)
 * - MASTERCLASS в MUSEUM (мастер-класс обычно EVENT)
 * - RIVER без маршрута (templateData.route в override)
 * - EXCURSION без подкатегорий
 *
 * Запуск: pnpm exec ts-node prisma/check-categorization.ts
 * Или: pnpm check:categorization (если добавлен в package.json)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Проверка категоризации событий ===\n');

  // 1. STANDUP в MUSEUM
  const standupInMuseum = await prisma.event.findMany({
    where: {
      isDeleted: false,
      category: 'MUSEUM',
      subcategories: { has: 'STANDUP' },
    },
    select: { id: true, slug: true, title: true, category: true, subcategories: true },
  });
  if (standupInMuseum.length > 0) {
    console.log('1. STANDUP в MUSEUM (должно быть EVENT):');
    standupInMuseum.forEach((e) =>
      console.log(`   - ${e.slug} | ${e.title} | subcats: ${e.subcategories.join(', ')}`)
    );
    console.log(`   Всего: ${standupInMuseum.length}\n`);
  } else {
    console.log('1. STANDUP в MUSEUM: нет подозрительных\n');
  }

  // 2. MASTERCLASS в MUSEUM
  const masterclassInMuseum = await prisma.event.findMany({
    where: {
      isDeleted: false,
      category: 'MUSEUM',
      subcategories: { has: 'MASTERCLASS' },
    },
    select: { id: true, slug: true, title: true, category: true, subcategories: true },
  });
  if (masterclassInMuseum.length > 0) {
    console.log('2. MASTERCLASS в MUSEUM (часто должен быть EVENT):');
    masterclassInMuseum.forEach((e) =>
      console.log(`   - ${e.slug} | ${e.title} | subcats: ${e.subcategories.join(', ')}`)
    );
    console.log(`   Всего: ${masterclassInMuseum.length}\n`);
  } else {
    console.log('2. MASTERCLASS в MUSEUM: нет подозрительных\n');
  }

  // 3. RIVER без маршрута (override.templateData.route)
  const riverEvents = await prisma.event.findMany({
    where: {
      isDeleted: false,
      subcategories: { has: 'RIVER' },
    },
    select: { id: true, slug: true, title: true },
  });
  const overrides = await prisma.eventOverride.findMany({
    where: { eventId: { in: riverEvents.map((e) => e.id) } },
    select: { eventId: true, templateData: true },
  });
  const overrideMap = new Map(overrides.map((o) => [o.eventId, o.templateData]));
  const riverWithoutRoute = riverEvents.filter((e) => {
    const td = overrideMap.get(e.id) as Record<string, unknown> | null | undefined;
    const route = td && typeof td === 'object' && 'route' in td ? td.route : null;
    return !route || (typeof route === 'string' && !route.trim());
  });
  if (riverWithoutRoute.length > 0) {
    console.log('3. RIVER без маршрута (templateData.route в override):');
    riverWithoutRoute.forEach((e) => console.log(`   - ${e.slug} | ${e.title}`));
    console.log(`   Всего: ${riverWithoutRoute.length}\n`);
  } else {
    console.log('3. RIVER без маршрута: нет подозрительных\n');
  }

  // 4. EXCURSION без подкатегорий
  const excursionNoSub = await prisma.event.findMany({
    where: {
      isDeleted: false,
      category: 'EXCURSION',
      OR: [{ subcategories: { equals: [] } }, { subcategories: { equals: null } }],
    },
    select: { id: true, slug: true, title: true },
  });
  if (excursionNoSub.length > 0) {
    console.log('4. EXCURSION без подкатегорий:');
    excursionNoSub.forEach((e) => console.log(`   - ${e.slug} | ${e.title}`));
    console.log(`   Всего: ${excursionNoSub.length}\n`);
  } else {
    console.log('4. EXCURSION без подкатегорий: нет подозрительных\n');
  }

  // 5. MUSEUM без подкатегорий
  const museumNoSub = await prisma.event.findMany({
    where: {
      isDeleted: false,
      category: 'MUSEUM',
      OR: [{ subcategories: { equals: [] } }, { subcategories: { equals: null } }],
    },
    select: { id: true, slug: true, title: true },
  });
  if (museumNoSub.length > 0) {
    console.log('5. MUSEUM без подкатегорий:');
    museumNoSub.forEach((e) => console.log(`   - ${e.slug} | ${e.title}`));
    console.log(`   Всего: ${museumNoSub.length}\n`);
  } else {
    console.log('5. MUSEUM без подкатегорий: нет подозрительных\n');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
