export type SuppliersFilters = {
  q?: string;
  status?: string;
};

export const suppliersFiltersDefaults: Required<SuppliersFilters> = {
  q: '',
  status: '',
};

