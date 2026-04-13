export type SeoAuditFilters = {
  q?: string;
  city?: string;
  issue?: string;
};

export const seoAuditFiltersDefaults: Required<SeoAuditFilters> = {
  q: '',
  city: '',
  issue: '',
};

