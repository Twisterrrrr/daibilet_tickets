/**
 * Убрать с витрины лишние CITY-лендинги города (тесты, fixtures): soft-delete isDeleted=true.
 *
 * Критерии по умолчанию:
 * - slug из списка EXTRA_SLUGS и/или из --slugs=a,b
 * - или в title есть «(fixtures)» / «fixtures)» (регистронезависимо)
 *
 * Usage (packages/backend):
 *   npx tsx scripts/cleanup-dev-city-landings.ts --citySlug=saint-petersburg
 *   npx tsx scripts/cleanup-dev-city-landings.ts --citySlug=saint-petersburg --apply
 *   npx tsx scripts/cleanup-dev-city-landings.ts --citySlug=saint-petersburg --slugs=qa-ux-demo --apply
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

import { createScriptPrismaClient } from './_prisma';

dotenvConfig({ path: path.resolve(process.cwd(), '../../.env') });
dotenvConfig({ path: path.resolve(process.cwd(), '.env') });

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p?.split('=')[1]?.trim() || undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

/** Дополнительные slug без привязки к title (редактируйте под свою базу). */
const EXTRA_SLUGS = new Set<string>(['qa-ux-demo']);

function titleLooksLikeFixture(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes('(fixtures)') || t.includes('fixtures)');
}

function shouldRemove(slug: string, title: string, extraFromCli: Set<string>): boolean {
  if (EXTRA_SLUGS.has(slug) || extraFromCli.has(slug)) return true;
  return titleLooksLikeFixture(title);
}

async function main() {
  const citySlug = arg('citySlug');
  if (!citySlug) {
    console.error('Укажите --citySlug=...');
    process.exit(1);
  }
  const apply = hasFlag('apply');
  const slugsArg = arg('slugs');
  const extraFromCli = new Set(
    (slugsArg ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const { prisma, pool } = createScriptPrismaClient();
  try {
    const city = await prisma.city.findFirst({
      where: { slug: citySlug },
      select: { id: true, name: true, slug: true },
    });
    if (!city) {
      console.error(`Город не найден: ${citySlug}`);
      process.exit(1);
    }

    const landings = await prisma.landingPage.findMany({
      where: {
        cityId: city.id,
        landingType: 'CITY',
        isDeleted: false,
      },
      select: { id: true, slug: true, title: true, status: true },
      orderBy: { slug: 'asc' },
    });

    const toRemove = landings.filter((l) => shouldRemove(l.slug, l.title, extraFromCli));

    console.log('');
    console.log(`Город: ${city.name} (${city.slug})`);
    console.log(`Всего CITY-лендингов (не удалённых): ${landings.length}`);
    console.log(`Кандидатов на soft-delete: ${toRemove.length}`);
    console.log(apply ? 'Режим: APPLY' : 'Режим: DRY-RUN (повторите с --apply)');
    console.log('');

    for (const l of toRemove) {
      console.log(`  - ${l.slug} | ${l.title} | ${l.status}`);
    }

    if (toRemove.length === 0) {
      console.log('\nНечего удалять.');
      return;
    }

    if (!apply) {
      console.log('\n[DRY-RUN] Записи не менялись. Для выполнения: добавьте --apply');
      return;
    }

    const now = new Date();
    const res = await prisma.landingPage.updateMany({
      where: { id: { in: toRemove.map((x) => x.id) } },
      data: { isDeleted: true, deletedAt: now, isActive: false, status: 'ARCHIVED' },
    });

    console.log(`\nГотово: soft-delete ${res.count} лендинг(ов).`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
