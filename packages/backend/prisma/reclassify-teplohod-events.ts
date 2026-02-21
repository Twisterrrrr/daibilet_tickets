/**
 * Перенос TEPLOHOD-событий: выпускной, последний звонок, дискотека → EVENT (PARTY).
 * Запуск: npx tsx prisma/reclassify-teplohod-events.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVENT_MARKERS = ['выпускной', 'последний звонок', 'дискотек', 'disco'];

function matches(text: string): boolean {
  const t = text.toLowerCase();
  return EVENT_MARKERS.some((m) => t.includes(m));
}

async function main() {
  const events = await prisma.event.findMany({
    where: {
      source: 'TEPLOHOD',
      category: 'EXCURSION',
    },
    select: { id: true, title: true, slug: true, subcategories: true },
  });

  const toUpdate = events.filter((e) => matches(e.title || ''));
  if (toUpdate.length === 0) {
    console.log('Нет событий для переноса.');
    return;
  }

  console.log(`Найдено ${toUpdate.length} событий для переноса EXCURSION → EVENT (PARTY):\n`);
  for (const e of toUpdate) {
    console.log(`  ${e.slug}: ${(e.title || '').slice(0, 55)}...`);
    await prisma.event.update({
      where: { id: e.id },
      data: {
        category: 'EVENT',
        subcategories: ['PARTY'],
      },
    });
  }
  console.log(`\nОбновлено: ${toUpdate.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
