export type EventType = 'one_time' | 'recurring' | 'open_date' | 'unknown';

export type TagGroup =
  | 'THEME'
  | 'FORMAT'
  | 'AUDIENCE'
  | 'LANGUAGE'
  | 'SPECIAL'
  | 'SEASON'
  | 'POPULAR'
  | 'UNKNOWN';

export type TagDto = {
  id: string;
  slug: string;
  name?: string | null;
  /** STRUCTURAL / POPULAR / … — с бэка в `GET /admin/events/:id`. */
  tagKind?: string | null;
  structuralGroup?: string | null;
  category?: string | null;
};

export type EventTagLinkDto = {
  id: string;
  tag: TagDto;
};

export type SubcategoryDto = {
  id: string;
  slug: string;
  /** Код справочника (совпадает с `primaryCode` / `secondaryCodes` в POST assign). */
  code?: string | null;
  nameRu?: string | null;
  layer?: string | null;
  type?: string | null;
  isActive?: boolean | null;
};

export type EventSubcategoryLinkDto = {
  subcategoryId: string;
  subcategory: SubcategoryDto;
};

/**
 * Additive: канонический read-model внешней покупки (`GET /api/v1/admin/events/:id`).
 * Собирается на бэке из фактов офферов; не описывает cart/checkout Daibilet.
 * См. `docs/product/admin-v4-imported-sales.md` (часть A).
 */
export type AdminExternalPurchaseProvider = 'TICKETSCLOUD' | 'TEPLOHOD' | 'UNKNOWN';

export type AdminExternalPurchaseEntryType = 'WIDGET' | 'DEEPLINK' | 'NONE';

export type AdminExternalPurchaseEntryStatus =
  | 'READY'
  | 'MISSING'
  | 'INVALID'
  | 'DISABLED'
  | 'PROVIDER_UNSUPPORTED';

export type AdminExternalPurchaseEntryDto = {
  provider: AdminExternalPurchaseProvider;
  entryType: AdminExternalPurchaseEntryType;
  widgetPayload?: Record<string, unknown> | null;
  deeplink?: string | null;
  isConfigured: boolean;
  isValid: boolean;
  status: AdminExternalPurchaseEntryStatus;
  /** Коды причин; могут расширяться без ломки контракта */
  blockingReasons: string[];
};

/** Additive: `GET /api/v1/admin/events/:id` — см. `docs/qa.md` (AdminPurchaseLinkDto). Legacy/опционально, если бэк не дал `externalPurchaseEntry`. */
export type AdminPurchaseType = 'WIDGET' | 'REDIRECT' | 'EXTERNAL_PROVIDER' | 'NONE';

export type AdminPurchaseProvider = 'TICKETSCLOUD' | 'TEPLOHOD' | 'INTERNAL' | 'UNKNOWN';

export type AdminPurchaseLinkStatus = 'READY' | 'MISSING' | 'INVALID' | 'PROVIDER_UNSUPPORTED' | 'DISABLED';

export type AdminPurchaseLinkBlockingReason =
  | 'MISSING_PURCHASE_LINK'
  | 'MISSING_PROVIDER'
  | 'MISSING_DEEPLINK'
  | 'MISSING_WIDGET_PAYLOAD'
  | 'INVALID_DEEPLINK'
  | 'UNSUPPORTED_PURCHASE_TYPE';

export type AdminPurchaseLinkDto = {
  purchaseType: AdminPurchaseType;
  provider: AdminPurchaseProvider;
  deeplink?: string | null;
  /** Не рендерить в UI целиком; только признаки наличия. */
  widgetPayload?: Record<string, unknown> | null;
  isConfigured: boolean;
  isValid: boolean;
  status: AdminPurchaseLinkStatus;
  blockingReasons: AdminPurchaseLinkBlockingReason[];
  lastCheckedAt?: string | null;
};

/** Список событий: быстрый health (не полный `validateForPublish`). */
export type EventListReadinessSummaryDto = {
  status: 'READY' | 'NEEDS_WORK' | 'BLOCKED';
  score: number;
  issueCodes?: string[];
};

export type EventListItemDto = {
  id: string;
  title: string;
  slug: string;
  source: string;
  category?: string | null;
  isActive: boolean;
  updatedAt?: string | null;
  priceFrom?: number | null;
  /** Минимальная цена (оффер / событие), копейки — с бэка в списке как `priceFromMin`. */
  priceFromMin?: number | null;
  city?: { slug: string; name: string } | null;
  venue?: { id: string; title: string; slug: string | null } | null;
  /** С бэка в `GET /admin/events` вместо `venue`: `{ id, name, slug }`. */
  venueShort?: { id: string; name: string; slug: string | null } | null;
  supplier?: { id: string; name: string; slug: string; trustLevel?: string | null; trustScore?: number | null } | null;
  override?: { isHidden?: boolean | null; editorStatus?: string | null; imageUrl?: string | null; category?: string | null } | null;
  _count?: { sessions?: number; offers?: number; subcategoryLinks?: number; tags?: number } | null;
  lastSessionAt?: string | null;
  nextSessionAt?: string | null;
  futureSessionsCount?: number;
  categoriesCount?: number;
  sectionsDerived?: string[];
  subcategoriesCanonical?: Array<{
    id: string;
    slug: string;
    code?: string | null;
    nameRu?: string | null;
    layer?: string | null;
    type?: string | null;
  }>;
  readinessSummary?: EventListReadinessSummaryDto | null;
  externalPurchaseEntry?: AdminExternalPurchaseEntryDto | null;
  /** Серверные флаги для quick filters (фаза 8). */
  needsAttention?: boolean;
  readyToPublish?: boolean;
  isPast?: boolean;
  isArchived?: boolean;
  isIndexable?: boolean;
};

/** Полная готовность к публикации с бэка (`GET /admin/events/:id` + summary pipeline). */
export type EventAdminReadinessChecklistDto = {
  hasImage: boolean;
  hasDescription: boolean;
  hasFutureSlots: boolean;
  hasPrice: boolean;
  hasVenue: boolean;
  hasCategory: boolean;
  hasAge: boolean;
};

export type EventAdminReadinessIssueDto = {
  code: string;
  message: string;
  severity: 'warning' | 'error';
};

export type EventAdminReadinessDto = {
  status: 'READY' | 'NEEDS_WORK' | 'BLOCKED';
  score: number;
  classificationSource: 'LINKS' | 'LEGACY_ENUM' | 'NONE';
  classificationNeedsReview: boolean;
  checklist: EventAdminReadinessChecklistDto;
  issues: EventAdminReadinessIssueDto[];
};

export type EventDetailDto = EventListItemDto & {
  // Backend field from `GET /api/v1/admin/events/:id` (Prisma `Event.dateMode`).
  // Expected values on backend side include: SCHEDULED / RECURRING / OPEN_DATE (plus possible legacy/unknown).
  dateMode?: string | null;
  /** Optional backend fields from admin event detail. */
  imageUrl?: string | null;
  refundPolicyMode?: string | null;
  refundPolicyText?: string | null;
  sessions?: Array<{ id: string; startsAt: string; isActive?: boolean | null; canceledAt?: string | null }>;
  offers?: Array<{
    id: string;
    source: string;
    status?: string | null;
    priceFrom?: number | null;
    isDeleted?: boolean | null;
    _count?: { sessions?: number } | null;
    operator?: { id: string; name: string; slug: string; isActive: boolean } | null;
  }>;
  supplier?: { id: string; name: string; slug: string; trustLevel?: string | null; trustScore?: number | null } | null;
  tags?: EventTagLinkDto[];
  subcategoryLinks?: EventSubcategoryLinkDto[];
  /**
   * Additive: внешняя покупка (виджет / deeplink у провайдера). Канон для UI readiness.
   * `purchaseLink` — устаревшее/доп. поле, если отдаётся отдельно.
   */
  externalPurchaseEntry?: AdminExternalPurchaseEntryDto | null;
  /** @deprecated В пользу `externalPurchaseEntry` + фактов офферов; может отсутствовать. */
  purchaseLink?: AdminPurchaseLinkDto | null;
  /** Additive: то же, что в `GET /admin/events/:id/summary`. */
  readiness?: EventAdminReadinessDto | null;
  /** Additive: внешний id провайдера и синхронизация (импорт). */
  importMeta?: {
    sourceExternalId: string | null;
    lastSyncedAt: string | null;
    syncStatus: 'NEVER' | 'OK' | 'STALE';
  } | null;
};

export type Paginated<T> = { items: T[]; total: number; nextCursor?: string | null; hasMore?: boolean };

export type EventsModule = {};
