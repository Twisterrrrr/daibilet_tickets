export type CollectionsFilters = {
  q?: string;
  city?: string;
  status?: string;
};

export const collectionsFiltersDefaults: Required<CollectionsFilters> = {
  q: '',
  city: '',
  status: '',
};

