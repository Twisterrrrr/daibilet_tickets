/**
 * Backfill normalizedTitle и groupingKey (формат v1::) для событий,
 * где groupingKey IS NULL или groupingKey NOT LIKE 'v1::%'.
 *
 * Запуск:
 *   cd packages/backend && npx tsx scripts/backfill-event-grouping.ts
 *   cd packages/backend && npx tsx scripts/backfill-event-grouping.ts --dry-run
 *
 * После backfill повторить диагностику:
 *   SELECT COUNT(*) FROM events WHERE "groupingKey" IS NULL;        -- должно быть 0
 *   SELECT COUNT(*) FROM events WHERE "groupingKey" NOT LIKE 'v1::%'; -- должно быть 0
 */
import { PrismaClient } from '@prisma/client';
import { normalizeEventTitle } from '@daibilet/shared';

const BATCH_SIZE = 100;
const prisma = new PrismaClient();

function buildGroupingKey(
  category: string,
  normalizedTitle: string,
  durationMinutes: number | null,
  minAge: number | null,
): string | null {
  if (!normalizedTitle || !category) return null;
  const duration = durationMinutes != null && durationMinutes > 0 ? String(durationMinutes) : 'na';
  const age = minAge ?? 0;
  return `v1::${category}::${normalizedTitle}::${duration}::${age}`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('=== DRY RUN: изменения не будут записаны ===\n');
  }

  // События для backfill: groupingKey IS NULL или NOT LIKE 'v1::%'
  const where = {
    OR: [
      { groupingKey: null },
      { groupingKey: { not: { startsWith: 'v1::' } } },
    ],
  };

  const total = await prisma.event.count({ where });
  console.log(`Найдено событий для backfill: ${total}`);

  if (total === 0) {
    console.log('Backfill не требуется.');
    return;
  }

  let updated = 0;
  let offset = 0;

  while (true) {
    const batch = await prisma.event.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        durationMinutes: true,
        minAge: true,
        normalizedTitle: true,
        groupingKey: true,
      },
      take: BATCH_SIZE,
      skip: offset,
      orderBy: { id: 'asc' },
    });

    if (batch.length === 0) break;

    for (const e of batch) {
      const title = e.title ?? '';
      const computedNorm = title ? normalizeEventTitle(title).toLowerCase() : '';
      // Используем computed или сохранённый normalizedTitle (fallback для edge-cases)
      const normalizedTitle = computedNorm || (e.normalizedTitle ?? '').toLowerCase() || '';
      const groupingKey = buildGroupingKey(
        e.category,
        normalizedTitle,
        e.durationMinutes,
        e.minAge ?? 0,
      );

      const needsUpdate =
        (e.normalizedTitle ?? '') !== normalizedTitle ||
        (groupingKey != null && e.groupingKey !== groupingKey) ||
        (groupingKey == null && e.groupingKey != null);

      if (!needsUpdate) continue;

      if (!dryRun) {
        await prisma.event.update({
          where: { id: e.id },
          data: {
            normalizedTitle: normalizedTitle || null,
            groupingKey,
          },
        });
      }
      updated++;
    }

    offset += batch.length;
    process.stdout.write(`\rОбработано: ${Math.min(offset, total)} / ${total}`);
    if (batch.length < BATCH_SIZE) break;
  }

  console.log(`\n\nОбновлено записей: ${updated}${dryRun ? ' (dry-run)' : ''}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
