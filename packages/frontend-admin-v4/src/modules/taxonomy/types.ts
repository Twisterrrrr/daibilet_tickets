export type Paginated<T> = { items: T[]; total: number; nextCursor?: string | null; hasMore?: boolean };

export type TagDto = {
  id: string;
  slug: string;
  name?: string | null;
  category?: string | null;
  tagKind?: string | null;
  structuralGroup?: string | null;
  isDeleted?: boolean | null;
  _count?: { events?: number; articleTags?: number } | null;
};

export type SubcategoryDto = {
  id: string;
  slug: string;
  code?: string | null;
  nameRu?: string | null;
  type?: string | null;
  layer?: string | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
  parent?: { id: string; slug: string; nameRu?: string | null } | null;
  usage?: { eventsCount: number; venuesCount: number } | null;
};

export type TaxonomyModule = {};

