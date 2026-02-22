// ==============================================
// Дайбилет — Общие типы между backend и frontend
// ==============================================

/* eslint-disable no-var */
declare var console: { warn: (...args: any[]) => void; log: (...args: any[]) => void; error: (...args: any[]) => void };

// --- Widget Payload Validation ---
export { shortenAddressToStreet } from './address-utils';
export { cityToPrepositional } from './city-declension';
export { normalizeEventTitle } from './normalize-title';
export {
  getFirstPriceKopecks,
  getMinPriceKopecks,
  getPriceByTypeKopecks,
  getPriceKopecks,
  type NormalizedPrice,
  normalizeSessionPrices,
} from './price-normalizer';
export { getSeason, renderTemplate, type SeasonValue } from './seo-utils';
export {
  CURRENT_PAYLOAD_VERSION,
  ensurePayloadVersion,
  type GenericWidgetPayload,
  GenericWidgetPayloadSchema,
  type RadarioWidgetPayload,
  RadarioWidgetPayloadSchema,
  type TCWidgetPayload,
  TCWidgetPayloadSchema,
  type TimepadWidgetPayload,
  TimepadWidgetPayloadSchema,
  validateWidgetPayload,
  type WidgetPayloadValidationResult,
} from './widget-payload';

export { normalizeEventTitle } from './normalize-title';
export { cityToPrepositional } from './city-declension';

export {
  type NormalizedPrice,
  getPriceKopecks,
  normalizeSessionPrices,
  getMinPriceKopecks,
  getPriceByTypeKopecks,
  getFirstPriceKopecks,
} from './price-normalizer';

// --- Enums (дублируем из Prisma для использования на фронте) ---

export enum EventCategory {
  EXCURSION = 'EXCURSION',
  MUSEUM = 'MUSEUM',
  EVENT = 'EVENT',
}

export enum EventAudience {
  ALL = 'ALL',
  KIDS = 'KIDS',
  FAMILY = 'FAMILY',
}

export enum EventSubcategory {
  // EXCURSION
  RIVER = 'RIVER',
  WALKING = 'WALKING',
  BUS = 'BUS',
  COMBINED = 'COMBINED',
  QUEST = 'QUEST',
  GASTRO = 'GASTRO',
  ROOFTOP = 'ROOFTOP',
  EXTREME = 'EXTREME',
  // MUSEUM
  MUSEUM_CLASSIC = 'MUSEUM_CLASSIC',
  EXHIBITION = 'EXHIBITION',
  GALLERY = 'GALLERY',
  PALACE = 'PALACE',
  PARK = 'PARK',
  ART_SPACE = 'ART_SPACE',
  SCULPTURE = 'SCULPTURE',
  CONTEMPORARY = 'CONTEMPORARY',
  // EVENT
  CONCERT = 'CONCERT',
  SHOW = 'SHOW',
  STANDUP = 'STANDUP',
  THEATER = 'THEATER',
  SPORT = 'SPORT',
  FESTIVAL = 'FESTIVAL',
  MASTERCLASS = 'MASTERCLASS',
  PARTY = 'PARTY',
}

export enum TagCategory {
  THEME = 'THEME',
  AUDIENCE = 'AUDIENCE',
  SEASON = 'SEASON',
  SPECIAL = 'SPECIAL',
}

export enum Intensity {
  RELAXED = 'RELAXED',
  NORMAL = 'NORMAL',
  ACTIVE = 'ACTIVE',
}

export enum DaySlot {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
}

export enum OfferSource {
  TC = 'TC',
  TEPLOHOD = 'TEPLOHOD',
  RADARIO = 'RADARIO',
  TIMEPAD = 'TIMEPAD',
  MANUAL = 'MANUAL',
}

export enum PurchaseType {
  WIDGET = 'WIDGET', // Встроенный виджет (TC и др.)
  REDIRECT = 'REDIRECT', // Внешний URL (redirect к оператору)
  REQUEST = 'REQUEST', // Заявка на подтверждение
}

/** Старые значения, которые нужно замапить → логируем при обнаружении */
const COMPAT_LEGACY_KEYS = new Set(['TC_WIDGET', 'API_CHECKOUT', 'REQUEST_ONLY']);

/** @deprecated Маппинг для обратной совместимости. Логирует legacy-значения. */
export const PURCHASE_TYPE_COMPAT: Record<string, PurchaseType> = {
  TC_WIDGET: PurchaseType.WIDGET,
  API_CHECKOUT: PurchaseType.REQUEST,
  REQUEST_ONLY: PurchaseType.REQUEST,
  WIDGET: PurchaseType.WIDGET,
  REDIRECT: PurchaseType.REDIRECT,
  REQUEST: PurchaseType.REQUEST,
};

/**
 * In-memory счётчик (для отладки; основная запись — через onLegacyHit callback).
 */
export const legacyPurchaseTypeHits: Record<string, number> = {};

/** Kill switch: если true — legacy-значения полностью запрещены */
let _compatDisabled = false;

/**
 * Callback для персистентного логирования legacy-хитов.
 * Бэкенд подключает сюда запись в AuditLog.
 */
let _onLegacyHit: ((raw: string, resolved: string, context?: string) => void) | null = null;

/**
 * Установить kill switch (DISABLE_PURCHASE_TYPE_COMPAT=true в env).
 */
export function setCompatDisabled(disabled: boolean): void {
  _compatDisabled = disabled;
}

/**
 * Подключить персистентный logger для legacy hits.
 * Вызывается один раз при bootstrap бэкенда.
 */
export function setCompatLogger(fn: (raw: string, resolved: string, context?: string) => void): void {
  _onLegacyHit = fn;
}

/**
 * Получить in-memory метрики (полезно для мониторинга между рестартами).
 */
export function getCompatMetrics(): Record<string, number> {
  return { ...legacyPurchaseTypeHits };
}

/**
 * Резолвер PurchaseType с метриками + персистентный лог + kill switch.
 * @throws если kill switch включён и получено legacy-значение
 */
export function resolvePurchaseType(raw: string, context?: string): PurchaseType {
  const resolved = PURCHASE_TYPE_COMPAT[raw];
  if (!resolved) {
    console.warn(`[PurchaseType] Unknown value "${raw}"${context ? ` (${context})` : ''}, defaulting to REQUEST`);
    return PurchaseType.REQUEST;
  }

  if (COMPAT_LEGACY_KEYS.has(raw)) {
    // In-memory метрика
    legacyPurchaseTypeHits[raw] = (legacyPurchaseTypeHits[raw] || 0) + 1;

    // Персистентный лог (AuditLog / Redis — подключается через setCompatLogger)
    if (_onLegacyHit) {
      try {
        _onLegacyHit(raw, resolved, context);
      } catch {
        /* не блокируем */
      }
    }

    // Kill switch
    if (_compatDisabled) {
      throw new Error(
        `[PurchaseType] Legacy value "${raw}" запрещён (DISABLE_PURCHASE_TYPE_COMPAT=true).` +
          `${context ? ` Context: ${context}` : ''} Используй "${resolved}".`,
      );
    }

    console.warn(
      `[PurchaseType] COMPAT: "${raw}" → "${resolved}"${context ? ` (${context})` : ''}. ` +
        `Hits: ${legacyPurchaseTypeHits[raw]}. Нужно обновить источник.`,
    );
  }
  return resolved;
}

export enum CheckoutStatus {
  STARTED = 'STARTED',
  VALIDATED = 'VALIDATED',
  REDIRECTED = 'REDIRECTED',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum SupplierRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
}

export enum VenueType {
  MUSEUM = 'MUSEUM',
  GALLERY = 'GALLERY',
  ART_SPACE = 'ART_SPACE',
  EXHIBITION_HALL = 'EXHIBITION_HALL',
  THEATER = 'THEATER',
  PALACE = 'PALACE',
  PARK = 'PARK',
}

export enum DateMode {
  SCHEDULED = 'SCHEDULED',
  OPEN_DATE = 'OPEN_DATE',
}

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  [VenueType.MUSEUM]: 'Музей',
  [VenueType.GALLERY]: 'Галерея',
  [VenueType.ART_SPACE]: 'Арт-пространство',
  [VenueType.EXHIBITION_HALL]: 'Выставочный зал',
  [VenueType.THEATER]: 'Театр',
  [VenueType.PALACE]: 'Дворец',
  [VenueType.PARK]: 'Парк',
};

export const DATE_MODE_LABELS: Record<DateMode, string> = {
  [DateMode.SCHEDULED]: 'По расписанию',
  [DateMode.OPEN_DATE]: 'Открытая дата',
};

// --- Venue Commission Rates (default, %) ---
// Используется как рекомендация при создании venue, если нет индивидуальной ставки

export interface VenueCommissionConfig {
  /** Комиссия по умолчанию, % */
  defaultRate: number;
  /** Промо-ставка для новых партнёров, % */
  promoRate: number;
  /** Длительность промо, месяцев */
  promoMonths: number;
  /** Описание для админки */
  label: string;
}

export const VENUE_COMMISSION_DEFAULTS: Record<VenueType, VenueCommissionConfig> = {
  [VenueType.MUSEUM]: {
    defaultRate: 10,
    promoRate: 7,
    promoMonths: 6,
    label: 'Государственный музей — 10% (промо 7% / 6 мес)',
  },
  [VenueType.GALLERY]: {
    defaultRate: 15,
    promoRate: 7,
    promoMonths: 6,
    label: 'Галерея — 15% (промо 7% / 6 мес)',
  },
  [VenueType.ART_SPACE]: {
    defaultRate: 20,
    promoRate: 7,
    promoMonths: 3,
    label: 'Арт-пространство — 20% (промо 7% / 3 мес)',
  },
  [VenueType.EXHIBITION_HALL]: {
    defaultRate: 15,
    promoRate: 7,
    promoMonths: 6,
    label: 'Выставочный зал — 15% (промо 7% / 6 мес)',
  },
  [VenueType.THEATER]: {
    defaultRate: 12,
    promoRate: 7,
    promoMonths: 6,
    label: 'Театр — 12% (промо 7% / 6 мес)',
  },
  [VenueType.PALACE]: {
    defaultRate: 10,
    promoRate: 7,
    promoMonths: 6,
    label: 'Дворец — 10% (промо 7% / 6 мес)',
  },
  [VenueType.PARK]: {
    defaultRate: 15,
    promoRate: 7,
    promoMonths: 3,
    label: 'Парк — 15% (промо 7% / 3 мес)',
  },
};

/** Получить эффективную комиссию для venue (учитывая индивидуальную и промо) */
export function getEffectiveCommission(
  venueType: VenueType,
  customRate?: number | null,
  createdAt?: Date | string | null,
): number {
  if (customRate != null && customRate > 0) return customRate;

  const config = VENUE_COMMISSION_DEFAULTS[venueType];
  if (!config) return 15; // fallback

  // Проверяем, попадает ли venue в промо-период
  if (createdAt) {
    const created = new Date(createdAt);
    const promoEnd = new Date(created);
    promoEnd.setMonth(promoEnd.getMonth() + config.promoMonths);
    if (new Date() < promoEnd) return config.promoRate;
  }

  return config.defaultRate;
}

export enum ModerationStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  AUTO_APPROVED = 'AUTO_APPROVED',
}

export enum PackageStatus {
  DRAFT = 'DRAFT',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  FULFILLING = 'FULFILLING',
  FULFILLED = 'FULFILLED',
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// --- API Response Types ---

export interface CityListItem {
  id: string;
  slug: string;
  name: string;
  heroImage: string | null;
  _count: { events: number };
}

export interface EventListItem {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  subcategories: EventSubcategory[];
  audience: EventAudience;
  imageUrl: string | null;
  priceFrom: number | null;
  rating: number;
  reviewCount: number;
  durationMinutes: number | null;
  city: { slug: string; name: string };
}

/** Единая карточка каталога: Event или Venue */
export type CatalogItem = CatalogItemEvent | CatalogItemVenue;

export interface CatalogItemBase {
  type: 'event' | 'venue';
  id: string;
  slug: string;
  title: string;
  cityId?: string;
  citySlug?: string;
  cityName?: string;
  imageUrl: string | null;
  priceFrom: number | null;
  rating: number;
  badges?: string[];
  location?: { address?: string | null; metro?: string | null };
  dateLabel: string;
}

export interface CatalogItemEvent extends CatalogItemBase {
  type: 'event';
  category?: EventCategory;
  startsAt?: string | null;
  durationMinutes?: number | null;
  subcategories?: EventSubcategory[];
  audience?: EventAudience;
  tagSlugs?: string[];
  reviewCount?: number;
  nextSessionAt?: string | null;
  departingSoonMinutes?: number | null;
  totalAvailableTickets?: number;
  isOptimalChoice?: boolean;
  dateMode?: string;
}

export interface CatalogItemVenue extends CatalogItemBase {
  type: 'venue';
  venueType: string;
  openingHoursSummary?: string;
  reviewCount?: number;
}

export interface EventDetail extends EventListItem {
  description: string | null;
  shortDescription: string | null;
  minAge: number;
  address: string | null;
  indoor: boolean | null;
  galleryUrls: string[];
  sessions: EventSession[];
  tags: { tag: TagItem }[];
  relatedEvents: EventListItem[];
}

export interface EventSession {
  id: string;
  startsAt: string;
  endsAt: string | null;
  availableTickets: number;
  prices: TicketPrice[];
}

export interface TicketPrice {
  type: string;
  price: number; // в копейках
}

export interface TagItem {
  id: string;
  slug: string;
  name: string;
  category: TagCategory;
}

// --- Planner Types ---

export interface PlanRequest {
  city: string;
  dateFrom: string;
  dateTo: string;
  adults: number;
  children?: number;
  childrenAges?: number[];
  intensity: Intensity;
}

export interface PlanVariant {
  name: string;
  tier: 'economy' | 'optimal' | 'premium';
  totalPrice: number;
  serviceFee: number;
  markup: number;
  grandTotal: number;
  perPerson: number;
  days: PlanDay[];
}

export interface UpsellItem {
  id: string;
  name: string;
  description: string;
  priceKopecks: number;
  category: 'food' | 'transport' | 'vip' | 'souvenir' | 'photo';
  citySlug?: string;
  icon: string;
}

export interface PriceBreakdown {
  basePrice: number;
  serviceFee: number;
  markup: number;
  upsellTotal: number;
  grandTotal: number;
  perPerson: number;
}

export interface PlanDay {
  date: string;
  dayNumber: number;
  slots: PlanSlot[];
}

export interface PlanSlot {
  slot: DaySlot;
  time: string;
  event: EventListItem;
  session: EventSession;
  tickets: {
    adult: { count: number; unitPrice: number; total: number };
    child: { count: number; unitPrice: number; total: number };
  };
  subtotal: number;
}

// --- Checkout Types ---

export interface CheckoutRequest {
  variant: PlanVariant;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  returnUrl: string;
}

export interface CheckoutResponse {
  packageId: string;
  paymentUrl: string;
  expiresAt: string;
}

// --- Voucher Types ---

export interface VoucherData {
  id: string;
  shortCode: string;
  qrCodeUrl: string | null;
  pdfUrl: string | null;
  publicUrl: string;
  package: {
    code: string;
    customerName: string;
    dateFrom: string;
    dateTo: string;
    adults: number;
    children: number;
    totalPrice: number;
    city: { name: string; slug: string };
    items: VoucherItem[];
  };
}

export interface VoucherItem {
  dayNumber: number;
  slot: DaySlot;
  slotTime: string;
  event: { title: string; address: string | null; imageUrl: string | null };
  session: { startsAt: string };
  status: string;
}

// --- Paginated Response ---

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

// --- Helpers ---

/** Формат цены из копеек в рубли */
export function formatPrice(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(kopecks / 100);
}

/** Категория → человекочитаемое название */
export const CATEGORY_LABELS: Record<EventCategory, string> = {
  [EventCategory.EXCURSION]: 'Экскурсии',
  [EventCategory.MUSEUM]: 'Музеи и Арт',
  [EventCategory.EVENT]: 'Мероприятия',
};

/** Аудитория → человекочитаемое название */
export const AUDIENCE_LABELS: Record<EventAudience, string> = {
  [EventAudience.ALL]: 'Для всех',
  [EventAudience.KIDS]: 'Детям',
  [EventAudience.FAMILY]: 'Семейный',
};

/** Подкатегория → человекочитаемое название */
export const SUBCATEGORY_LABELS: Record<EventSubcategory, string> = {
  // EXCURSION
  [EventSubcategory.RIVER]: 'Речная',
  [EventSubcategory.WALKING]: 'Пешеходная',
  [EventSubcategory.BUS]: 'Автобусная',
  [EventSubcategory.COMBINED]: 'Комбинированная',
  [EventSubcategory.QUEST]: 'Квест',
  [EventSubcategory.GASTRO]: 'Гастро',
  [EventSubcategory.ROOFTOP]: 'Крыши',
  [EventSubcategory.EXTREME]: 'Экстрим',
  // MUSEUM
  [EventSubcategory.MUSEUM_CLASSIC]: 'Музей',
  [EventSubcategory.EXHIBITION]: 'Выставка',
  [EventSubcategory.GALLERY]: 'Галерея',
  [EventSubcategory.PALACE]: 'Дворец',
  [EventSubcategory.PARK]: 'Парк',
  [EventSubcategory.ART_SPACE]: 'Арт-пространство',
  [EventSubcategory.SCULPTURE]: 'Скульптура',
  [EventSubcategory.CONTEMPORARY]: 'Современное искусство',
  // EVENT
  [EventSubcategory.CONCERT]: 'Концерт',
  [EventSubcategory.SHOW]: 'Шоу',
  [EventSubcategory.STANDUP]: 'Стендап',
  [EventSubcategory.THEATER]: 'Театр',
  [EventSubcategory.SPORT]: 'Спорт',
  [EventSubcategory.FESTIVAL]: 'Фестиваль',
  [EventSubcategory.MASTERCLASS]: 'Мастер-класс',
  [EventSubcategory.PARTY]: 'Вечеринка',
};

/** Подкатегории, принадлежащие каждой категории (для фильтров) */
export const SUBCATEGORIES_BY_CATEGORY: Record<EventCategory, EventSubcategory[]> = {
  [EventCategory.EXCURSION]: [
    EventSubcategory.RIVER,
    EventSubcategory.WALKING,
    EventSubcategory.BUS,
    EventSubcategory.COMBINED,
    EventSubcategory.QUEST,
    EventSubcategory.GASTRO,
    EventSubcategory.ROOFTOP,
    EventSubcategory.EXTREME,
  ],
  [EventCategory.MUSEUM]: [
    EventSubcategory.MUSEUM_CLASSIC,
    EventSubcategory.EXHIBITION,
    EventSubcategory.GALLERY,
    EventSubcategory.PALACE,
    EventSubcategory.PARK,
    EventSubcategory.ART_SPACE,
    EventSubcategory.SCULPTURE,
    EventSubcategory.CONTEMPORARY,
  ],
  [EventCategory.EVENT]: [
    EventSubcategory.CONCERT,
    EventSubcategory.SHOW,
    EventSubcategory.STANDUP,
    EventSubcategory.THEATER,
    EventSubcategory.SPORT,
    EventSubcategory.FESTIVAL,
    EventSubcategory.MASTERCLASS,
    EventSubcategory.PARTY,
  ],
};

// --- Quick Filters per Category/Audience (витрина) ---

export interface QuickFilter {
  id: string;
  emoji: string;
  label: string;
  /** Параметры запроса, которые этот чип устанавливает */
  params: Record<string, string | number>;
}

export const QUICK_FILTERS: Record<string, QuickFilter[]> = {
  EXCURSION: [
    { id: 'walking', emoji: '🚶', label: 'Пешком', params: { subcategory: 'WALKING' } },
    { id: 'water', emoji: '🚢', label: 'На воде', params: { subcategory: 'RIVER' } },
    { id: 'bus', emoji: '🚌', label: 'Автобус', params: { subcategory: 'BUS' } },
    { id: 'night', emoji: '🌙', label: 'Ночные', params: { tag: 'night' } },
    { id: 'with-guide', emoji: '👨‍🏫', label: 'С гидом', params: { tag: 'with-guide' } },
    { id: 'short', emoji: '⏱', label: 'До 2 часов', params: { maxDuration: 120 } },
    { id: 'rooftop', emoji: '🏙', label: 'Крыши', params: { subcategory: 'ROOFTOP' } },
    { id: 'extreme', emoji: '🔥', label: 'Экстрим', params: { subcategory: 'EXTREME' } },
    { id: 'gastro', emoji: '🍽', label: 'Гастро', params: { subcategory: 'GASTRO' } },
    { id: 'quest', emoji: '🧩', label: 'Квест', params: { subcategory: 'QUEST' } },
    { id: 'combined', emoji: '🔀', label: 'Комбо', params: { subcategory: 'COMBINED' } },
  ],
  MUSEUM: [
    { id: 'open-date', emoji: '📅', label: 'Открытая дата', params: { dateMode: 'OPEN_DATE' } },
    { id: 'museum', emoji: '🎟', label: 'Билет', params: { subcategory: 'MUSEUM_CLASSIC' } },
    { id: 'with-guide', emoji: '👨‍🏫', label: 'С экскурсией', params: { tag: 'with-guide' } },
    { id: 'no-queue', emoji: '⚡', label: 'Без очереди', params: { tag: 'no-queue' } },
    { id: 'exhibition', emoji: '🆕', label: 'Выставки', params: { subcategory: 'EXHIBITION' } },
    { id: 'palace', emoji: '🏛', label: 'Дворцы', params: { subcategory: 'PALACE' } },
    { id: 'gallery', emoji: '🖼', label: 'Галереи', params: { subcategory: 'GALLERY' } },
    { id: 'art-space', emoji: '🎨', label: 'Арт', params: { subcategory: 'ART_SPACE' } },
    { id: 'contemporary', emoji: '🖌', label: 'Совр. искусство', params: { subcategory: 'CONTEMPORARY' } },
    { id: 'park', emoji: '🌳', label: 'Парки', params: { subcategory: 'PARK' } },
  ],
  EVENT: [
    { id: 'concert', emoji: '🎵', label: 'Концерты', params: { subcategory: 'CONCERT' } },
    { id: 'theater', emoji: '🎭', label: 'Театр', params: { subcategory: 'THEATER' } },
    { id: 'standup', emoji: '😂', label: 'Стендап', params: { subcategory: 'STANDUP' } },
    { id: 'show', emoji: '🎪', label: 'Шоу', params: { subcategory: 'SHOW' } },
    { id: 'sport', emoji: '🏟', label: 'Спорт', params: { subcategory: 'SPORT' } },
    { id: 'festival', emoji: '🎉', label: 'Фестиваль', params: { subcategory: 'FESTIVAL' } },
    { id: 'masterclass', emoji: '🎓', label: 'Мастер-класс', params: { subcategory: 'MASTERCLASS' } },
    { id: 'party', emoji: '🪩', label: 'Вечеринка', params: { subcategory: 'PARTY' } },
  ],
  KIDS: [
    { id: 'baby', emoji: '👶', label: '0+', params: { maxMinAge: 0 } },
    { id: 'child6', emoji: '👦', label: '6+', params: { maxMinAge: 6 } },
    { id: 'school', emoji: '🎒', label: 'Школьникам', params: { maxMinAge: 14 } },
    { id: 'interactive', emoji: '🎮', label: 'Интерактив', params: { tag: 'interactive' } },
    { id: 'family', emoji: '👨‍👩‍👧', label: 'Семейные', params: { audience: 'FAMILY' } },
  ],
};

// --- Системные теги для бейджей (не меню — ранжирование и бейджи) ---

export interface SystemTagBadge {
  slug: string;
  emoji: string;
  label: string;
  color: string; // tailwind bg class
  textColor: string; // tailwind text class
}

export const SYSTEM_TAG_BADGES: SystemTagBadge[] = [
  { slug: 'night', emoji: '🌙', label: 'Ночная', color: 'bg-indigo-500/90', textColor: 'text-white' },
  { slug: 'water', emoji: '🚢', label: 'На воде', color: 'bg-sky-500/90', textColor: 'text-white' },
  { slug: 'romantic', emoji: '💕', label: 'Романтика', color: 'bg-rose-400/90', textColor: 'text-white' },
  {
    slug: 'first-time-city',
    emoji: '🌟',
    label: 'Для первого визита',
    color: 'bg-amber-400/90',
    textColor: 'text-amber-950',
  },
  { slug: 'bad-weather-ok', emoji: '☂️', label: 'В любую погоду', color: 'bg-teal-500/90', textColor: 'text-white' },
  { slug: 'no-queue', emoji: '⚡', label: 'Без очереди', color: 'bg-emerald-500/90', textColor: 'text-white' },
  { slug: 'with-guide', emoji: '👨‍🏫', label: 'С гидом', color: 'bg-violet-500/90', textColor: 'text-white' },
  { slug: 'audioguide', emoji: '🎧', label: 'Аудиогид', color: 'bg-purple-500/90', textColor: 'text-white' },
  { slug: 'interactive', emoji: '🎮', label: 'Интерактив', color: 'bg-fuchsia-500/90', textColor: 'text-white' },
];

// --- Venue Types ---

export interface VenueListItem {
  id: string;
  slug: string;
  title: string;
  shortTitle?: string | null;
  venueType: string;
  imageUrl?: string | null;
  city?: { name: string; slug: string };
  address?: string | null;
  metro?: string | null;
  priceFrom?: number | null;
  rating: number;
  reviewCount: number;
  isFeatured?: boolean;
}

export interface VenueDetail extends VenueListItem {
  cityId?: string;
  description?: string | null;
  shortDescription?: string | null;
  galleryUrls: string[];
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  openingHours?: Record<string, string | null> | null;
  lat?: number | null;
  lng?: number | null;
  district?: string | null;
  operator?: { id: string; name: string; slug: string; logo?: string | null } | null;
  offers: any[];
  exhibitions: any[];
  reviews?: any[];
  recommendPercent?: number;
  highlights?: string[];
  faq?: { q: string; a: string }[];
  features?: string[];
  externalRating?: number | null;
  externalSource?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  relatedArticles?: any[];
}

/** Интенсивность → описание */
export const INTENSITY_LABELS: Record<Intensity, { label: string; description: string }> = {
  [Intensity.RELAXED]: { label: 'Спокойный', description: '1-2 события в день, долгие перерывы' },
  [Intensity.NORMAL]: { label: 'Оптимальный', description: '2-3 события в день' },
  [Intensity.ACTIVE]: { label: 'Активный', description: '3-4 события в день, максимум впечатлений' },
};
