/**
 * Один рабочий тестовый CITY-лендинг для проверки UX на витрине и в Admin V3
 * (композиция, диагностика, выдача по тегу).
 *
 * Условие публичного API: `status === ACTIVE` **или** `isActive === true` — скрипт выставляет оба.
 *
 * Usage (из packages/backend):
 *   npx tsx scripts/seed-test-landing-composition.ts --citySlug=saint-petersburg
 *
 * Публичная страница:
 *   https://<site>/cities/<citySlug>/qa-ux-demo
 * Админка:
 *   /admin-v3/landings — поиск по slug `qa-ux-demo` или по id из вывода скрипта
 *
 * Требуется `DATABASE_URL` (см. `.env` в корне монорепо или `packages/backend/.env`).
 * Для `landing_content_blocks` и расширенных полей `landing_pages` нужны актуальные миграции Prisma.
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

import { TagCategory } from '../src/prisma-client';
import { createScriptPrismaClient } from './_prisma';

dotenvConfig({ path: path.resolve(process.cwd(), '../../.env') });
dotenvConfig({ path: path.resolve(process.cwd(), '.env') });

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p?.split('=')[1]?.trim() || undefined;
}

const TAG_SLUG = 'qa-ux-demo';
const LANDING_SLUG = 'qa-ux-demo';

async function main() {
  const citySlug = arg('citySlug') ?? 'saint-petersburg';
  const { prisma, pool } = createScriptPrismaClient();
  try {
    const city = await prisma.city.findFirst({ where: { slug: citySlug }, select: { id: true, name: true, slug: true } });
    if (!city) throw new Error(`City not found: ${citySlug}`);

    const tag = await prisma.tag.upsert({
      where: { slug: TAG_SLUG },
      create: {
        slug: TAG_SLUG,
        name: 'QA UX demo',
        category: TagCategory.SPECIAL,
        isActive: true,
      },
      update: { isActive: true, isDeleted: false },
    });

    const events = await prisma.event.findMany({
      where: { cityId: city.id, isActive: true },
      select: { id: true, title: true },
      take: 8,
      orderBy: { updatedAt: 'desc' },
    });

    for (const ev of events) {
      await prisma.eventTag.upsert({
        where: { eventId_tagId: { eventId: ev.id, tagId: tag.id } },
        create: {
          eventId: ev.id,
          tagId: tag.id,
          assignmentSource: 'MANUAL_ADMIN',
        },
        update: {},
      });
    }

    const landing = await prisma.landingPage.upsert({
      where: { cityId_slug: { cityId: city.id, slug: LANDING_SLUG } },
      create: {
        slug: LANDING_SLUG,
        cityId: city.id,
        landingType: 'CITY',
        filterTag: tag.slug,
        filterTagId: tag.id,
        title: 'Демо-лендинг QA · витрина и админка',
        subtitle: 'Тестовая страница: блоки композиции, SEO-аудит, выдача по тегу',
        heroTitle: 'Демо-лендинг для UX',
        heroSubtitle: 'Редактируйте во вкладках «Все поля» и «Композиция»',
        metaTitle: 'QA UX demo — тестовый лендинг',
        metaDescription: 'Служебная страница для проверки композиции, диагностики и каталожной выдачи.',
        seoH1: 'Демо-лендинг QA',
        seoTitle: 'QA UX demo | тест',
        seoDescription: 'Тестовый лендинг: не используйте в продакшен-маркетинге без замены контента.',
        status: 'ACTIVE',
        isActive: true,
        isIndexable: false,
        templateType: 'GENERIC_CARDS',
      },
      update: {
        filterTagId: tag.id,
        filterTag: tag.slug,
        status: 'ACTIVE',
        isActive: true,
      },
    });

    const story = await prisma.landingContentBlock.findFirst({
      where: { landingPageId: landing.id, type: 'STORY' },
    });
    if (!story) {
      await prisma.landingContentBlock.create({
        data: {
          landingPageId: landing.id,
          type: 'STORY',
          title: 'Текстовый блок (STORY)',
          body: 'Блок создан скриптом seed. Проверьте порядок с FAQ ниже и вкладку «Диагностика» в админке.',
          isEnabled: true,
          sortOrder: 0,
        },
      });
    }

    const faq = await prisma.landingContentBlock.findFirst({
      where: { landingPageId: landing.id, type: 'FAQ' },
    });
    if (!faq) {
      await prisma.landingContentBlock.create({
        data: {
          landingPageId: landing.id,
          type: 'FAQ',
          title: 'Вопросы и ответы (композиция)',
          payload: {
            items: [
              {
                question: 'Зачем эта страница?',
                answer:
                  'Проверка макета витрины, блоков композиции и вкладок админки («Все поля», «Композиция», «Диагностика»).',
              },
              {
                question: 'Откуда события в расписании?',
                answer: `События города с тегом «${tag.name}» (${tag.slug}). Скрипт привязал до ${events.length} шт., если они были в базе.`,
              },
            ],
          },
          isEnabled: true,
          sortOrder: 1,
        },
      });
    }

    console.log('');
    console.log('=== QA UX demo landing ready ===');
    console.log('City:          ', city.slug, `(${city.name})`);
    console.log('Tag:           ', tag.slug);
    console.log('Events tagged: ', events.length, events.length === 0 ? '(добавьте события в город — выдача будет пустой)' : '');
    console.log('Landing id:    ', landing.id);
    console.log('Public URL:    ', `/cities/${city.slug}/${LANDING_SLUG}`);
    console.log('Admin:         ', `/admin-v3/landings (slug: ${LANDING_SLUG})`);
    console.log('');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
