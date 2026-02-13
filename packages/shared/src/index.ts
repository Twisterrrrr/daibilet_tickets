// ==============================================
// Дайбилет — Общие типы между backend и frontend
// ==============================================

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
  // MUSEUM
  MUSEUM_CLASSIC = 'MUSEUM_CLASSIC',
  EXHIBITION = 'EXHIBITION',
  GALLERY = 'GALLERY',
  PALACE = 'PALACE',
  PARK = 'PARK',
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
  TC_WIDGET = 'TC_WIDGET',
  REDIRECT = 'REDIRECT',
  API_CHECKOUT = 'API_CHECKOUT',
  REQUEST_ONLY = 'REQUEST_ONLY',
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
  [EventCategory.MUSEUM]: 'Музеи',
  [EventCategory.EVENT]: 'Мероприятия',
}

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
  // MUSEUM
  [EventSubcategory.MUSEUM_CLASSIC]: 'Музей',
  [EventSubcategory.EXHIBITION]: 'Выставка',
  [EventSubcategory.GALLERY]: 'Галерея',
  [EventSubcategory.PALACE]: 'Дворец',
  [EventSubcategory.PARK]: 'Парк',
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
    EventSubcategory.RIVER, EventSubcategory.WALKING, EventSubcategory.BUS,
    EventSubcategory.COMBINED, EventSubcategory.QUEST, EventSubcategory.GASTRO,
    EventSubcategory.ROOFTOP,
  ],
  [EventCategory.MUSEUM]: [
    EventSubcategory.MUSEUM_CLASSIC, EventSubcategory.EXHIBITION,
    EventSubcategory.GALLERY, EventSubcategory.PALACE, EventSubcategory.PARK,
  ],
  [EventCategory.EVENT]: [
    EventSubcategory.CONCERT, EventSubcategory.SHOW, EventSubcategory.STANDUP,
    EventSubcategory.THEATER, EventSubcategory.SPORT, EventSubcategory.FESTIVAL,
    EventSubcategory.MASTERCLASS, EventSubcategory.PARTY,
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
    { id: 'gastro', emoji: '🍽', label: 'Гастро', params: { subcategory: 'GASTRO' } },
    { id: 'quest', emoji: '🧩', label: 'Квест', params: { subcategory: 'QUEST' } },
    { id: 'combined', emoji: '🔀', label: 'Комбо', params: { subcategory: 'COMBINED' } },
  ],
  MUSEUM: [
    { id: 'museum', emoji: '🎟', label: 'Билет', params: { subcategory: 'MUSEUM_CLASSIC' } },
    { id: 'with-guide', emoji: '👨‍🏫', label: 'С экскурсией', params: { tag: 'with-guide' } },
    { id: 'no-queue', emoji: '⚡', label: 'Без очереди', params: { tag: 'no-queue' } },
    { id: 'exhibition', emoji: '🆕', label: 'Выставки', params: { subcategory: 'EXHIBITION' } },
    { id: 'palace', emoji: '🏛', label: 'Дворцы', params: { subcategory: 'PALACE' } },
    { id: 'gallery', emoji: '🖼', label: 'Галереи', params: { subcategory: 'GALLERY' } },
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
  { slug: 'first-time-city', emoji: '🌟', label: 'Для первого визита', color: 'bg-amber-400/90', textColor: 'text-amber-950' },
  { slug: 'bad-weather-ok', emoji: '☂️', label: 'В любую погоду', color: 'bg-teal-500/90', textColor: 'text-white' },
  { slug: 'no-queue', emoji: '⚡', label: 'Без очереди', color: 'bg-emerald-500/90', textColor: 'text-white' },
  { slug: 'with-guide', emoji: '👨‍🏫', label: 'С гидом', color: 'bg-violet-500/90', textColor: 'text-white' },
  { slug: 'audioguide', emoji: '🎧', label: 'Аудиогид', color: 'bg-purple-500/90', textColor: 'text-white' },
  { slug: 'interactive', emoji: '🎮', label: 'Интерактив', color: 'bg-fuchsia-500/90', textColor: 'text-white' },
];

/** Интенсивность → описание */
export const INTENSITY_LABELS: Record<Intensity, { label: string; description: string }> = {
  [Intensity.RELAXED]: { label: 'Спокойный', description: '1-2 события в день, долгие перерывы' },
  [Intensity.NORMAL]: { label: 'Оптимальный', description: '2-3 события в день' },
  [Intensity.ACTIVE]: { label: 'Активный', description: '3-4 события в день, максимум впечатлений' },
};
