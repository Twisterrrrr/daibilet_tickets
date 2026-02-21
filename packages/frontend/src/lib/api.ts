import type {
  CityListItem,
  EventListItem,
  EventDetail,
  TagItem,
  PaginatedResponse,
  PlanRequest,
  PlanVariant,
  UpsellItem,
  CheckoutRequest,
  CheckoutResponse,
  VoucherData,
  VenueListItem,
  VenueDetail,
  CatalogItem,
} from '@daibilet/shared';

/**
 * Единая схема: и SSR, и CSR идут через Next.js rewrites (/api/v1).
 * SSR запрашивает свой же origin (localhost:3000), Next проксирует на backend.
 * Это устраняет fetch failed при недоступности backend напрямую из Node.
 */
const isServer = typeof window === 'undefined';
const API_BASE = isServer
  ? (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') + '/api/v1'
  : (process.env.NEXT_PUBLIC_API_URL || '/api/v1');

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
    const err = e as Error & { cause?: { code?: string } };
    const isConnRefused = err.cause?.code === 'ECONNREFUSED' || String(err.message || '').includes('ECONNREFUSED');
    if (process.env.NODE_ENV === 'development') {
      console.error('[fetchApi] fetch failed', { url, err: String(err), cause: err.cause });
      if (isConnRefused) {
        console.error('[fetchApi] Подсказка: убедитесь, что backend запущен (port 4000). npx pnpm dev — стартует оба сервиса.');
      }
    }
    if (isConnRefused) {
      throw new Error(`API недоступен. Запустите backend (port 4000) или npx pnpm dev [${path}]`);
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

// --- Каталог ---

export const api = {
  // Города
  getCities: (featured?: boolean) =>
    fetchApi<any[]>(featured !== undefined ? `/cities?featured=${featured}` : '/cities'),

  getCityBySlug: (slug: string) =>
    fetchApi<any>(`/cities/${slug}`),

  // Локации
  getLocations: (city?: string, type?: string) => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (type) params.set('type', type);
    const query = params.toString() ? `?${params}` : '';
    return fetchApi<any[]>(`/locations${query}`);
  },

  getNearestLocations: (lat: number, lng: number, type?: string, limit?: number) => {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    if (type) params.set('type', type);
    if (limit) params.set('limit', String(limit));
    return fetchApi<any[]>(`/locations/nearest?${params}`);
  },

  // Единый каталог (Event + Venue при category=MUSEUM)
  getCatalog: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' + new URLSearchParams(
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
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return fetchApi<PaginatedResponse<EventListItem>>(`/events${query}`);
  },

  getEventBySlug: (slug: string) =>
    fetchApi<EventDetail>(`/events/${slug}`),

  // SEO meta (entity-level)
  getSeoMeta: (entityType: string, entityId: string) =>
    fetchApi<any>(`/seo/${entityType}/${entityId}`),

  // Теги
  getTags: (category?: string) =>
    fetchApi<TagItem[]>(`/tags${category ? `?category=${category}` : ''}`),

  getTagBySlug: (slug: string, city?: string, page?: number) => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (page) params.set('page', String(page));
    const query = params.toString() ? `?${params}` : '';
    return fetchApi<any>(`/tags/${slug}${query}`);
  },

  // Поиск
  search: (q: string, city?: string) => {
    const params = new URLSearchParams({ q });
    if (city) params.set('city', city);
    return fetchApi<{ events: EventListItem[]; cities: CityListItem[] }>(
      `/search?${params}`,
    );
  },

  // Planner
  calculatePlan: (data: PlanRequest) =>
    fetchApi<{ variants: PlanVariant[]; upsells: UpsellItem[]; meta: any }>('/planner/calculate', {
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
    fetchApi<{ status: string; voucherUrl: string | null }>(
      `/checkout/${packageId}/status`,
    ),

  // Блог
  getArticles: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return fetchApi<any>(`/blog${query}`);
  },

  getArticleBySlug: (slug: string) =>
    fetchApi<any>(`/blog/${slug}`),

  // Voucher
  getVoucher: (shortCode: string) =>
    fetchApi<VoucherData>(`/vouchers/${shortCode}`),

  // Регионы (города по области / зоне доступности)
  getRegionBySlug: (slug: string) =>
    fetchApi<any>(`/regions/${slug}`),

  getRegionEvents: (slug: string, params?: Record<string, string | number>) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return fetchApi<any>(`/regions/${slug}/events${query}`);
  },

  // Топ городов для футера (по количеству событий и мест)
  getTopCities: () =>
    fetchApi<any[]>(`/cities`),

  // Venues (музеи, галереи, арт-пространства)
  getVenues: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return fetchApi<PaginatedResponse<VenueListItem>>(`/venues${query}`);
  },

  getVenueBySlug: (slug: string) =>
    fetchApi<VenueDetail>(`/venues/${slug}`),

  // Лендинги (посадочные страницы)
  getLandings: (city?: string) =>
    fetchApi<any[]>(city ? `/landings?city=${city}` : '/landings'),

  getLandingBySlug: (slug: string) =>
    fetchApi<any>(`/landings/${slug}`),

  // Подборки (тематические посадочные страницы)
  getCollections: (city?: string) =>
    fetchApi<any[]>(city ? `/collections?city=${city}` : '/collections'),

  getCollectionBySlug: (slug: string, page?: number) => {
    const params = new URLSearchParams();
    if (page && page > 1) params.set('page', String(page));
    const query = params.toString() ? `?${params}` : '';
    return fetchApi<any>(`/collections/${slug}${query}`);
  },

  // Combo-программы (готовые маршруты)
  getCombos: (city?: string) =>
    fetchApi<any[]>(city ? `/combos?city=${city}` : '/combos'),

  getComboBySlug: (slug: string) =>
    fetchApi<any>(`/combos/${slug}`),

  // Pricing / Upsells
  getUpsells: (city?: string) =>
    fetchApi<any[]>(city ? `/pricing/upsells?city=${city}` : '/pricing/upsells'),

  // Отзывы
  getEventReviews: (slug: string, page = 1) =>
    fetchApi<any>(`/events/${slug}/reviews?page=${page}`),

  getVenueReviews: (slug: string, page = 1, limit = 10) =>
    fetchApi<any>(`/venues/${slug}/reviews?page=${page}&limit=${limit}`),

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
    fetchApi<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadReviewPhotos: async (reviewId: string, files: File[], authorEmail?: string) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('photos', f));
    if (authorEmail) formData.append('authorEmail', authorEmail);
    const url = `${API_BASE}/reviews/${reviewId}/photos`;
    const res = await fetch(url, { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json().catch((e) => { console.error('API error:', e); return { message: 'Ошибка загрузки фото' }; });
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  voteReview: (reviewId: string, helpful: boolean) =>
    fetchApi<{ helpfulCount: number }>(`/reviews/${reviewId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ helpful }),
    }),

  // Подарочные сертификаты
  getGiftCertificateDenominations: () =>
    fetchApi<{ denominations: number[] }>('/checkout/gift-certificate/denominations'),

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
};
