export type VenuesFilters = {
  q?: string;
  city?: string;
  status?: string;
};

export const venuesFiltersDefaults: Required<VenuesFilters> = {
  q: '',
  city: '',
  status: '',
};

