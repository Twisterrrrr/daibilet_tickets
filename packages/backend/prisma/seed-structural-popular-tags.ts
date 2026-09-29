/**
 * Seed: STRUCTURAL/POPULAR tags foundation.
 *
 * Запуск: npx tsx prisma/seed-structural-popular-tags.ts
 *
 * Требования:
 * - идемпотентность: upsert по `code`
 * - обновлять slug/name/flags/sortOrder при повторном запуске
 * - не ломать существующие TagCategory-контракты (категория выставляется
 *   только для совместимости текущего admin/catalog UI)
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

import { TagCategory, type TagKind, type StructuralTagGroup } from '../src/prisma-client';
import { createScriptPrismaClient } from '../scripts/_prisma';

dotenvConfig({ path: path.resolve(process.cwd(), '../../.env') });

const { prisma, pool } = createScriptPrismaClient();

type SeedTag = {
  code: string;
  slug: string;
  nameRu: string;
  nameEn?: string;
  description?: string;
  tagKind: TagKind;
  structuralGroup?: StructuralTagGroup;
  category: TagCategory;
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder: number;
};

const TAGS: SeedTag[] = [
  // ========================
  // STRUCTURAL / THEME
  // ========================
  { code: 'history', slug: 'history', nameRu: 'История', tagKind: 'STRUCTURAL', structuralGroup: 'THEME', category: 'THEME', sortOrder: 1 },
  { code: 'art', slug: 'art', nameRu: 'Искусство', tagKind: 'STRUCTURAL', structuralGroup: 'THEME', category: 'THEME', sortOrder: 2 },
  {
    code: 'architecture',
    slug: 'architecture',
    nameRu: 'Архитектура',
    tagKind: 'STRUCTURAL',
    structuralGroup: 'THEME',
    category: 'THEME',
    sortOrder: 3,
  },
  { code: 'museums', slug: 'museums', nameRu: 'Музеи', tagKind: 'STRUCTURAL', structuralGroup: 'THEME', category: 'THEME', sortOrder: 4 },
  {
    code: 'sightseeing',
    slug: 'sightseeing',
    nameRu: 'Достопримечательности',
    tagKind: 'STRUCTURAL',
    structuralGroup: 'THEME',
    category: 'THEME',
    sortOrder: 5,
  },
  { code: 'culture', slug: 'culture', nameRu: 'Культура', tagKind: 'STRUCTURAL', structuralGroup: 'THEME', category: 'THEME', sortOrder: 6 },
  {
    code: 'boat_theme',
    slug: 'boat_theme',
    nameRu: 'Теплоходная тема',
    tagKind: 'STRUCTURAL',
    structuralGroup: 'THEME',
    category: 'THEME',
    sortOrder: 7,
  },
  {
    code: 'nightlife',
    slug: 'nightlife',
    nameRu: 'Ночная жизнь',
    tagKind: 'STRUCTURAL',
    structuralGroup: 'THEME',
    category: 'THEME',
    sortOrder: 8,
  },
  {
    code: 'gastronomy',
    slug: 'gastronomy',
    nameRu: 'Гастрономия',
    tagKind: 'STRUCTURAL',
    structuralGroup: 'THEME',
    category: 'THEME',
    sortOrder: 9,
  },
  { code: 'nature', slug: 'nature', nameRu: 'Природа', tagKind: 'STRUCTURAL', structuralGroup: 'THEME', category: 'THEME', sortOrder: 10 },
  {
    code: 'photography',
    slug: 'photography',
    nameRu: 'Фотография',
    tagKind: 'STRUCTURAL',
    structuralGroup: 'THEME',
    category: 'THEME',
    sortOrder: 11,
  },
  { code: 'romantic', slug: 'romantic', nameRu: 'Романтика', tagKind: 'STRUCTURAL', structuralGroup: 'THEME', category: 'THEME', sortOrder: 12 },
  {
    code: 'military',
    slug: 'military',
    nameRu: 'Военная история',
    tagKind: 'STRUCTURAL',
    structuralGroup: 'THEME',
    category: 'THEME',
    sortOrder: 13,
  },
  {
    code: 'religion',
    slug: 'religion',
    nameRu: 'Религия',
    tagKind: 'STRUCTURAL',
    structuralGroup: 'THEME',
    category: 'THEME',
    sortOrder: 14,
  },
  {
    code: 'literature',
    slug: 'literature',
    nameRu: 'Литература',
    tagKind: 'STRUCTURAL',
    structuralGroup: 'THEME',
    category: 'THEME',
    sortOrder: 15,
  },
  {
    code: 'industrial',
    slug: 'industrial',
    nameRu: 'Индустриальные маршруты',
    tagKind: 'STRUCTURAL',
    structuralGroup: 'THEME',
    category: 'THEME',
    sortOrder: 16,
  },
  {
    code: 'kids_edutainment',
    slug: 'kids_edutainment',
    nameRu: 'Детские образовательные развлечения',
    tagKind: 'STRUCTURAL',
    structuralGroup: 'THEME',
    category: 'THEME',
    sortOrder: 17,
  },

  // ========================
  // STRUCTURAL / AUDIENCE
  // ========================
  { code: '0plus', slug: '0plus', nameRu: '0+', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 20 },
  { code: '6plus', slug: '6plus', nameRu: '6+', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 21 },
  { code: '12plus', slug: '12plus', nameRu: '12+', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 22 },
  { code: '16plus', slug: '16plus', nameRu: '16+', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 23 },
  { code: '18plus', slug: '18plus', nameRu: '18+', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 24 },
  { code: 'for_kids', slug: 'for-kids', nameRu: 'Для детей', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 25 },
  { code: 'adults', slug: 'adults', nameRu: 'Для взрослых', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 1 },
  { code: 'kids', slug: 'kids', nameRu: 'Детям', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 2 },
  { code: 'family', slug: 'family', nameRu: 'Семейным', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 3 },
  { code: 'couples', slug: 'couples', nameRu: 'Парам', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 4 },
  { code: 'groups', slug: 'groups', nameRu: 'Для групп', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 5 },
  { code: 'solo', slug: 'solo', nameRu: 'Индивидуально', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 6 },
  {
    code: 'tourists_ru',
    slug: 'tourists_ru',
    nameRu: 'Туристам (RU)',
    tagKind: 'STRUCTURAL',
    structuralGroup: 'AUDIENCE',
    category: 'AUDIENCE',
    sortOrder: 7,
  },
  {
    code: 'tourists_foreign',
    slug: 'tourists_foreign',
    nameRu: 'Иностранным туристам',
    tagKind: 'STRUCTURAL',
    structuralGroup: 'AUDIENCE',
    category: 'AUDIENCE',
    sortOrder: 8,
  },
  { code: 'students', slug: 'students', nameRu: 'Студентам', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 9 },
  { code: 'corporate', slug: 'corporate', nameRu: 'Для корпоратива', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 10 },
  { code: 'vip', slug: 'vip', nameRu: 'VIP', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE', category: 'AUDIENCE', sortOrder: 11 },

  // ========================
  // STRUCTURAL / FORMAT
  // ========================
  { code: 'walking', slug: 'walking', nameRu: 'Пешеходная', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 1 },
  { code: 'bus', slug: 'bus', nameRu: 'Автобусная', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 2 },
  { code: 'boat', slug: 'boat', nameRu: 'Теплоходная', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 3 },
  { code: 'individual', slug: 'individual', nameRu: 'Индивидуальная', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 4 },
  { code: 'group', slug: 'group', nameRu: 'Групповая', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 5 },
  { code: 'guided', slug: 'guided', nameRu: 'С гидом', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 6 },
  { code: 'audio', slug: 'audio', nameRu: 'Аудиогид', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 7 },
  { code: 'immersive', slug: 'immersive', nameRu: 'Иммерсивная', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 8 },
  { code: 'theatrical', slug: 'theatrical', nameRu: 'Театральная', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 9 },
  { code: 'scheduled', slug: 'scheduled', nameRu: 'По расписанию', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 10 },
  { code: 'private', slug: 'private', nameRu: 'Приватная', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 11 },
  { code: 'open_date', slug: 'open_date', nameRu: 'Открытая дата', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 12 },
  { code: 'combo', slug: 'combo', nameRu: 'Комбинированная', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 13 },
  { code: 'transfer', slug: 'transfer', nameRu: 'Трансфер', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 14 },
  { code: 'skip_the_line', slug: 'skip_the_line', nameRu: 'Без очереди', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT', category: 'SPECIAL', sortOrder: 15 },

  // ========================
  // POPULAR (marketing / query-demand)
  // ========================
  { code: 'ru', slug: 'ru', nameRu: 'Русский', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 90 },
  { code: 'en', slug: 'en', nameRu: 'English', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 91 },
  { code: 'bilingual', slug: 'bilingual', nameRu: 'На двух языках', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 92 },
  { code: 'salyut', slug: 'salyut', nameRu: 'Салют', description: 'Запросы и подборки про праздничный салют с воды.', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 1 },
  { code: 'bridge_opening', slug: 'bridge_opening', nameRu: 'Развод мостов', description: 'Подборки про развод мостов (ночные и праздничные рейсы).', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 2 },
  { code: 'white_nights', slug: 'white_nights', nameRu: 'Белые ночи', description: 'Запросы про сезон белых ночей в Петербурге.', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 3 },
  { code: 'new_year', slug: 'new_year', nameRu: 'Новый год', description: 'Новогодние спецпрограммы и праздничные маршруты.', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 4 },
  { code: 'navy_day', slug: 'navy_day', nameRu: 'День ВМФ', description: 'Подборки про День ВМФ и тематические рейсы.', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 5 },
  { code: 'sunset', slug: 'sunset', nameRu: 'Закат', description: 'Рейсы на закате и маршруты под вечерние виды.', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 6 },
  { code: 'neva', slug: 'neva', nameRu: 'Нева', description: 'Запросы про прогулки по Неве.', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 7 },
  { code: 'roofs', slug: 'roofs', nameRu: 'Крыши', description: 'Подборки про экскурсии по крышам.', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 8 },
  {
    code: 'date_idea',
    slug: 'date_idea',
    nameRu: 'Идея для свидания',
    description: 'Популярные запросы про романтические форматы и идеи для пары.',
    tagKind: 'POPULAR',
    category: 'SPECIAL',
    sortOrder: 9,
  },
  { code: 'kids_free', slug: 'kids_free', nameRu: 'Дети бесплатно', description: 'Запросы про бесплатный вход/условия для детей.', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 10 },
  { code: 'may_9', slug: 'may_9', nameRu: '9 мая', description: 'Подборки про 9 мая и тематические рейсы.', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 11 },
  { code: 'night_city', slug: 'night_city', nameRu: 'Ночной город', description: 'Ночные маршруты и прогулки по подсвеченным улицам.', tagKind: 'POPULAR', category: 'SPECIAL', sortOrder: 12 },
];

async function main() {
  console.log(`Seeding ${TAGS.length} tags...`);

  for (const t of TAGS) {
    const data = {
      code: t.code,
      slug: t.slug,
      name: t.nameRu,
      nameEn: t.nameEn,
      description: t.description,
      category: t.category,
      tagKind: t.tagKind,
      structuralGroup: t.tagKind === 'STRUCTURAL' ? (t.structuralGroup ?? null) : null,
      isActive: t.isActive ?? true,
      isFeatured: t.isFeatured ?? false,
      sortOrder: t.sortOrder,
    };

    try {
      await prisma.tag.upsert({
        where: { code: t.code },
        create: data,
        update: data,
      });
    } catch (e: any) {
      // Если в базе уже есть tag с тем же slug, но без code (или с другим code),
      // корректно "подхватываем" его и дописываем code/группы.
      if (e?.code === 'P2002') {
        const existing = await prisma.tag.findUnique({ where: { slug: t.slug } }).catch(() => null);
        if (existing) {
          await prisma.tag.update({
            where: { id: existing.id },
            data,
          });
          continue;
        }
      }
      throw e;
    }
  }

  console.log(`Done.`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

