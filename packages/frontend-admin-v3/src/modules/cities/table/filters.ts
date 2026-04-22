export type CitiesFilters = {
  q?: string;
  isFeatured?: string;
};

export const citiesFiltersDefaults: Required<CitiesFilters> = {
  q: '',
  isFeatured: '',
};

