/**
 * Массовая переклассификация событий по универсальному классификатору.
 *
 * Запуск:
 *   npx tsx prisma/reclassify-events.ts           # dry-run (только лог)
 *   npx tsx prisma/reclassify-events.ts --apply   # применить изменения
 *
 * Пропускает события с EventOverride (category/subcategories) — ручные правки админа.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { classify } from '../src/catalog/event-classifier';

const cwd = process.cwd();
const envPaths = [
  resolve(__dirname, '../.env'),
  resolve(__dirname, '../../.env'),
  resolve(cwd, '.env'),
  resolve(cwd, '../.env'),
  resolve(cwd, '../../.env'),
];
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
const APPLY = process.argv.includes('--apply');

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((x, i) => x === sb[i]);
}

async function main() {
  console.log('=== Переклассификация событий ===');
  console.log(`Режим: ${APPLY ? 'APPLY (запись в БД)' : 'DRY-RUN (только лог)'}\n`);

  const events = await prisma.event.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      subcategories: true,
      audience: true,
      source: true,
      override: { select: { category: true, subcategories: true } },
      tags: { select: { tag: { select: { slug: true } } } },
    },
  });

  const skipOverride = events.filter((e) => {
    const o = e.override;
    return o && (o.category != null || (o.subcategories && o.subcategories.length > 0));
  });

  const toProcess = events.filter((e) => !skipOverride.includes(e));
  const tagSlugs = (e: (typeof events)[0]) => (e.tags ?? []).map((t) => t.tag.slug);

  const changes: Array<{
    slug: string;
    title: string;
    source: string;
    oldCat: string;
    newCat: string;
    oldSub: string[];
    newSub: string[];
    oldAud: string;
    newAud: string;
    newCategory: 'EXCURSION' | 'MUSEUM' | 'EVENT';
    newSubcategories: string[];
    newAudience: string;
  }> = [];

  for (const e of toProcess) {
    const tags = tagSlugs(e);
    const result = classify(e.title ?? '', e.description ?? '', tags);

    const catChanged = e.category !== result.category;
    const subChanged = !arraysEqual(e.subcategories ?? [], result.subcategories);
    const audChanged = e.audience !== result.audience;

    if (catChanged || subChanged || audChanged) {
      changes.push({
        slug: e.slug,
        title: (e.title ?? '').slice(0, 60),
        source: e.source ?? '?',
        oldCat: e.category ?? '?',
        newCat: result.category,
        oldSub: (e.subcategories ?? []).slice().sort(),
        newSub: result.subcategories.slice().sort(),
        oldAud: e.audience ?? '?',
        newAud: result.audience,
        newCategory: result.category,
        newSubcategories: result.subcategories,
        newAudience: result.audience,
      });
    }
  }

  // Отчёт
  console.log(`Всего событий: ${events.length}`);
  console.log(`Пропущено (override): ${skipOverride.length}`);
  console.log(`Обработано: ${toProcess.length}`);
  console.log(`Изменений: ${changes.length}\n`);

  const catChanges = changes.filter((c) => c.oldCat !== c.newCat);
  const subChanges = changes.filter((c) => !arraysEqual(c.oldSub, c.newSub));
  console.log(`  — сменили category: ${catChanges.length}`);
  console.log(`  — сменили subcategory: ${subChanges.length}\n`);

  if (changes.length > 0) {
    console.log('Дифф (old → new):');
    for (const c of changes.slice(0, 50)) {
      const catDiff = c.oldCat !== c.newCat ? ` ${c.oldCat}→${c.newCat}` : '';
      const subDiff = !arraysEqual(c.oldSub, c.newSub) ? ` [${c.oldSub.join(',') || '-'}]→[${c.newSub.join(',') || '-'}]` : '';
      const audDiff = c.oldAud !== c.newAud ? ` aud:${c.oldAud}→${c.newAud}` : '';
      console.log(`  ${c.slug} | ${c.source} |${catDiff}${subDiff}${audDiff}`);
      console.log(`    "${c.title}..."`);
    }
    if (changes.length > 50) {
      console.log(`  ... и ещё ${changes.length - 50} изменений`);
    }
  }

  if (APPLY && changes.length > 0) {
    console.log('\n--- Применение изменений ---');
    for (const c of changes) {
      await prisma.event.update({
        where: { slug: c.slug },
        data: {
          category: c.newCategory,
          subcategories: c.newSubcategories,
          audience: c.newAudience,
        },
      });
    }
    console.log(`Обновлено: ${changes.length} событий`);

    // Инвалидация кэша
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(redisUrl);
      const patterns = ['events:*', 'search:*', 'regions:*'];
      let total = 0;
      for (const p of patterns) {
        const stream = redis.scanStream({ match: p, count: 100 });
        for await (const keys of stream) {
          if (keys.length > 0) {
            await redis.del(...keys);
            total += keys.length;
          }
        }
      }
      await redis.quit();
      console.log(`Кэш инвалидирован: ${total} ключей`);
    } catch (err) {
      console.warn('Redis недоступен, пропуск инвалидации:', (err as Error).message);
    }
  } else if (!APPLY && changes.length > 0) {
    console.log('\nДля применения запустите: npx tsx prisma/reclassify-events.ts --apply');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
