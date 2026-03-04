/**
 * Автосоздание EventGroup из агрегатов events (по groupingKey).
 * Slug источник: normalizedTitle (стабильнее title). Slug неизменяем при обновлении.
 *
 * Запуск:
 *   cd packages/backend && npx tsx scripts/auto-create-event-groups.ts
 *   cd packages/backend && npx tsx scripts/auto-create-event-groups.ts --dry-run
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function transliterate(text: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
    и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return text
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Slug из normalizedTitle (стабильнее title) */
function baseSlug(normalizedTitle: string, fallbackTitle: string): string {
  const src = normalizedTitle || transliterate(fallbackTitle);
  return transliterate(src).slice(0, 80) || 'event-group';
}

async function ensureUniqueSlug(
  base: string,
  groupingKey: string,
  excludeGroupId: string | null,
): Promise<string> {
  let slug = base;
  let suffix = 0;
  for (;;) {
    const [inGroups, inEvents] = await Promise.all([
      prisma.eventGroup.findFirst({
        where: {
          slug,
          ...(excludeGroupId ? { id: { not: excludeGroupId } } : {}),
        },
      }),
      prisma.event.findFirst({ where: { slug }, select: { id: true } }),
    ]);
    if (!inGroups && !inEvents) return slug;
    suffix++;
    slug = `${base.slice(0, 70)}-${suffix}`;
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('=== DRY RUN: изменения не будут записаны ===\n');
  }

  const aggregates = await prisma.$queryRaw<
    { groupingKey: string; normalizedTitle: string | null; title: string; coverUrl: string | null }[]
  >`
    SELECT
      e."groupingKey" AS "groupingKey",
      MIN(e."normalizedTitle") AS "normalizedTitle",
      MIN(e."title") AS "title",
      MIN(e."imageUrl") AS "coverUrl"
    FROM "events" e
    WHERE e."isActive" = true
      AND e."isDeleted" = false
      AND e."groupingKey" IS NOT NULL
    GROUP BY e."groupingKey"
  `;

  console.log(`Найдено групп (groupingKey): ${aggregates.length}`);

  let created = 0;
  let updated = 0;

  for (const row of aggregates) {
    const groupingKey = row.groupingKey;
    const normalizedTitle = row.normalizedTitle ?? '';
    const title = row.title || 'Без названия';
    const coverUrl = row.coverUrl ?? null;

    const existing = await prisma.eventGroup.findUnique({
      where: { groupingKey },
    });

    if (existing) {
      // Slug неизменяем при обновлении. Обновляем только title/cover.
      const needsUpdate =
        existing.title !== title || (existing.coverUrl ?? null) !== coverUrl;
      if (needsUpdate && !dryRun) {
        await prisma.eventGroup.update({
          where: { id: existing.id },
          data: { title, coverUrl },
        });
        updated++;
      }
    } else {
      const base = baseSlug(normalizedTitle, title);
      const slug = await ensureUniqueSlug(base, groupingKey, null);

      if (!dryRun) {
        await prisma.eventGroup.create({
          data: {
            groupingKey,
            slug,
            title,
            coverUrl,
            auto: true,
          },
        });
        created++;
      } else {
        created++;
      }
    }
  }

  console.log(`Создано: ${created}, обновлено: ${updated}${dryRun ? ' (dry-run)' : ''}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
