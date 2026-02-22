/**
 * TEPLOHOD: EXCURSION+RIVER только если в заголовке/описании есть «экскурсия».
 * Дискотека, выпускной, последний звонок — всегда EVENT, даже на теплоходе.
 *
 * 1. Откат: EXCURSION+RIVER без «экскурсия» → EVENT
 * 2. Перенос: EVENT с «экскурсия» → EXCURSION+RIVER
 *
 * Запуск: npx tsx prisma/fix-teplohod-river-excursions.ts
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env: приоритет — корень проекта (pnpm run из packages/backend → cwd = packages/backend)
const rootEnv = resolve(process.cwd(), '../../.env');
const backendEnv = resolve(process.cwd(), '../.env');
const envPath = [rootEnv, backendEnv, resolve(__dirname, '../../.env')].find(existsSync);
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

function hasExcursion(title: string | null, description: string | null): boolean {
  const t = `${(title || '').toLowerCase()} ${(description || '').toLowerCase()}`;
  return t.includes('экскурсия');
}

const WATER_MARKERS = [
  'теплоход',
  'речн',
  'катер',
  'корабл',
  'яхт',
  'водн',
  'по неве',
  'по реке',
  'круиз',
  'развод мостов',
  'палубн',
];

function hasWaterContext(title: string | null, description: string | null): boolean {
  const t = `${(title || '').toLowerCase()} ${(description || '').toLowerCase()}`;
  return WATER_MARKERS.some((m) => t.includes(m));
}

async function main() {
  // 1. Откат: EXCURSION+RIVER без «экскурсия» ИЛИ без водного контекста → EVENT
  const wronglyExcursion = await prisma.event.findMany({
    where: {
      source: 'TEPLOHOD',
      category: 'EXCURSION',
      subcategories: { has: 'RIVER' },
    },
    select: { id: true, slug: true, title: true, description: true },
  });

  const toRevert = wronglyExcursion.filter(
    (e) => !hasExcursion(e.title, e.description) || !hasWaterContext(e.title, e.description),
  );
  if (toRevert.length > 0) {
    console.log(`Откат: ${toRevert.length} событий EXCURSION+RIVER → EVENT (нет «экскурсия»):\n`);
    for (const e of toRevert) {
      console.log(`  ${e.slug}: ${(e.title || '').slice(0, 60)}`);
    }
    for (const e of toRevert) {
      await prisma.event.update({
        where: { id: e.id },
        data: { category: 'EVENT', subcategories: ['PARTY'] },
      });
      await prisma.eventOverride.updateMany({
        where: { eventId: e.id },
        data: { category: null, subcategories: [] },
      });
    }
    console.log(`\nОткачено: ${toRevert.length}`);
  } else {
    console.log('Нет TEPLOHOD EXCURSION+RIVER для отката.');
  }

  // 2. Перенос: EVENT с «экскурсия» И водным контекстом → EXCURSION+RIVER
  const eventList = await prisma.event.findMany({
    where: { source: 'TEPLOHOD', category: 'EVENT' },
    select: { id: true, slug: true, title: true, description: true },
  });

  const toFix = eventList.filter(
    (e) => hasExcursion(e.title, e.description) && hasWaterContext(e.title, e.description),
  );
  if (toFix.length > 0) {
    console.log(`\nПеренос EVENT → EXCURSION+RIVER (есть «экскурсия»): ${toFix.length}\n`);
    for (const e of toFix) {
      console.log(`  ${e.slug}: ${(e.title || '').slice(0, 60)}`);
    }
    for (const e of toFix) {
      await prisma.event.update({
        where: { id: e.id },
        data: { category: 'EXCURSION', subcategories: ['RIVER'] },
      });
      await prisma.eventOverride.updateMany({
        where: { eventId: e.id },
        data: { category: null, subcategories: [] },
      });
    }
    console.log(`\nПеренесено: ${toFix.length}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
