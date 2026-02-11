// ==============================================
// Дайбилет — Общие типы между backend и frontend
// ==============================================

// --- Enums (дублируем из Prisma для использования на фронте) ---

export enum EventCategory {
  EXCURSION = 'EXCURSION',
  MUSEUM = 'MUSEUM',
  EVENT = 'EVENT',
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
  subcategory: string | null;
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
};

/** Интенсивность → описание */
export const INTENSITY_LABELS: Record<Intensity, { label: string; description: string }> = {
  [Intensity.RELAXED]: { label: 'Спокойный', description: '1-2 события в день, долгие перерывы' },
  [Intensity.NORMAL]: { label: 'Оптимальный', description: '2-3 события в день' },
  [Intensity.ACTIVE]: { label: 'Активный', description: '3-4 события в день, максимум впечатлений' },
};
