/**
 * Канонический whitelist подкатегорий: code+type, иерархия parentCode, landingMode / isLandingEnabled.
 * Upsert по @@unique([code, type]); slug в update — намеренно (выравнивание SEO-путей под политику).
 * См. docs/Architecture.md § routing policy subcategories.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  SubcategoryLandingMode,
  SubcategoryLayer,
  SubcategoryType,
} from '@prisma/client';

type SeedRow = {
  code: string;
  slug: string;
  nameRu: string;
  type: SubcategoryType;
  layer: SubcategoryLayer;
  parentCode?: string;
  isActive?: boolean;
  isLandingEnabled?: boolean;
  landingMode?: SubcategoryLandingMode;
  landingTopicKey?: string | null;
  sortOrder?: number;
};

const SUBCATEGORIES: SeedRow[] = [
  { code: 'CONTEXT', slug: 'context', nameRu: 'Контекст', type: 'UNIVERSAL', layer: 'SECONDARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 100 },
  { code: 'THEME', slug: 'themes', nameRu: 'Тематика', type: 'UNIVERSAL', layer: 'SECONDARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 200 },
  { code: 'FORMAT', slug: 'format', nameRu: 'Формат', type: 'UNIVERSAL', layer: 'SECONDARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 300 },

  {
    code: 'RIVER',
    slug: 'river-excursion',
    nameRu: 'Речные прогулки',
    type: 'EVENT_ONLY',
    layer: 'PRIMARY',
    isLandingEnabled: true,
    landingMode: 'TOPIC_HUB',
    landingTopicKey: 'river-cruises',
    sortOrder: 10,
  },
  { code: 'WALKING', slug: 'peshehodnye-ekskursii', nameRu: 'Пешеходные экскурсии', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 20 },
  { code: 'BUS', slug: 'avtobusnye-ekskursii', nameRu: 'Автобусные экскурсии', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 30 },
  { code: 'COMBINED', slug: 'kombinirovannye-ekskursii', nameRu: 'Комбинированные экскурсии', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 40 },
  { code: 'QUEST', slug: 'kvesty', nameRu: 'Квесты', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 50 },
  { code: 'GASTRO', slug: 'gastro-ekskursii', nameRu: 'Гастрономические экскурсии', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 60 },
  { code: 'ROOFTOP', slug: 'ekskursii-po-krysham', nameRu: 'Экскурсии по крышам', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 70 },
  { code: 'EXTREME', slug: 'ekstremalnye-ekskursii', nameRu: 'Экстремальные экскурсии', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 80 },

  { code: 'CONCERT', slug: 'koncerty', nameRu: 'Концерты', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 110 },
  { code: 'SHOW', slug: 'shou', nameRu: 'Шоу', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 120 },
  { code: 'STANDUP', slug: 'standup', nameRu: 'Стендап', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 130 },
  { code: 'THEATER', slug: 'spektakli', nameRu: 'Спектакли', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 140 },
  { code: 'SPORT', slug: 'sportivnye-meropriyatiya', nameRu: 'Спорт', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 150 },
  { code: 'FESTIVAL', slug: 'festivali', nameRu: 'Фестивали', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 160 },
  { code: 'MASTERCLASS', slug: 'master-klassy', nameRu: 'Мастер-классы', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 170 },
  { code: 'PARTY', slug: 'vecherinki', nameRu: 'Вечеринки', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 180 },

  { code: 'MUSEUM', slug: 'muzei', nameRu: 'Музеи', type: 'VENUE_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 210 },
  { code: 'EXHIBITION', slug: 'vystavki', nameRu: 'Выставки', type: 'VENUE_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 220 },
  { code: 'GALLERY', slug: 'galerei', nameRu: 'Галереи', type: 'VENUE_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 230 },
  { code: 'PALACE', slug: 'dvorcy', nameRu: 'Дворцы', type: 'VENUE_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 240 },
  { code: 'PARK', slug: 'parki', nameRu: 'Парки', type: 'VENUE_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 250 },
  { code: 'ART_SPACE', slug: 'art-prostranstva', nameRu: 'Арт-пространства', type: 'VENUE_ONLY', layer: 'PRIMARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 260 },
  { code: 'THEATER', slug: 'teatralnye-ploschadki', nameRu: 'Театральные площадки', type: 'VENUE_ONLY', layer: 'PRIMARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 265 },

  { code: 'NIGHT', slug: 'nochnye', nameRu: 'Ночные', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 410 },
  { code: 'FAMILY', slug: 'semeynye', nameRu: 'Семейные', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 420 },
  { code: 'ROMANTIC', slug: 'romanticheskie', nameRu: 'Романтические', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 430 },
  { code: 'DAYTIME', slug: 'dnevnye', nameRu: 'Дневные', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 440 },
  { code: 'PREMIUM', slug: 'premium', nameRu: 'Премиум', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 450 },

  { code: 'HISTORY', slug: 'istoricheskie', nameRu: 'Исторические', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 510 },
  { code: 'ARCHITECTURE', slug: 'arhitektura', nameRu: 'Архитектура', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 520 },
  { code: 'ART', slug: 'iskusstvo', nameRu: 'Искусство', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 530 },
  { code: 'MYSTIC', slug: 'mistika', nameRu: 'Мистика', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 540 },
  { code: 'WAR_HISTORY', slug: 'voennaya-istoriya', nameRu: 'Военная история', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 550 },

  { code: 'INDOOR', slug: 'v-pomeshchenii', nameRu: 'В помещении', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 610 },
  { code: 'OUTDOOR', slug: 'na-ulice', nameRu: 'На улице', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 620 },
  { code: 'INTERACTIVE', slug: 'interaktiv', nameRu: 'Интерактивные', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 630 },

  { code: 'KIDS', slug: 'kids', nameRu: 'С детьми', type: 'UNIVERSAL', layer: 'SECONDARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 95 },
];

async function upsertAll(tx: Prisma.TransactionClient) {
  for (const item of SUBCATEGORIES) {
    const landingMode = item.landingMode ?? SubcategoryLandingMode.DISABLED;
    const isLandingEnabled = item.isLandingEnabled ?? false;
    await tx.subcategory.upsert({
      where: { code_type: { code: item.code, type: item.type } },
      create: {
        code: item.code,
        slug: item.slug,
        nameRu: item.nameRu,
        type: item.type,
        layer: item.layer,
        parentId: null,
        isActive: item.isActive ?? true,
        isLandingEnabled,
        landingMode,
        landingTopicKey: item.landingTopicKey ?? null,
        sortOrder: item.sortOrder ?? 0,
      },
      update: {
        slug: item.slug,
        nameRu: item.nameRu,
        layer: item.layer,
        isActive: item.isActive ?? true,
        isLandingEnabled,
        landingMode,
        landingTopicKey: item.landingTopicKey ?? null,
        sortOrder: item.sortOrder ?? 0,
      },
    });
  }
}

async function linkParents(tx: Prisma.TransactionClient) {
  for (const item of SUBCATEGORIES) {
    if (!item.parentCode) continue;
    const parent = await tx.subcategory.findFirst({
      where: { code: item.parentCode, type: SubcategoryType.UNIVERSAL },
      select: { id: true },
    });
    if (!parent) {
      throw new Error(`Parent subcategory not found for ${item.code}: ${item.parentCode}`);
    }
    await tx.subcategory.update({
      where: { code_type: { code: item.code, type: item.type } },
      data: { parentId: parent.id },
    });
  }
}

export async function seedCanonicalSubcategories(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await upsertAll(tx);
    await linkParents(tx);
  });
  console.warn(`  ✓ Canonical subcategories whitelist (${SUBCATEGORIES.length} rows, landingMode + hierarchy)`);
}
