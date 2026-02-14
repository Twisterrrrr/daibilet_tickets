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
} from '@daibilet/shared';

/**
 * SSR (Server Components) → абсолютный URL напрямую к бэкенду.
 * CSR (Client Components) → относительный URL, проксируемый через Next.js rewrites.
 */
const isServer = typeof window === 'undefined';
const API_BASE = isServer
  ? (process.env.INTERNAL_API_URL || 'http://localhost:4000/api/v1')
  : (process.env.NEXT_PUBLIC_API_URL || '/api/v1');

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch((e) => { console.error('API error:', e); return { message: 'Ошибка сервера' }; });
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
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
    const url = `${isServer ? (process.env.INTERNAL_API_URL || 'http://localhost:4000/api/v1') : (process.env.NEXT_PUBLIC_API_URL || '/api/v1')}/reviews/${reviewId}/photos`;
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
};
