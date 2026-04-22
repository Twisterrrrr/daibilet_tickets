/**
 * Расширение справочника подкатегорий: доп. PRIMARY (EVENT_ONLY) и SECONDARY (UNIVERSAL).
 * Подключается в subcategories-canonical.seed.ts через spread.
 */
import type { SubcategoryLandingMode } from '../../src/prisma-client';
import type { SubcategoryLayer as SubcategoryLayerT, SubcategoryType as SubcategoryTypeT } from '../../src/prisma-client';

export type TaxonomySeedRow = {
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

/**
 * sortOrder: 7000+ — блок расширения, не пересекается с каноническим ядром.
 * Родители-группы (UNIVERSAL) идут в начале массива, затем дочерние строки.
 */
export const TAXONOMY_EXPANSION_ROWS: TaxonomySeedRow[] = [
  // —— Группы (родители для универсальных фасетов) ——
  {
    code: 'SEASONALITY',
    slug: 'taxonomy-seasonality',
    nameRu: 'Сезонность',
    type: 'UNIVERSAL',
    layer: 'SECONDARY',
    isLandingEnabled: false,
    landingMode: 'DISABLED',
    sortOrder: 7000,
  },
  {
    code: 'MARKETING_SEO',
    slug: 'taxonomy-marketing-seo',
    nameRu: 'Маркетинг и SEO',
    type: 'UNIVERSAL',
    layer: 'SECONDARY',
    isLandingEnabled: false,
    landingMode: 'DISABLED',
    sortOrder: 7001,
  },
  {
    code: 'CONTENT_TAG',
    slug: 'taxonomy-content',
    nameRu: 'Контент и подача',
    type: 'UNIVERSAL',
    layer: 'SECONDARY',
    isLandingEnabled: false,
    landingMode: 'DISABLED',
    sortOrder: 7002,
  },
  {
    code: 'VISUAL_SOCIAL',
    slug: 'taxonomy-visual',
    nameRu: 'Визуал и соцсети',
    type: 'UNIVERSAL',
    layer: 'SECONDARY',
    isLandingEnabled: false,
    landingMode: 'DISABLED',
    sortOrder: 7003,
  },

  // —— 6. Универсальные (применимы ко всем направлениям) ——
  { code: 'FOR_COUPLES', slug: 'for-couples', nameRu: 'Для пары', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7010 },
  { code: 'BUDGET_FRIENDLY', slug: 'budget-friendly', nameRu: 'Бюджетный', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7011 },
  { code: 'OPEN_AIR_FMT', slug: 'open-air-format', nameRu: 'На открытом воздухе', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7012 },
  { code: 'NIGHT_FORMAT', slug: 'night-format', nameRu: 'Ночной (формат)', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7013 },
  { code: 'DAY_FORMAT', slug: 'day-format', nameRu: 'Дневной (формат)', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7014 },

  { code: 'SEASONAL', slug: 'seasonal', nameRu: 'Сезонное', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'SEASONALITY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7020 },
  { code: 'SUMMER', slug: 'summer-season', nameRu: 'Летнее', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'SEASONALITY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7021 },
  { code: 'WINTER', slug: 'winter-season', nameRu: 'Зимнее', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'SEASONALITY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7022 },

  { code: 'POPULAR', slug: 'popular-picks', nameRu: 'Популярное', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'MARKETING_SEO', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7030 },
  { code: 'NEW_ARRIVAL', slug: 'new-arrival', nameRu: 'Новое', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'MARKETING_SEO', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7031 },
  { code: 'TOP_RATED', slug: 'top-rated', nameRu: 'Топ', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'MARKETING_SEO', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7032 },
  { code: 'LOCAL_FAVORITE', slug: 'local-favorite', nameRu: 'Местный фаворит', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'MARKETING_SEO', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7033 },
  { code: 'HIDDEN_GEM', slug: 'hidden-gem', nameRu: 'Скрытая жемчужина', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'MARKETING_SEO', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7034 },

  { code: 'EDUCATIONAL', slug: 'educational-content', nameRu: 'Познавательное', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTENT_TAG', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7040 },
  { code: 'ENTERTAINING', slug: 'entertaining-content', nameRu: 'Развлекательное', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTENT_TAG', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7041 },
  { code: 'WITH_GUIDE_TAG', slug: 'with-guide-tag', nameRu: 'С гидом', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTENT_TAG', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7042 },
  { code: 'SELF_GUIDED', slug: 'self-guided', nameRu: 'Без гида', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTENT_TAG', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7043 },

  { code: 'INSTAGRAM_WORTHY', slug: 'instagram-worthy', nameRu: 'Инстаграмное', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'VISUAL_SOCIAL', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7050 },

  {
    code: 'EXCURSION_BASE',
    slug: 'taxonomy-excursion-base-types',
    nameRu: 'Экскурсии: базовый тип (тег)',
    type: 'UNIVERSAL',
    layer: 'SECONDARY',
    isLandingEnabled: false,
    landingMode: 'DISABLED',
    sortOrder: 7055,
  },
  { code: 'EXC_BASE_OVERVIEW', slug: 'exc-base-overview', nameRu: 'Обзорная', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'EXCURSION_BASE', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7056 },
  { code: 'EXC_BASE_WALKING', slug: 'exc-base-walking', nameRu: 'Пешеходная', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'EXCURSION_BASE', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7057 },
  { code: 'EXC_BASE_BUS', slug: 'exc-base-bus', nameRu: 'Автобусная', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'EXCURSION_BASE', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7058 },
  { code: 'EXC_BASE_WATER', slug: 'exc-base-water', nameRu: 'Водная', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'EXCURSION_BASE', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7059 },
  { code: 'EXC_BASE_PRIVATE', slug: 'exc-base-private', nameRu: 'Индивидуальная', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'EXCURSION_BASE', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7060 },
  { code: 'EXC_BASE_GROUP', slug: 'exc-base-group', nameRu: 'Групповая', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'EXCURSION_BASE', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7061 },

  // —— Экскурсии: тематика и формат (SECONDARY UNIVERSAL) ——
  { code: 'LITERARY_THEME', slug: 'literary-excursions', nameRu: 'Литературная', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7100 },
  { code: 'RELIGIOUS_THEME', slug: 'religious-excursions', nameRu: 'Религиозная', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7101 },
  { code: 'GASTRONOMIC_THEME', slug: 'gastronomic-theme', nameRu: 'Гастрономическая', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7102 },
  { code: 'INDUSTRIAL_THEME', slug: 'industrial-behind-scenes', nameRu: 'Промышленная (закулисье, заводы)', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7103 },
  { code: 'NATURE_THEME', slug: 'nature-theme-excursion', nameRu: 'Природная', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7104 },
  { code: 'SUBURBAN_THEME', slug: 'suburban-excursions', nameRu: 'Загородная', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7105 },

  { code: 'PHOTO_TOUR', slug: 'photo-excursion', nameRu: 'Фото-экскурсия', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7110 },
  { code: 'QUEST_TOUR', slug: 'quest-tour', nameRu: 'Экскурсия-квест', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7111 },
  { code: 'AUDIO_TOUR', slug: 'audio-tour', nameRu: 'Аудиоэкскурсия', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7112 },
  { code: 'SELF_PACED_TOUR', slug: 'self-paced-tour', nameRu: 'Самостоятельная', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7113 },

  { code: 'SCHOOL_AUDIENCE', slug: 'school-audience', nameRu: 'Школьная', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7120 },
  {
    code: 'CHILDREN_EXCURS_AUDIENCE',
    slug: 'excursion-children-audience',
    nameRu: 'Детская аудитория (экскурсии)',
    type: 'UNIVERSAL',
    layer: 'SECONDARY',
    parentCode: 'CONTEXT',
    isLandingEnabled: true,
    landingMode: 'AUTO',
    sortOrder: 7121,
  },

  { code: 'UNUSUAL_FORMAT', slug: 'unusual-experience', nameRu: 'Необычная', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7130 },
  { code: 'AUTHOR_LED', slug: 'author-led', nameRu: 'Авторская', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7131 },
  { code: 'MULTI_DAY_TOUR', slug: 'multi-day-tour', nameRu: 'Многодневная', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7132 },

  // —— Мероприятия: SECONDARY теги ——
  { code: 'PERFORMANCE_ART', slug: 'performance-art', nameRu: 'Перформанс', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7200 },
  { code: 'OPEN_AIR_EVENT_TAG', slug: 'open-air-event', nameRu: 'Open-air', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7201 },
  { code: 'PREMIERE_TAG', slug: 'premiere-event', nameRu: 'Премьера', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'MARKETING_SEO', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7202 },
  { code: 'WORKSHOP_TAG', slug: 'workshop-event', nameRu: 'Воркшоп', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7203 },
  { code: 'CONFERENCE_TAG', slug: 'conference-event', nameRu: 'Конференция', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7204 },
  { code: 'MEETUP_TAG', slug: 'meetup-event', nameRu: 'Митап', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7205 },
  { code: 'EXHIBITION_EVENT_TAG', slug: 'exhibition-as-event', nameRu: 'Выставка (как событие)', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7206 },
  { code: 'SEASONAL_HOLIDAY_TAG', slug: 'seasonal-holiday-event', nameRu: 'Сезонное событие (НГ, 9 мая и т.д.)', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'SEASONALITY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7207 },
  { code: 'KIDS_EVENT_TAG', slug: 'kids-event', nameRu: 'Детское мероприятие', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7208 },
  { code: 'FAMILY_EVENT_TAG', slug: 'family-event', nameRu: 'Семейное мероприятие', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7209 },
  { code: 'SPEKTAKL_TAG', slug: 'spektakl-format', nameRu: 'Спектакль', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7210 },
  { code: 'IMMERSIVE_FORMAT_TAG', slug: 'immersive-format', nameRu: 'Иммерсивный формат', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7211 },
  { code: 'PUBLIC_LECTURE_TAG', slug: 'public-lecture', nameRu: 'Публичная лекция', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7212 },

  // —— Музеи и арт: SECONDARY ——
  { code: 'EXPO_HALL', slug: 'exhibition-hall-venue', nameRu: 'Выставочный зал', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7300 },
  { code: 'PERMANENT_EXPO', slug: 'permanent-exhibition', nameRu: 'Постоянная экспозиция', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7301 },
  { code: 'TEMP_EXPO', slug: 'temporary-exhibition', nameRu: 'Временная выставка', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7302 },
  { code: 'INTERACTIVE_EXPO', slug: 'interactive-exhibition', nameRu: 'Интерактивная экспозиция', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7303 },
  { code: 'ART_CONTEMPORARY_TAG', slug: 'contemporary-art-tag', nameRu: 'Современное искусство', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7304 },
  { code: 'ART_CLASSICAL_TAG', slug: 'classical-art-tag', nameRu: 'Классическое искусство', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7305 },
  { code: 'MUSEUM_HISTORICAL_TAG', slug: 'historical-museum-tag', nameRu: 'Исторический музей', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7306 },
  { code: 'MUSEUM_SCIENCE_TAG', slug: 'science-museum-tag', nameRu: 'Научный музей', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7307 },
  { code: 'MUSEUM_MILITARY_TAG', slug: 'military-museum-tag', nameRu: 'Военный музей', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7308 },
  { code: 'OPEN_AIR_MUSEUM_TAG', slug: 'open-air-museum', nameRu: 'Музей под открытым небом', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7309 },
  { code: 'CULTURAL_HERITAGE_TAG', slug: 'cultural-heritage', nameRu: 'Культурное наследие', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7310 },
  { code: 'LANDMARK_TAG', slug: 'landmark-visit', nameRu: 'Достопримечательность', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7311 },
  { code: 'KIDS_MUSEUM_TAG', slug: 'kids-museum', nameRu: 'Детский музей', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'CONTEXT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7312 },

  // —— Активный отдых: SECONDARY ——
  { code: 'SPORT_TAG', slug: 'sport-activity', nameRu: 'Спорт', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7400 },
  { code: 'ADVENTURE_TAG', slug: 'adventure-activity', nameRu: 'Приключение', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7401 },
  { code: 'HIKING_TAG', slug: 'hiking-activity', nameRu: 'Поход', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7402 },
  { code: 'TREKKING_TAG', slug: 'trekking', nameRu: 'Трекинг', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7403 },
  { code: 'SHOOTING_TAG', slug: 'tag-shooting-sports', nameRu: 'Стрельба', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7404 },
  { code: 'ICE_SKATING_TAG', slug: 'ice-skating', nameRu: 'Каток', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7405 },
  { code: 'SKIING_TAG', slug: 'skiing', nameRu: 'Лыжи', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7406 },
  { code: 'YOGA_TAG', slug: 'yoga-activity', nameRu: 'Йога', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7407 },
  { code: 'FITNESS_TAG', slug: 'fitness-activity', nameRu: 'Фитнес', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7408 },
  { code: 'WELLNESS_TAG', slug: 'wellness-activity', nameRu: 'Wellness', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7409 },
  { code: 'SPA_TAG', slug: 'spa-activity', nameRu: 'СПА', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7410 },
  { code: 'TEAM_BUILDING_TAG', slug: 'team-building', nameRu: 'Тимбилдинг', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7411 },
  { code: 'ACTIVE_QUEST_TAG', slug: 'active-quest', nameRu: 'Активный квест', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7412 },
  { code: 'BIKE_LEISURE_TAG', slug: 'bike-ride-leisure', nameRu: 'Велопрогулка', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7413 },
  { code: 'ROCK_CLIMBING_TAG', slug: 'rock-climbing-tag', nameRu: 'Скалолазание', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7414 },
  { code: 'WATER_SPORT_LEISURE_TAG', slug: 'water-sport-leisure', nameRu: 'Водный спорт (тег)', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7415 },

  // —— Развлечения: SECONDARY ——
  { code: 'AMUSEMENT_PARK_TAG', slug: 'amusement-park', nameRu: 'Парк аттракционов', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7500 },
  { code: 'ZOO_TAG', slug: 'zoo-visit', nameRu: 'Зоопарк', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7501 },
  { code: 'AQUARIUM_TAG', slug: 'aquarium-visit', nameRu: 'Океанариум', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7502 },
  { code: 'CIRCUS_TAG', slug: 'circus-show', nameRu: 'Цирк', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7503 },
  { code: 'CINEMA_TAG', slug: 'cinema-event', nameRu: 'Кинотеатр', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7504 },
  { code: 'NIGHTCLUB_TAG', slug: 'nightclub', nameRu: 'Ночной клуб', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7505 },
  { code: 'BAR_TAG', slug: 'bar-venue', nameRu: 'Бар', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7506 },
  { code: 'KARAOKE_TAG', slug: 'karaoke', nameRu: 'Караоке', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7507 },
  { code: 'VR_TAG', slug: 'vr-experience', nameRu: 'VR', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7508 },
  { code: 'ARCADE_TAG', slug: 'arcade-games', nameRu: 'Игровые автоматы', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7509 },
  { code: 'QUEST_ROOM_TAG', slug: 'quest-room', nameRu: 'Квест-комната', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7510 },
  { code: 'BOWLING_TAG', slug: 'bowling', nameRu: 'Боулинг', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7511 },
  { code: 'BILLIARDS_TAG', slug: 'billiards', nameRu: 'Бильярд', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7512 },
  { code: 'FOOD_COURT_TAG', slug: 'food-court', nameRu: 'Фудкорт', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7513 },
  { code: 'STREET_FOOD_TAG', slug: 'street-food', nameRu: 'Стритфуд', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'THEME', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7514 },
  { code: 'FAIR_TAG', slug: 'fair-market', nameRu: 'Ярмарка / маркет', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7515 },
  { code: 'MARKET_STANDALONE', slug: 'market-standalone', nameRu: 'Маркет', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7516 },
  { code: 'FAIR_STANDALONE', slug: 'fair-standalone', nameRu: 'Ярмарка', type: 'UNIVERSAL', layer: 'SECONDARY', parentCode: 'FORMAT', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 7517 },

  // —— PRIMARY EVENT_ONLY (доп. форматы для выбора основного типа) ——
  { code: 'GROUP_TOURS', slug: 'group-tours', nameRu: 'Групповые экскурсии', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 39 },
  { code: 'OPERA', slug: 'opera', nameRu: 'Опера', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 116 },
  { code: 'BALLET', slug: 'ballet', nameRu: 'Балет', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 117 },
  { code: 'OPEN_AIR_PRIMARY', slug: 'open-air', nameRu: 'Open-air', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 176 },
  { code: 'CONFERENCE_PRIMARY', slug: 'conference', nameRu: 'Конференция', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 166 },
  { code: 'MEETUP_PRIMARY', slug: 'meetup', nameRu: 'Митап', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 167 },
  { code: 'SEASONAL_EVENT_PRIMARY', slug: 'seasonal-events', nameRu: 'Сезонные события', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 183 },

  { code: 'SHOOTING_RANGE', slug: 'shooting-range-events', nameRu: 'Стрельба / тир', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 315 },
  { code: 'ICE_SKATING', slug: 'ice-skating-primary', nameRu: 'Каток', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 316 },
  { code: 'SKIING', slug: 'skiing-primary', nameRu: 'Лыжи', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 317 },
  { code: 'YOGA_FITNESS', slug: 'yoga-fitness', nameRu: 'Йога и фитнес', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 318 },
  { code: 'WELLNESS_SPA', slug: 'wellness-spa', nameRu: 'Wellness и СПА', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 319 },
  { code: 'TEAM_BUILDING', slug: 'team-building-primary', nameRu: 'Тимбилдинг', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 322 },
  { code: 'HIKING', slug: 'hiking-primary', nameRu: 'Походы', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 323 },
  { code: 'TRACKING', slug: 'tracking', nameRu: 'Трекинг', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 324 },

  { code: 'ZOO', slug: 'zoo', nameRu: 'Зоопарк', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 415 },
  { code: 'AQUARIUM', slug: 'aquarium', nameRu: 'Океанариум', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 416 },
  { code: 'CIRCUS', slug: 'circus', nameRu: 'Цирк', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 417 },
  { code: 'CINEMA', slug: 'cinema', nameRu: 'Кинотеатр', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 418 },
  { code: 'NIGHTCLUB', slug: 'nightclub-primary', nameRu: 'Ночной клуб', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 425 },
  { code: 'VR_ARCADE', slug: 'vr-arcade', nameRu: 'VR / игровые автоматы', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 428 },
  { code: 'BOWLING_ENT', slug: 'bowling-ent', nameRu: 'Боулинг', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 429 },
  { code: 'FOOD_COURT_ENT', slug: 'food-court-ent', nameRu: 'Фудкорт / стритфуд', type: 'EVENT_ONLY', layer: 'PRIMARY', isLandingEnabled: true, landingMode: 'AUTO', sortOrder: 430 },
];
