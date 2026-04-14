import type {
  CatalogItem,
  CheckoutRequest,
  CheckoutResponse,
  CityListItem,
  EventListItem,
  PaginatedResponse,
  PlanRequest,
  PlanVariant,
  UpsellItem,
  VenueDetail,
  VenueListItem,
  VenueProgramResponse,
  VoucherData,
} from '@daibilet/shared';

import type {
  ArticleDetail,
  ArticleListItem,
  CityDetail,
  CollectionDetailResponse,
  FeaturedLandingItem,
  LandingItem,
  LandingPageResponse,
  LocationItem,
  PlanCalculateMeta,
  RegionDetail,
  ReviewsResponse,
  SeoMetaResponse,
  TagDetailPage,
  ValidateGiftCertificateResponse,
  MultiEventCityDatesDto,
  MultiEventDetailDto,
  MultiEventListItemDto,
  MultiEventSort,
  SubcategoryLandingRoutePayload,
} from './api.types';

/**
 * Единая схема: CSR — относительный /api/v1 (проксирует nginx на backend).
 * SSR в production (Docker): INTERNAL_API_URL — прямой вызов backend (rewrites в prod отключены).
 * SSR в dev: свой origin + rewrites Next → backend.
 */
const isServer = typeof window === 'undefined';
const API_BASE = isServer
  ? (process.env.INTERNAL_API_URL ||
      (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') + '/api/v1')
  : process.env.NEXT_PUBLIC_API_URL || '/api/v1';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[fetchApi] fetch failed', {
        url,
        err: String(e),
        cause: (e as Error & { cause?: unknown })?.cause,
      });
    }
    throw e;
  }

  const text = await res.text();
  if (!res.ok) {
    let error: { message?: string; path?: string };
    try {
      error = JSON.parse(text);
    } catch {
      error = { message: text?.slice(0, 200) || `HTTP ${res.status}` };
    }
    const msg = error.message || `HTTP ${res.status}`;
    const errPath = error.path ? ` [${error.path}]` : ` [${path}]`;
    throw new Error(`${msg}${errPath}`);
  }

  if (!text?.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Ответ не JSON: ${text.slice(0, 80)}... [${path}]`);
  }
}

type MultiEventListItemRaw = {
  groupingKey: string;
  slug: string | null;
  title: string;
  coverUrl: string | null;

  totalEvents: number;
  totalCities: number;

  minPrice: number | null;
  maxRating: number | null;

  citiesPreview: { slug: string; name: string }[] | null;
  nextDate: string | null;
};

type MultiEventDetailRaw = {
  slug: string;
  groupingKey: string;
  title: string;
  coverUrl: string | null;

  totalEvents: number;
  totalCities: number;

  minPrice: number | null;
  maxRating: number | null;

  cities: { slug: string; name: string }[] | null;
  nextDate: string | null;
};

// --- Каталог ---

export const api = {
  // Города
  getCities: (featured?: boolean) =>
    fetchApi<CityListItem[]>(featured !== undefined ? `/cities?featured=${featured}` : '/cities'),

  getCityBySlug: (slug: string) => fetchApi<CityDetail>(`/cities/${slug}`),

  // Локации
  getLocations: (city?: string, type?: string) => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (type) params.set('type', type);
    const query = params.toString() ? `?${params}` : '';
    return fetchApi<LocationItem[]>(`/locations${query}`);
  },

  getNearestLocations: (lat: number, lng: number, type?: string, limit?: number) => {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    if (type) params.set('type', type);
    if (limit) params.set('limit', String(limit));
    return fetchApi<LocationItem[]>(`/locations/nearest?${params}`);
  },

  // Единый каталог (Event + Venue при category=MUSEUM)
  getCatalog: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return fetchApi<PaginatedResponse<CatalogItem>>(`/catalog${query}`);
  },

  // События
  getEvents: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return fetchApi<PaginatedResponse<EventListItem>>(`/events${query}`);
  },

  getEventBySlug: (slug: string) =>
    fetchApi<import('./api.types').EventDetailFrontend>(`/events/${slug}`),

  // Multi-events (глобальные группы событий)
  getMultiEvents: (params?: { sort?: MultiEventSort; limit?: number }) => {
    const sort: MultiEventSort = params?.sort === 'new' ? 'new' : 'popular';
    const limit = params?.limit && params.limit > 0 && params.limit <= 100 ? params.limit : 20;
    const qs = `?sort=${encodeURIComponent(sort)}&limit=${encodeURIComponent(String(limit))}`;

    return fetchApi<MultiEventListItemRaw[]>(`/multi-events${qs}`).then((rows) =>
      rows.map<MultiEventListItemDto>((r) => {
        const citiesPreview = Array.isArray(r.citiesPreview) ? r.citiesPreview : [];
        const remainingCities = Math.max(0, (r.totalCities ?? 0) - citiesPreview.length);

        return {
          slug: r.slug || r.groupingKey,
          groupingKey: r.groupingKey,
          title: r.title,
          coverUrl: r.coverUrl,

          totalEvents: r.totalEvents,
          totalCities: r.totalCities,

          citiesPreview,
          remainingCities,

          minPrice: r.minPrice,
          rating: r.maxRating,
          nextDate: r.nextDate,
        };
      }),
    );
  },

  getMultiEventBySlug: (slug: string) =>
    fetchApi<MultiEventDetailRaw>(`/multi-events/${encodeURIComponent(slug)}`).then<MultiEventDetailDto>((r) => ({
      group: {
        slug: r.slug,
        groupingKey: r.groupingKey,
        title: r.title,
        coverUrl: r.coverUrl,
        totalEvents: r.totalEvents,
        totalCities: r.totalCities,
        minPrice: r.minPrice,
        rating: r.maxRating,
        nextDate: r.nextDate,
      },
      cities: Array.isArray(r.cities)
        ? r.cities.map((c) => ({
            slug: c.slug,
            name: c.name,
          }))
        : [],
    })),

  getMultiEventDates: (groupSlug: string, citySlug: string, limit?: number) => {
    const params = new URLSearchParams({ citySlug });
    if (limit && limit > 0) params.set('limit', String(limit));
    const query = params.toString() ? `?${params}` : '';
    return fetchApi<MultiEventCityDatesDto>(`/multi-events/${encodeURIComponent(groupSlug)}/dates${query}`);
  },

  // Теги
  getTags: (category?: string) =>
    fetchApi<import('./api.types').TagWithCount[]>(`/tags${category ? `?category=${category}` : ''}`),

  // Catalog tags (v2): STRUCTURAL/POPULAR + structuralGroup.
  getCatalogTags: (query: { kind?: 'STRUCTURAL' | 'POPULAR'; group?: 'THEME' | 'AUDIENCE' | 'FORMAT'; activeOnly?: boolean }) =>
    fetchApi<
      Array<{
        id: string;
        slug: string;
        name: string;
        tagKind?: 'STRUCTURAL' | 'POPULAR' | null;
        structuralGroup?: 'THEME' | 'AUDIENCE' | 'FORMAT' | null;
        sortOrder?: number | null;
        isActive?: boolean;
      }>
    >(
      `/catalog/tags?${new URLSearchParams(
        Object.entries(query)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => [k, String(v)]),
      ).toString()}`,
    ),

  getTagBySlug: (slug: string, city?: string, page?: number) => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (page) params.set('page', String(page));
    const query = params.toString() ? `?${params}` : '';
    return fetchApi<TagDetailPage>(`/tags/${slug}${query}`);
  },

  // Поиск
  search: (q: string, city?: string) => {
    const params = new URLSearchParams({ q });
    if (city) params.set('city', city);
    return fetchApi<{ events: EventListItem[]; cities: CityListItem[] }>(`/search?${params}`);
  },

  // Planner
  calculatePlan: (data: PlanRequest) =>
    fetchApi<{ variants: PlanVariant[]; upsells: UpsellItem[]; meta: PlanCalculateMeta }>('/planner/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  customizePlan: (data: {
    variant: Record<string, unknown>;
    dayNumber: number;
    slotIndex: number;
    newEventId: string;
  }) =>
    fetchApi<{ success: boolean; variant?: Record<string, unknown>; message?: string }>('/planner/customize', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Checkout
  createCheckout: (data: CheckoutRequest) =>
    fetchApi<CheckoutResponse>('/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCheckoutStatus: (packageId: string) =>
    fetchApi<{ status: string; voucherUrl: string | null; totalPrice?: number; items?: unknown[]; code?: string }>(
      `/checkout/${packageId}/status`,
    ),

  createPackage: (items: Array<{ eventId: string; offerId: string; quantity: number; eventTitle: string; eventSlug: string; priceFrom: number; purchaseType: string; source: string; imageUrl?: string; sessionId?: string }>) =>
    fetchApi<{ packageId: string; code: string }>('/checkout/package', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  updatePackageContacts: (packageId: string, customer: { name: string; email: string; phone: string }) =>
    fetchApi<{ ok: boolean }>(`/checkout/package/${packageId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(customer),
    }),

  createPackagePayment: (packageId: string, idempotencyKey?: string) =>
    fetchApi<{ paymentIntentId: string; paymentUrl: string; amount: number; status: string }>(
      `/checkout/${packageId}/pay`,
      { method: 'POST', body: JSON.stringify({ idempotencyKey }) },
    ),

  // Блог
  getArticles: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return fetchApi<PaginatedResponse<ArticleListItem>>(`/articles${query}`);
  },

  getArticleBySlug: (slug: string) => fetchApi<ArticleDetail>(`/articles/${encodeURIComponent(slug)}`),

  // Voucher
  getVoucher: (shortCode: string) => fetchApi<VoucherData>(`/vouchers/${shortCode}`),

  // SEO
  getSeoMeta: (entityType: string, entityId: string) =>
    fetchApi<SeoMetaResponse | null>(`/seo/${entityType}/${entityId}`),

  // Подарочный сертификат — валидация кода
  validateGiftCertificate: (code: string, cartTotalKopecks: number) =>
    fetchApi<ValidateGiftCertificateResponse>('/checkout/validate-gift-certificate', {
      method: 'POST',
      body: JSON.stringify({ code, cartTotalKopecks }),
    }),

  // Регионы (города по области / зоне доступности)
  getRegionBySlug: (slug: string) => fetchApi<RegionDetail>(`/regions/${slug}`),

  getRegionEvents: (slug: string, params?: Record<string, string | number>) => {
    const query = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return fetchApi<PaginatedResponse<EventListItem>>(`/regions/${slug}/events${query}`);
  },

  // Топ городов для футера (по количеству событий и мест)
  getTopCities: () => fetchApi<CityListItem[]>(`/cities`),

  // Venues (музеи, галереи, арт-пространства)
  getVenues: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return fetchApi<PaginatedResponse<VenueListItem>>(`/venues${query}`);
  },

  getVenueBySlug: (slug: string) => fetchApi<VenueDetail>(`/venues/${slug}`),

  getVenueProgram: (slug: string) =>
    fetchApi<VenueProgramResponse>(`/venues/${encodeURIComponent(slug)}/program`),

  // Preview (unpublished entities)
  getEventPreview: (id: string, token: string) =>
    fetchApi<import('./api.types').EventDetailFrontend>(`/preview/events/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`),

  getVenuePreview: (id: string, token: string) =>
    fetchApi<VenueDetail>(`/preview/venues/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`),

  // Лендинги (посадочные страницы)
  getLandings: (city?: string) => fetchApi<LandingItem[]>(city ? `/landings?city=${city}` : '/landings'),

  getLandingBySlug: (slug: string) => fetchApi<LandingPageResponse>(`/landings/${slug}`),

  getCatalogLandingByCityAndSlug: (citySlug: string, slug: string) =>
    fetchApi<LandingPageResponse>(`/catalog/landings/${encodeURIComponent(citySlug)}/${encodeURIComponent(slug)}`),

  /** Резолв: TOPIC_HUB → редирект на тематический хаб; AUTO → можно запрашивать published payload */
  getSubcategoryLandingRoute: (citySlug: string, subcategorySlug: string) =>
    fetchApi<SubcategoryLandingRoutePayload>(
      `/landings/subcategories/${encodeURIComponent(citySlug)}/${encodeURIComponent(subcategorySlug)}/route`,
    ),

  /** SEO-лендинг по подкатегории + городу (только опубликованные; иначе 404) */
  getSubcategoryLandingPublished: (citySlug: string, subcategorySlug: string) =>
    fetchApi<import('./api.types').SubcategoryLandingPublishedPayload>(
      `/landings/subcategories/${encodeURIComponent(citySlug)}/${encodeURIComponent(subcategorySlug)}`,
    ),

  // Подборки (тематические посадочные страницы)
  getCollections: (city?: string) => fetchApi<LandingItem[]>(city ? `/collections?city=${city}` : '/collections'),

  getCollectionBySlug: (slug: string, page?: number, city?: string) => {
    const params = new URLSearchParams();
    if (page && page > 1) params.set('page', String(page));
    if (city) params.set('city', city);
    const query = params.toString() ? `?${params}` : '';
    return fetchApi<CollectionDetailResponse>(`/collections/${slug}${query}`);
  },

  getCatalogCollectionByCityAndSlug: (citySlug: string, slug: string, page?: number) => {
    const params = new URLSearchParams();
    if (page && page > 1) params.set('page', String(page));
    const query = params.toString() ? `?${params}` : '';
    return fetchApi<CollectionDetailResponse>(`/catalog/collections/${encodeURIComponent(citySlug)}/${encodeURIComponent(slug)}${query}`);
  },

  getFeaturedLandingsForCollections: (city: string) =>
    fetchApi<FeaturedLandingItem[]>(`/catalog/collections/featured-landings?city=${encodeURIComponent(city)}`),

  // Combo-программы (готовые маршруты)
  getCombos: (city?: string) => fetchApi<LandingItem[]>(city ? `/combos?city=${city}` : '/combos'),

  getComboBySlug: (slug: string) => fetchApi<LandingItem>(`/combos/${slug}`),

  // Pricing / Upsells
  getUpsells: (city?: string) => fetchApi<UpsellItem[]>(city ? `/pricing/upsells?city=${city}` : '/pricing/upsells'),

  // Отзывы
  getEventReviews: (slug: string, page = 1) => fetchApi<ReviewsResponse>(`/events/${slug}/reviews?page=${page}`),

  getVenueReviews: (slug: string, page = 1, limit = 10) =>
    fetchApi<ReviewsResponse>(`/venues/${slug}/reviews?page=${page}&limit=${limit}`),

  submitReview: (data: {
    eventId?: string;
    venueId?: string;
    rating: number;
    title?: string;
    text: string;
    authorName: string;
    authorEmail: string;
    voucherCode?: string;
    website?: string;
    formStartedAt?: number;
    reviewRequestToken?: string;
  }) =>
    fetchApi<{ id: string; [key: string]: unknown }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadReviewPhotos: async (
    reviewId: string,
    files: File[],
    authorEmail?: string,
  ): Promise<{ url?: string; urls?: string[]; [key: string]: unknown }> => {
    const formData = new FormData();
    files.forEach((f) => formData.append('photos', f));
    if (authorEmail) formData.append('authorEmail', authorEmail);
    const url = `${API_BASE}/reviews/${reviewId}/photos`;
    const res = await fetch(url, { method: 'POST', body: formData });
    if (!res.ok) {
      const err = (await res.json().catch(() => {
        return { message: 'Ошибка загрузки фото' };
      })) as { message?: string };
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json() as Promise<{ url?: string; urls?: string[]; [key: string]: unknown }>;
  },

  voteReview: (reviewId: string, helpful: boolean) =>
    fetchApi<{ helpfulCount: number }>(`/reviews/${reviewId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ helpful }),
    }),

  // Подарочные сертификаты
  getGiftCertificateDenominations: () =>
    fetchApi<{ denominations: number[]; minAmount?: number; maxAmount?: number }>(
      '/checkout/gift-certificate/denominations',
    ),

  createGiftCertificateSession: (data: {
    amount: number;
    recipientEmail: string;
    senderName: string;
    message?: string;
    customer: { name: string; email: string; phone: string };
    utm?: { source?: string; medium?: string; campaign?: string };
  }) =>
    fetchApi<{ sessionId: string; shortCode: string; status: string; expiresAt: string; totalPrice: number }>(
      '/checkout/gift-certificate',
      { method: 'POST', body: JSON.stringify(data) },
    ),

  // User (аккаунты)
  userRegister: (data: { email: string; password: string; name: string }) =>
    fetchApi<{ accessToken: string }>('/user/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      credentials: 'include',
    }),

  userLogin: (data: { email: string; password: string }) =>
    fetchApi<{ accessToken: string }>('/user/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      credentials: 'include',
    }),

  userRefresh: () =>
    fetchApi<{ accessToken: string | null }>('/user/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    }),

  userLogout: (token: string) =>
    fetchApi<{ message: string }>('/user/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  userMe: (token: string) =>
    fetchApi<{ id: string; email: string; name: string }>('/user/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  userFavoritesList: (token: string) =>
    fetchApi<{ slugs: string[] }>('/user/favorites', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  userFavoritesSync: (token: string, slugs: string[]) =>
    fetchApi<{ slugs: string[] }>('/user/favorites/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slugs }),
    }),

  userFavoritesAdd: (token: string, slug: string) =>
    fetchApi<{ slugs: string[] }>('/user/favorites', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slug }),
    }),

  userFavoritesRemove: (token: string, slug: string) =>
    fetchApi<{ slugs: string[] }>(`/user/favorites/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),

  userForgotPassword: (email: string) =>
    fetchApi<{ ok: boolean }>('/user/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  userResetPassword: (data: { token: string; password: string }) =>
    fetchApi<{ ok: boolean }>('/user/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Account / ЛК покупателя (требуют Bearer token)
  accountMe: (token: string) =>
    fetchApi<AccountSummary>('/account/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  accountOrders: (token: string, params?: { page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.page != null) search.set('page', String(params.page));
    if (params?.limit != null) search.set('limit', String(params.limit));
    const q = search.toString();
    return fetchApi<AccountOrdersResponse>(`/account/orders${q ? `?${q}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  accountOrderDetail: (token: string, id: string) =>
    fetchApi<AccountOrderDetail>(`/account/orders/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  accountPurchases: (token: string, params?: { page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.page != null) search.set('page', String(params.page));
    if (params?.limit != null) search.set('limit', String(params.limit));
    const q = search.toString();
    return fetchApi<AccountPurchasesResponse>(`/account/purchases${q ? `?${q}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  accountTickets: (token: string) =>
    fetchApi<AccountTicketItem[]>('/account/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAccountNotifications: (
    token: string,
    params?: { type?: string; page?: number; limit?: number },
  ) => {
    const search = new URLSearchParams();
    if (params?.type) search.set('type', params.type);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString() ? `?${search.toString()}` : '';
    return fetchApi<{
      items: {
        id: string;
        type: string;
        title: string;
        body: string;
        meta: Record<string, unknown> | null;
        isRead: boolean;
        createdAt: string;
      }[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/account/notifications${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  markNotificationRead: (token: string, id: string) =>
    fetchApi<{ ok: boolean }>(`/account/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  markAllNotificationsRead: (token: string) =>
    fetchApi<{ ok: boolean }>('/account/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAccountReviewDispute: (id: string, token: string) =>
    fetchApi<{
      status: import('./api.types').ReviewDisputeStatus | null;
      canReply: boolean;
      messages: {
        id: string;
        authorType: 'USER' | 'MODERATOR' | 'SUPPLIER';
        authorLabel: string;
        body: string;
        createdAt: string;
        isMine: boolean;
      }[];
    }>(`/account/reviews/${encodeURIComponent(id)}/dispute`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  postAccountReviewDisputeMessage: (id: string, body: string, token: string) =>
    fetchApi<{
      id: string;
      authorType: 'USER';
      authorLabel: string;
      body: string;
      createdAt: string;
      isMine: boolean;
    }>(`/account/reviews/${encodeURIComponent(id)}/dispute/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body }),
    }),

  postAccountReviewDisputeRead: (id: string, token: string) =>
    fetchApi<{ updated: number }>(`/account/reviews/${encodeURIComponent(id)}/dispute/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAccountNotificationsUnread: (token: string) =>
    fetchApi<{
      totalUnread: number;
      reviewsDisputesUnread: number;
      supportUnread: number;
      ordersUnread: number;
    }>('/account/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAccountReviews: (
    token: string,
    params?: { status?: string; page?: number; limit?: number },
  ) => {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString() ? `?${search.toString()}` : '';
    return fetchApi<import('./api.types').AccountReviewsResponse>(
      `/account/reviews${qs}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  accountProfile: (token: string) =>
    fetchApi<AccountProfile>('/account/profile', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  accountUpdateProfile: (token: string, data: { name?: string; email?: string }) =>
    fetchApi<AccountProfile>('/account/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  getPromoBlocks: (city?: string) =>
    fetchApi<PromoBlockDto[]>(city ? `/promo-blocks?city=${encodeURIComponent(city)}` : '/promo-blocks'),

  getPromoCollection: (slug: string) =>
    fetchApi<PromoCollectionDto>(`/promo-collections/${encodeURIComponent(slug)}`),
};

export type AccountSummary = {
  user: { id: string; name: string; email: string };
  ordersCount: number;
  activeTicketsCount: number;
  favoritesCount: number;
};

export type AccountOrderListItem = {
  id: string;
  shortCode: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  totalAmount: number | null;
  currency: string;
  itemsPreview: Array<{ eventTitle: string; quantity: number }>;
  trackUrl: string | null;
};

export type AccountOrdersResponse = {
  items: AccountOrderListItem[];
  total: number;
};

export type PurchaseDisplayType =
  | 'INTERNAL_TICKET'
  | 'EXTERNAL_VOUCHER'
  | 'BOOKING_CONFIRMATION'
  | 'AWAITING_PAYMENT'
  | 'MANUAL_CONFIRMATION';

export type PurchaseListItem = {
  purchaseId: string;
  shortCode: string;
  eventTitle: string;
  purchaseDate: string;
  eventDate: string | null;
  displayStatus: string;
  purchaseType: PurchaseDisplayType;
  ticketAvailable: boolean;
  primaryAction: { label: string; url: string } | null;
  secondaryAction: { label: string; url: string } | null;
};

export type AccountPurchasesResponse = {
  items: PurchaseListItem[];
  total: number;
};

export type AccountOrderDetail = {
  id: string;
  shortCode: string;
  status: string;
  totalPrice: number | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  voucherUrl: string | null;
  items: Array<{
    id: string;
    status?: string;
    quantity: number;
    priceSnapshot?: number;
    event?: { title: string; slug: string; imageUrl: string | null };
    offerTitle?: string;
    sessionStartsAt?: string | null;
    meetingPoint?: string | null;
    meetingInstructions?: string | null;
    operationalPhone?: string | null;
    operationalNote?: string | null;
  }>;
};

export type AccountTicketItem = {
  orderId: string;
  shortCode: string;
  eventTitle: string;
  eventSlug: string;
  sessionStartsAt: string | null;
  status: string;
  trackUrl: string;
  externalPaymentUrl: string | null;
};

export type AccountProfile = {
  id: string;
  email: string;
  name: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export type PromoBlockDto = {
  slug: string;
  title: string;
  description: string;
  href: string;
  iconSource: string;
  iconKey: string | null;
  iconSvg: string | null;
  bgMode: string;
  bgColor: string | null;
  gradientFrom: string | null;
  gradientTo: string | null;
};

export type PromoCollectionDto = {
  slug: string;
  title: string;
  description: string | null;
  contentType: 'EVENTS' | 'VENUES';
  events?: Array<{
    id: string;
    slug: string;
    title: string;
    category: string;
    imageUrl: string | null;
    priceFrom: number | null;
    rating: number;
    city?: { slug: string; name: string };
  }>;
  venues?: Array<{
    id: string;
    slug: string;
    title: string;
    imageUrl: string | null;
    priceFrom: number | null;
    rating: number;
    city?: { slug: string; name: string };
  }>;
};
