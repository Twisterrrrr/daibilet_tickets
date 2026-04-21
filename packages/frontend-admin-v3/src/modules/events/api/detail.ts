import { adminApi } from '@/api/client';

export type EventCategoryPriceRow = {
  id: string;
  name: string;
  purchaseType: string;
  priceFromKopecks: number | null;
  status: string;
  isPrimary: boolean;
  priority: number;
  availabilityMode: string | null;
  sessionsLinkedCount: number;
  isSellableHint: boolean;
};

export type AdminEventDetail = {
  id: string;
  title: string;
  slug: string;
  tcEventId?: string | null;
  isActive: boolean;
  publishStatus?: string;
  source: string;
  updatedAt: string;
  shortDescription?: string | null;
  description?: string | null;
  summary?: string | null;
  h1?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  imageUrl?: string | null;
  galleryUrls?: string[];
  dateMode?: string;
  durationMinutes?: number | null;
  minAge?: number | null;
  meetingPoint?: string | null;
  vesselName?: string | null;
  experienceFormat?: string | null;
  refundPolicyText?: string | null;
  ageMin?: number | null;
  city?: { slug: string; name: string } | null;
  venue?: { id: string; title: string; slug: string } | null;
  supplier?: {
    id: string;
    name: string;
    slug: string;
    trustLevel?: number;
    trustScore?: number;
  } | null;
  /** Presentation: категории и цены (persistence: offers / EventOffer) */
  categoryPrices?: EventCategoryPriceRow[];
  scheduleSummary?: {
    nextSessionAt: string | null;
    futureSessionsCount: number;
    importedSessionsReadOnly: boolean;
  };
  mediaSummary?: { hasCover: boolean; galleryCount: number };
  nextSessionAt?: string | null;
  override?: {
    isHidden?: boolean;
    editorStatus?: string | null;
    imageUrl?: string | null;
    contentTemplateData?: unknown;
  } | null;
  /** Каталоговый тип события (определяет допустимые PRIMARY-подкатегории). */
  category?: 'EXCURSION' | 'MUSEUM' | 'EVENT' | 'ACTIVITY' | 'ENTERTAINMENT';
  sectionsDerived?: Array<{ slug: 'events' | 'excursions' | 'museums' | 'activities' | 'entertainment'; name: string }>;
  subcategoriesCanonical?: Array<{
    id: string;
    slug: string;
    name: string;
    isActive?: boolean;
    /** Слой подкатегории в БД (PRIMARY / SECONDARY). */
    layer?: 'PRIMARY' | 'SECONDARY';
    /** Prisma Subcategory.type — UNIVERSAL / EVENT_ONLY / VENUE_ONLY. */
    subcategoryType?: 'UNIVERSAL' | 'EVENT_ONLY' | 'VENUE_ONLY';
  }>;
  lastSessionAt?: string | null;
  isPast?: boolean;
  isArchived?: boolean;
  isIndexable?: boolean;
  offers?: unknown[];
};

export async function fetchAdminEventDetail(id: string) {
  return adminApi.get<AdminEventDetail>(`/admin/events/${id}`);
}

