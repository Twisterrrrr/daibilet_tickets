export type Paginated<T> = { items: T[]; total: number; nextCursor?: string | null; hasMore?: boolean };

export type CityListItemDto = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  isFeatured?: boolean;
  readinessStatus?: 'READY' | 'NEEDS_WORK' | 'BLOCKED' | string;
  stats?: { eventsCount?: number; venuesCount?: number; landingsCount?: number };
  flags?: { hasSeo?: boolean };
};

export type CityLandingDto = {
  id: string;
  slug: string;
  title: string;
  status?: string | null;
  isActive?: boolean | null;
  landingType?: string | null;
  isIndexable?: boolean | null;
  updatedAt?: string | null;
};

export type CityDetailDto = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  version?: number;
  description?: string | null;
  heroImage?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isFeatured?: boolean | null;
  readinessStatus?: string;
  flags?: { hasSeo?: boolean };
  stats?: Record<string, unknown>;
  landingPages?: CityLandingDto[];
  hubReadiness?: Record<string, unknown>;
};

export type CitiesModule = {};

