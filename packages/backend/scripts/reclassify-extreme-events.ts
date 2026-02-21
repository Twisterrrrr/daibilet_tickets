/**
 * Перенос событий с маркерами экстрима (танк, стрельба и т.п.) из BUS → EXTREME.
 * Запуск: npx tsx scripts/reclassify-extreme-events.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXTREME_MARKERS = ['танк', 'танке', 'квадроцикл', 'стрельб', 'экстрим', 'броневик'];

function matches(text: string): boolean {
  const t = (text || '').toLowerCase();
  if (['автобус', 'bus', 'hop-on', 'hop on'].some((w) => t.includes(w))) return false;
  return EXTREME_MARKERS.some((m) => t.includes(m));
}

async function main() {
  const events = await prisma.event.findMany({
    where: {
      subcategories: { has: 'BUS' },
      isActive: true,
    },
    select: { id: true, title: true, description: true, slug: true, subcategories: true },
  });

  const toUpdate = events.filter((e) => matches(e.title || '') || matches(e.description || ''));
  if (toUpdate.length === 0) {
    console.log('Нет событий для переноса BUS → EXTREME.');
    return;
  }

  console.log(`Найдено ${toUpdate.length} событий для переноса BUS → EXTREME:\n`);
  for (const e of toUpdate) {
    const subs = [...(e.subcategories || [])];
    const busIdx = subs.indexOf('BUS');
    if (busIdx >= 0) subs.splice(busIdx, 1);
    if (!subs.includes('EXTREME')) subs.push('EXTREME');
    console.log(`  ${e.slug}`);
    await prisma.event.update({
      where: { id: e.id },
      data: { subcategories: subs as any, category: 'EXCURSION' },
    });
  }
  console.log(`\nОбновлено: ${toUpdate.length} событий.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
