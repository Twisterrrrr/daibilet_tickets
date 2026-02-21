/**
 * Seed: Query Filters (QF) — справочник быстрых фильтров для каталога.
 * Запуск: DATABASE_URL=... npx tsx prisma/seed-query-filters.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QueryFilterDef {
  type: string;
  group: string;
  slug: string;
  title: string;
  isSeo: boolean;
  priority: number;
}

const FILTERS: QueryFilterDef[] = [
  /* ================== EXCURSIONS ================== */
  { type: 'excursion', group: 'format', slug: 'walking', title: 'Пешеходная', isSeo: true, priority: 10 },
  { type: 'excursion', group: 'format', slug: 'bus', title: 'Автобусная', isSeo: true, priority: 9 },
  { type: 'excursion', group: 'format', slug: 'boat', title: 'Теплоходная', isSeo: true, priority: 8 },
  { type: 'excursion', group: 'theme', slug: 'sightseeing', title: 'Обзорная', isSeo: true, priority: 10 },
  { type: 'excursion', group: 'theme', slug: 'history', title: 'Историческая', isSeo: true, priority: 9 },
  { type: 'excursion', group: 'theme', slug: 'mystic', title: 'Мистическая', isSeo: true, priority: 6 },
  { type: 'excursion', group: 'duration', slug: 'up-to-2h', title: 'До 2 часов', isSeo: false, priority: 5 },
  { type: 'excursion', group: 'duration', slug: '2-4h', title: '2–4 часа', isSeo: false, priority: 4 },
  { type: 'excursion', group: 'audience', slug: 'with-children', title: 'С детьми', isSeo: true, priority: 8 },

  /* ================== VENUES (МУЗЕИ) ================== */
  { type: 'venue', group: 'type', slug: 'historical', title: 'Исторический музей', isSeo: true, priority: 10 },
  { type: 'venue', group: 'type', slug: 'art', title: 'Художественный музей', isSeo: true, priority: 9 },
  { type: 'venue', group: 'type', slug: 'interactive', title: 'Интерактивный музей', isSeo: true, priority: 8 },
  { type: 'venue', group: 'visit-format', slug: 'ticket-only', title: 'Входной билет', isSeo: false, priority: 5 },
  { type: 'venue', group: 'visit-format', slug: 'with-guide', title: 'С экскурсией', isSeo: true, priority: 6 },
  { type: 'venue', group: 'audience', slug: 'family', title: 'Для всей семьи', isSeo: true, priority: 7 },

  /* ================== EVENTS (МЕРОПРИЯТИЯ) ================== */
  { type: 'event', group: 'category', slug: 'concert', title: 'Концерт', isSeo: true, priority: 10 },
  { type: 'event', group: 'category', slug: 'theatre', title: 'Театр', isSeo: true, priority: 9 },
  { type: 'event', group: 'category', slug: 'festival', title: 'Фестиваль', isSeo: true, priority: 8 },
  { type: 'event', group: 'genre', slug: 'rock', title: 'Рок', isSeo: true, priority: 7 },
  { type: 'event', group: 'genre', slug: 'classical', title: 'Классика', isSeo: true, priority: 6 },
  { type: 'event', group: 'audience', slug: '18plus', title: '18+', isSeo: false, priority: 3 },
];

async function main() {
  console.log('Seeding query filters...');

  for (const f of FILTERS) {
    await prisma.queryFilter.upsert({
      where: { slug_type: { slug: f.slug, type: f.type } },
      update: { group: f.group, title: f.title, isSeo: f.isSeo, priority: f.priority },
      create: f,
    });
  }

  console.log(`  ✓ ${FILTERS.length} query filters`);
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
