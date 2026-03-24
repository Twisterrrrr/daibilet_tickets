/**
 * Мягкий backfill нормализации каталога (без изменения публичных контрактов).
 * Запуск: pnpm --filter @daibilet/backend exec npx tsx scripts/catalogBackfill.ts [--apply]
 *
 * - audience: в схеме Prisma поле обязательное с default ALL; скрипт — no-op, логирует аномалии.
 * - category из тегов: для каждого тега события пробуем маппинг source_category_mappings (как CategoryMappingService).
 */

import { EventCategory, Prisma, PrismaClient } from '@prisma/client';

import { normalizeExternalCategory } from '../src/catalog/category-mapping.service';

const prisma = new PrismaClient();

async function findMappedCategory(source: string, externalRaw: string): Promise<EventCategory | null> {
  const norm = normalizeExternalCategory(externalRaw);
  if (!norm) return null;
  const rows = await prisma.$queryRaw<Array<{ internalCategory: EventCategory }>>(Prisma.sql`
    SELECT "internalCategory"
    FROM source_category_mappings
    WHERE source = ${source} AND "externalCategoryNorm" = ${norm}
    LIMIT 1
  `);
  return rows.length > 0 ? rows[0]!.internalCategory : null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const events = await prisma.event.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      source: true,
      category: true,
      audience: true,
      tags: {
        select: {
          tag: { select: { slug: true } },
        },
      },
    },
    take: 50000,
  });

  let categoryUpdates = 0;
  const unresolved: string[] = [];

  for (const e of events) {
    if (e.audience == null) {
      console.warn(JSON.stringify({ msg: 'catalogBackfill.audience_null', eventId: e.id }));
    }

    const source = String(e.source);
    let derived: EventCategory | null = null;
    for (const t of e.tags) {
      const slug = t.tag.slug;
      if (!slug) continue;
      derived = await findMappedCategory(source, slug);
      if (derived) break;
    }

    if (derived && derived !== e.category) {
      if (apply) {
        await prisma.event.update({
          where: { id: e.id },
          data: { category: derived },
        });
        categoryUpdates += 1;
      } else {
        console.log(
          JSON.stringify({
            msg: 'catalogBackfill.would_update_category',
            eventId: e.id,
            from: e.category,
            to: derived,
          }),
        );
      }
    } else if (e.tags.length > 0 && !derived) {
      unresolved.push(e.id);
    }
  }

  console.log(
    JSON.stringify({
      msg: 'catalogBackfill.done',
      apply,
      events: events.length,
      categoryUpdates,
      unresolvedLogged: Math.min(50, unresolved.length),
    }),
  );
  if (unresolved.length > 0 && !apply) {
    console.log(JSON.stringify({ msg: 'catalogBackfill.unresolved_sample', ids: unresolved.slice(0, 50) }));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
