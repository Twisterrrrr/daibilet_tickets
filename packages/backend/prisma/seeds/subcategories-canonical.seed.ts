/**
 * Канонический whitelist подкатегорий: code+type, иерархия parentCode, landingMode / isLandingEnabled.
 * Upsert по @@unique([code, type]); slug в update — намеренно (выравнивание SEO-путей под политику).
 * См. docs/Architecture.md § routing policy subcategories.
 */
import { SubcategoryLayer, SubcategoryType } from '../../src/prisma-client';
import type {
  PrismaClient,
  SubcategoryLandingMode,
  SubcategoryLayer as SubcategoryLayerT,
  SubcategoryType as SubcategoryTypeT,
} from '../../src/prisma-client';
import { TAXONOMY_EXPANSION_ROWS } from './subcategories-taxonomy-expansion';

type SeedRow = {
  code: string;
  slug: string;
  nameRu: string;
  type: SubcategoryTypeT;
  layer: SubcategoryLayerT;
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
  { code: 'WALKING', slug: 'walking-tours', nameRu: 'Пешие', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 20 },
  { code: 'BUS', slug: 'bus-tours', nameRu: 'Автобусные', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 30 },
  { code: 'BOAT_TOURS', slug: 'boat-tours', nameRu: 'Водные экскурсии', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 35 },
  { code: 'NIGHT_TOURS', slug: 'night-tours', nameRu: 'Ночные', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 36 },
  { code: 'CITY_TOURS', slug: 'city-tours', nameRu: 'Обзорные', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 37 },
  { code: 'PRIVATE_TOURS', slug: 'private-tours', nameRu: 'Индивидуальные', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 38 },
  // Legacy PRIMARY (deprecated): keep inactive to avoid new assignments
  { code: 'COMBINED', slug: 'kombinirovannye-ekskursii', nameRu: 'Комбинированные экскурсии', type: 'EVENT_ONLY', layer: 'PRIMARY', isActive: false, isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 40 },
  { code: 'QUEST', slug: 'kvesty', nameRu: 'Квесты (legacy)', type: 'EVENT_ONLY', layer: 'PRIMARY', isActive: false, isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 50 },

  // Canonical PRIMARY (matrix)
  { code: 'GASTRO', slug: 'gastro-tours', nameRu: 'Гастро-экскурсии', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 60 },
  { code: 'ROOFTOP', slug: 'rooftop', nameRu: 'Крыши', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 70 },
  { code: 'EXTREME', slug: 'extreme', nameRu: 'Экстрим', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 80 },
  { code: 'QUESTS', slug: 'quests', nameRu: 'Квесты', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 85 },

  { code: 'CONCERT', slug: 'concerts', nameRu: 'Концерты', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 110 },
  { code: 'JAZZ', slug: 'jazz', nameRu: 'Джаз', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 112 },
  { code: 'THEATER', slug: 'theater', nameRu: 'Театр', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 115 },
  { code: 'SHOW', slug: 'shows', nameRu: 'Шоу', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 120 },
  { code: 'STANDUP', slug: 'standup', nameRu: 'Стендап', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 130 },
  { code: 'FESTIVAL', slug: 'festivals', nameRu: 'Фестивали', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 160 },
  { code: 'LECTURES', slug: 'lectures', nameRu: 'Лекции', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 165 },
  { code: 'KIDS_SHOWS', slug: 'kids-shows', nameRu: 'Детские спектакли/шоу', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 170 },
  { code: 'IMMERSIVE_SHOWS', slug: 'immersive-shows', nameRu: 'Иммерсивные шоу', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 175 },
  { code: 'SPORT_EVENTS', slug: 'sport-events', nameRu: 'Спортивные активности', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 180 },
  { code: 'MASTERCLASS', slug: 'masterclasses', nameRu: 'Мастер-классы', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 172 },
  { code: 'PARTY', slug: 'parties', nameRu: 'Вечеринки', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 182 },

  /**
   * События категории MUSEUM: отдельные PRIMARY + EVENT_ONLY (тот же code, что в whitelist API;
   * slug уникален от строк VENUE_ONLY для площадок).
   */
  {
    code: 'MUSEUM_CLASSIC',
    slug: 'museums',
    nameRu: 'Музеи',
    type: 'EVENT_ONLY',
    layer: 'PRIMARY',
    isLandingEnabled: true,
    landingMode: 'AUTO',
    sortOrder: 210,
  },
  {
    code: 'EXHIBITION',
    slug: 'exhibitions',
    nameRu: 'Выставки',
    type: 'EVENT_ONLY',
    layer: 'PRIMARY',
    isLandingEnabled: true,
    landingMode: 'AUTO',
    sortOrder: 220,
  },
  {
    code: 'PLANETARIUMS',
    slug: 'planetariums',
    nameRu: 'Планетарии',
    type: 'EVENT_ONLY',
    layer: 'PRIMARY',
    isLandingEnabled: true,
    landingMode: 'AUTO',
    sortOrder: 225,
  },
  {
    code: 'GALLERY',
    slug: 'gallery-visits',
    nameRu: 'Посещение галерей',
    type: 'EVENT_ONLY',
    layer: 'PRIMARY',
    isLandingEnabled: true,
    landingMode: 'AUTO',
    sortOrder: 230,
  },
  {
    code: 'PALACE',
    slug: 'palace-visits',
    nameRu: 'Посещение дворцов',
    type: 'EVENT_ONLY',
    layer: 'PRIMARY',
    isLandingEnabled: true,
    landingMode: 'AUTO',
    sortOrder: 240,
  },
  {
    code: 'PARK',
    slug: 'park-visits',
    nameRu: 'Посещение парков',
    type: 'EVENT_ONLY',
    layer: 'PRIMARY',
    isLandingEnabled: true,
    landingMode: 'AUTO',
    sortOrder: 250,
  },
  {
    code: 'ART_SPACE',
    slug: 'art-space-visits',
    nameRu: 'Посещение арт-пространств',
    type: 'EVENT_ONLY',
    layer: 'PRIMARY',
    isLandingEnabled: true,
    landingMode: 'AUTO',
    sortOrder: 260,
  },
  {
    code: 'SCULPTURE',
    slug: 'poseshchenie-skulptura',
    nameRu: 'Скульптура',
    type: 'EVENT_ONLY',
    layer: 'PRIMARY',
    isActive: false,
    isLandingEnabled: false,
    landingMode: 'DISABLED',
    sortOrder: 262,
  },
  {
    code: 'CONTEMPORARY',
    slug: 'poseshchenie-sovremennoe-iskusstvo',
    nameRu: 'Современное искусство',
    type: 'EVENT_ONLY',
    layer: 'PRIMARY',
    isActive: false,
    isLandingEnabled: false,
    landingMode: 'DISABLED',
    sortOrder: 264,
  },

  // ACTIVITIES
  { code: 'WATER_SPORTS', slug: 'water-sports', nameRu: 'Водный спорт', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 300 },
  { code: 'CYCLING', slug: 'cycling', nameRu: 'Велопрогулки', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 305 },
  { code: 'OUTDOOR_ACTIVITIES', slug: 'outdoor', nameRu: 'Активности на природе', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 307 },
  { code: 'KARTING', slug: 'karting', nameRu: 'Картинг', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 310 },
  { code: 'CLIMBING', slug: 'climbing', nameRu: 'Скалодромы', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 320 },

  // ENTERTAINMENT
  { code: 'INTERACTIVE_ENT', slug: 'interactive', nameRu: 'Интерактив', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 400 },
  { code: 'KIDS_ACTIVITIES', slug: 'kids-activities', nameRu: 'Детские активности', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 405 },
  { code: 'GAME_ZONES', slug: 'game-zones', nameRu: 'Игровые зоны', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 407 },
  { code: 'ATTRACTIONS', slug: 'attractions', nameRu: 'Аттракционы', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 410 },
  { code: 'ESCAPE_ROOMS', slug: 'escape-rooms', nameRu: 'Эскейп-румы', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 420 },

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
  { code: 'PREMIUM', slug: 'premium', nameRu: 'Премиум', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 450 },

  { code: 'HISTORY', slug: 'istoricheskie', nameRu: 'Исторические', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 510 },
  { code: 'ARCHITECTURE', slug: 'arhitektura', nameRu: 'Архитектура', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 520 },
  { code: 'ART', slug: 'iskusstvo', nameRu: 'Искусство', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 530 },
  { code: 'MYSTIC', slug: 'mistika', nameRu: 'Мистика', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 540 },
  { code: 'WAR_HISTORY', slug: 'voennaya-istoriya', nameRu: 'Военная история', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 550 },

  { code: 'INDOOR', slug: 'v-pomeshchenii', nameRu: 'В помещении', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 610 },
  { code: 'OUTDOOR', slug: 'na-ulice', nameRu: 'На улице', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 620 },
  { code: 'INTERACTIVE', slug: 'interaktiv', nameRu: 'Интерактивные', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: false, landingMode: 'DISABLED', sortOrder: 630 },

  { code: 'KIDS', slug: 'kids', nameRu: 'С детьми', type: 'UNIVERSAL', layer: 'SECONDARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 95 },

  ...TAXONOMY_EXPANSION_ROWS,
];

async function upsertAll(tx: PrismaClient) {
  for (const item of SUBCATEGORIES) {
    const landingMode = item.landingMode ?? SubcategoryLandingMode.DISABLED;
    const isLandingEnabled = item.isLandingEnabled ?? false;
    try {
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
    } catch (e: unknown) {
      // On some databases older data may already occupy the slug with a different code/type.
      // For seeds we skip such rows to keep the run non-blocking and idempotent.
      if (typeof e === 'object' && e && 'code' in e && (e as { code?: unknown }).code === 'P2002') {
        console.warn(`⚠ Subcategory slug already exists (${item.slug}) — skipping canonical seed row code=${item.code} type=${item.type}`);
        continue;
      }
      throw e;
    }
  }
}

async function linkParents(tx: PrismaClient) {
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

async function deactivateLegacyPrimaryEventOnly(tx: PrismaClient) {
  const allowedCodes = SUBCATEGORIES.filter((s) => s.type === 'EVENT_ONLY' && s.layer === 'PRIMARY' && (s.isActive ?? true)).map((s) => s.code);
  await tx.subcategory.updateMany({
    where: {
      type: SubcategoryType.EVENT_ONLY,
      layer: SubcategoryLayer.PRIMARY,
      code: { notIn: allowedCodes },
    },
    data: { isActive: false },
  });
}

export async function seedCanonicalSubcategories(prisma: PrismaClient): Promise<void> {
  // Intentionally not wrapped in a single DB transaction:
  // if historical data violates unique constraints (e.g. slug already occupied),
  // we want to be able to skip that row and continue seeding.
  await upsertAll(prisma);
  await linkParents(prisma);
  await deactivateLegacyPrimaryEventOnly(prisma);
  console.warn(`  ✓ Canonical subcategories whitelist (${SUBCATEGORIES.length} rows, landingMode + hierarchy)`);
}
