/**
 * Сжатие EventSubcategoryLink до лимита на событие (оставляет самые ранние по createdAt).
 * Лимит должен совпадать с `SubcategoryPolicyService.MAX_EVENT_SUBCATEGORIES` (сейчас 512).
 * Запуск из packages/backend: `pnpm data:trim-subcategory-links` (dry-run) или `--apply`.
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

import { PrismaClient } from '@prisma/client';

dotenvConfig({ path: path.resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();
const MAX = 512;

async function main() {
  const apply = process.argv.includes('--apply');
  const overcrowded = await prisma.$queryRaw<{ eventId: string; cnt: bigint }[]>`
    SELECT esl."eventId", COUNT(*)::bigint AS cnt
    FROM event_subcategory_links esl
    INNER JOIN events e ON e.id = esl."eventId"
    WHERE e."canonicalOfId" IS NULL AND e."isDeleted" = false
    GROUP BY esl."eventId"
    HAVING COUNT(*) > ${MAX}
  `;

  console.log(`Events with >${MAX} links: ${overcrowded.length} (${apply ? 'APPLY' : 'DRY-RUN'})`);

  let removed = 0;
  for (const row of overcrowded) {
    const links = await prisma.eventSubcategoryLink.findMany({
      where: { eventId: row.eventId },
      orderBy: { createdAt: 'asc' },
      select: { eventId: true, subcategoryId: true },
    });
    const drop = links.slice(MAX);
    for (const d of drop) {
      if (apply) {
        await prisma.eventSubcategoryLink.delete({
          where: { eventId_subcategoryId: { eventId: d.eventId, subcategoryId: d.subcategoryId } },
        });
      }
      removed += 1;
    }
    if (!apply && overcrowded.length <= 20) {
      console.log(`  ${row.eventId}: would remove ${drop.length} links (keep ${MAX})`);
    }
  }

  console.log(`Total link rows ${apply ? 'deleted' : 'to delete'}: ${removed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
