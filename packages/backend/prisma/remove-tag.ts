/**
 * Удалить тег "Прогулки по Волге НН" отовсюду.
 * Запуск: npx tsx prisma/remove-tag.ts
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
  const tag = await prisma.tag.findFirst({
    where: {
      OR: [
        { name: { equals: 'Прогулки по Волге НН', mode: 'insensitive' } },
        { slug: { equals: 'progulki-po-volge-nn', mode: 'insensitive' } },
      ],
    },
    select: { id: true, slug: true, name: true },
  });

  if (!tag) {
    console.log('Тег "Прогулки по Волге НН" не найден.');
    return;
  }

  console.log(`Найден тег: ${tag.name} (slug: ${tag.slug}, id: ${tag.id})`);

  // 1. LandingPage (filterTag) — заменить на другой тег
  const fallbackTag = await prisma.tag.findFirst({
    where: { id: { not: tag.id }, isDeleted: false },
    select: { slug: true },
  });
  const fallbackSlug = fallbackTag?.slug ?? 'rechnye';
  const landings = await prisma.landingPage.updateMany({
    where: { filterTag: tag.slug },
    data: { filterTag: fallbackSlug },
  });
  if (landings.count > 0) {
    console.log(`Обновлено лендингов (filterTag): ${landings.count}`);
  }

  // 2. Удалить из Collection (filterTags array)
  const collections = await prisma.collection.findMany({
    where: { filterTags: { has: tag.slug } },
    select: { id: true, slug: true, filterTags: true },
  });
  for (const c of collections) {
    const newTags = c.filterTags.filter((s) => s !== tag.slug);
    await prisma.collection.update({
      where: { id: c.id },
      data: { filterTags: newTags },
    });
  }
  if (collections.length > 0) {
    console.log(`Обновлено подборок (filterTags): ${collections.length}`);
  }

  // 3. Удалить Tag (EventTag и ArticleTag каскадно удалятся)
  await prisma.tag.delete({ where: { id: tag.id } });
  console.log('Тег удалён.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
