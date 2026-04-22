export type LandingsFilters = {
  q?: string;
  city?: string;
  status?: string;
};

export const landingsFiltersDefaults: Required<LandingsFilters> = {
  q: '',
  city: '',
  status: '',
};

