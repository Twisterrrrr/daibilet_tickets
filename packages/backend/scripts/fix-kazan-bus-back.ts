/**
 * Вернуть событие "Экскурсия на двухэтажном автобусе г. Казань" в BUS (ошибочно было перенесено в EXTREME).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const e = await prisma.event.findFirst({
    where: { slug: 'ekskursiya-na-dvuhetazhnom-avtobuse-g-kazan' },
    select: { id: true, subcategories: true },
  });
  if (!e) {
    console.log('Событие не найдено.');
    return;
  }
  const subs = [...(e.subcategories || [])];
  const extIdx = subs.indexOf('EXTREME');
  if (extIdx >= 0) subs.splice(extIdx, 1);
  if (!subs.includes('BUS')) subs.push('BUS');
  await prisma.event.update({
    where: { id: e.id },
    data: { subcategories: subs as any, category: 'EXCURSION' },
  });
  console.log('Вернули автобусную экскурсию Казань в BUS.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
