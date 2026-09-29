export type Paginated<T> = { items: T[]; total: number; nextCursor?: string | null; hasMore?: boolean };

export type CollectionListItemDto = {
  id: string;
  title: string;
  slug: string;
  status?: string | null;
  sourceType?: string | null;
  selectionBasis?: string | null;
  city?: { id: string; name: string; slug: string } | null;
  itemsCount?: number | null;
  updatedAt?: string | null;
};

export type CollectionItemDto = {
  id: string;
  sortOrder?: number | null;
  event?: {
    id: string;
    title: string;
    slug: string;
    isActive?: boolean | null;
    source?: string | null;
    priceFrom?: number | null;
    city?: { id: string; name: string; slug: string } | null;
  } | null;
};

export type CollectionDetailDto = {
  id: string;
  title: string;
  slug: string;
  status?: string | null;
  sourceType?: string | null;
  selectionBasis?: string | null;
  isActive?: boolean | null;
  city?: { id: string; name: string; slug: string } | null;
  items?: CollectionItemDto[];
  tagFilters?: Array<{ id: string; tag: { id: string; slug: string; name: string; isActive: boolean } }>;
  filterTags?: string[];
  updatedAt?: string | null;
};

export type CollectionsModule = {};

