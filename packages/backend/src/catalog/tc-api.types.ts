/**
 * TC API response types — жёсткие контракты на границе интеграции.
 *
 * Правило: НИКАКОЙ any не входит в домен.
 * Все ответы TC API проходят через эти интерфейсы + type guards.
 */

// ============================================================
// TC Event (из /v2/resources/events)
// ============================================================

/** Город из TC API (venue.city) */
export interface TcVenueCity {
  id?: number;
  name?: string | { ru?: string; default?: string; en?: string };
  timezone?: string;
  [key: string]: unknown;
}

export interface TcEvent {
  _id?: string;
  id?: string | number; // REST API может возвращать id вместо _id
  title?: {
    text?: string;
    desc?: string;
    [key: string]: unknown;
  };
  org?: {
    id?: string | number;
    name?: string;
    [key: string]: unknown;
  };
  lifetime?: {
    start?: string;
    finish?: string;
    [key: string]: unknown;
  };
  venue?: {
    city?: TcVenueCity;
    address?: string;
    title?: string;
    point?: { coordinates?: [number, number] | number[] };
    [key: string]: unknown;
  };
  media?: {
    cover_original?: { url?: string };
    cover?: { url?: string };
    cover_small?: { url?: string };
    [key: string]: unknown;
  };
  description?: {
    text?: string;
    html?: string;
    [key: string]: unknown;
  };
  age?: number;
  category?: string;
  poster?: {
    original?: string;
    thumbnails?: Record<string, string>;
    [key: string]: unknown;
  };
  tags?: string[];
  settings?: Record<string, unknown>;
  status?: string;
  tickets_amount_vacant?: number;
  age_rating?: number;
  sets?: TcTicketSet[];
  [key: string]: unknown;
}

export interface TcTicketSetRule {
  current?: boolean;
  price?: string | number;
  price_org?: string;
  price_extra?: string;
  [key: string]: unknown;
}

/** Offer = TicketSet в терминологии TC API */
export type TcOffer = TcTicketSet;

export interface TcTicketSet {
  _id?: string;
  id?: string;
  name?: string;
  price?: number;
  price_max?: number;
  status?: string;
  amount?: number;
  amount_vacant?: number;
  with_seats?: boolean;
  rules?: TcTicketSetRule[];
  [key: string]: unknown;
}

// ============================================================
// TC Order
// ============================================================

export interface TcOrder {
  _id?: string;
  id?: string;
  status?: string;
  amount?: number;
  sets?: TcOrderSet[];
  payment_url?: string;
  [key: string]: unknown;
}

export interface TcOrderSet {
  set_id?: string;
  quantity?: number;
  price?: number;
  [key: string]: unknown;
}

// ============================================================
// TC gRPC Event (упрощённый)
// ============================================================

export interface TcGrpcEvent {
  id?: string;
  title?: string;
  description?: string;
  orgId?: string;
  orgTitle?: string;
  venueTitle?: string;
  venueAddress?: string;
  cityGeoId?: number;
  cityTitle?: string;
  startsAt?: string;
  endsAt?: string;
  age?: number;
  posterUrl?: string;
  category?: string;
  tags?: string[];
  sets?: TcGrpcTicketSet[];
  [key: string]: unknown;
}

export interface TcGrpcTicketSet {
  id?: string;
  name?: string;
  price?: number;
  priceMax?: number;
  status?: string;
}

// ============================================================
// Type Guards
// ============================================================

export function isTcEvent(value: unknown): value is TcEvent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  const id = obj.id ?? obj._id;
  return (typeof id === 'string' && id.length > 0) || (typeof id === 'number' && !isNaN(id));
}

export function isTcEventArray(value: unknown): value is TcEvent[] {
  return Array.isArray(value) && value.every(isTcEvent);
}

export function isTcOrder(value: unknown): value is TcOrder {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj._id === 'string' || typeof obj.id === 'string';
}

// ============================================================
// Extractors (safe property access)
// ============================================================

/** Безопасно извлечь title из TC Event */
export function extractTcTitle(event: TcEvent): string {
  return event.title?.text || (typeof event.title === 'string' ? event.title : '') || '';
}

/** Безопасно извлечь cityId из TC Event */
export function extractTcCityId(event: TcEvent): number | null {
  const id = event.venue?.city?.id;
  return typeof id === 'number' ? id : null;
}

/** Безопасно извлечь poster URL из TC Event */
export function extractTcPosterUrl(event: TcEvent): string | null {
  return event.poster?.original || event.poster?.thumbnails?.['240x240'] || null;
}

/** Безопасно извлечь минимальную цену из sets */
export function extractTcMinPrice(sets: TcTicketSet[]): number | null {
  const prices = sets.map((s) => s.price).filter((p): p is number => typeof p === 'number' && p > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}
