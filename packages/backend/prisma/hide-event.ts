/**
 * Скрыть событие из каталога (isActive=false, оффер DISABLED).
 * Запуск: npx tsx prisma/hide-event.ts <slug>
 * Пример: npx tsx prisma/hide-event.ts novogodnyaya-ekskursiya-2026-na-avtobuse-ot-krasnoj-ploshchadi
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const envPaths = [resolve(__dirname, '../../.env'), resolve(__dirname, '../../../.env')];
const envPath = envPaths.find(existsSync);
if (envPath) {
  const env = readFileSync(envPath, 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2] || 'novogodnyaya-ekskursiya-2026-na-avtobuse-ot-krasnoj-ploshchadi';
  const event = await prisma.event.findFirst({
    where: { slug },
    select: { id: true, slug: true, title: true },
  });

  if (!event) {
    console.log(`Событие slug="${slug}" не найдено.`);
    return;
  }

  console.log(`Скрываю: ${event.title} (${event.slug})`);

  await prisma.$transaction([
    prisma.event.update({
      where: { id: event.id },
      data: { isActive: false },
    }),
    prisma.eventOffer.updateMany({
      where: { eventId: event.id },
      data: { status: 'DISABLED' },
    }),
    prisma.eventSession.updateMany({
      where: { eventId: event.id },
      data: { isActive: false },
    }),
  ]);

  console.log('Готово. Сбросьте кэш: npx tsx prisma/invalidate-cache.ts');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
