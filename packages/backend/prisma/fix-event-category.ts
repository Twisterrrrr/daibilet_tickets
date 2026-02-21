/**
 * Исправить категорию события по slug (override).
 * Запуск: npx tsx prisma/fix-event-category.ts <slug> [category] [subcategory1,subcategory2]
 * Пример: npx tsx prisma/fix-event-category.ts trehchasovaya-vechernyaya-ekskursiya-na-avtobuse-po-moskve-s-poseshcheniem-treh- EXCURSION BUS
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

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
  const slug = process.argv[2] || 'trehchasovaya-vechernyaya-ekskursiya-na-avtobuse-po-moskve-s-poseshcheniem-treh-';
  const category = (process.argv[3] || 'EXCURSION') as 'EXCURSION' | 'EVENT' | 'MUSEUM';
  const subcatsArg = process.argv[4] || 'BUS';
  const subcategories = subcatsArg.split(',').map((s) => s.trim());

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, title: true, category: true, subcategories: true },
  });

  if (!event) {
    console.error(`Событие со slug "${slug}" не найдено.`);
    process.exit(1);
  }

  // Обновить через Event (если нет override) или EventOverride
  const override = await prisma.eventOverride.findUnique({
    where: { eventId: event.id },
    select: { id: true },
  });

  const systemUserId = await prisma.adminUser.findFirst({ where: { role: 'ADMIN' }, select: { id: true } }).then((u) => u?.id);
  const updatedBy = systemUserId || event.id;

  if (override) {
    await prisma.eventOverride.update({
      where: { eventId: event.id },
      data: { category, subcategories, updatedBy },
    });
    console.log(`Override обновлён: ${event.title} → ${category} [${subcategories.join(', ')}]`);
  } else {
    await prisma.eventOverride.create({
      data: { eventId: event.id, category, subcategories, updatedBy },
    });
    console.log(`Override создан: ${event.title} → ${category} [${subcategories.join(', ')}]`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
