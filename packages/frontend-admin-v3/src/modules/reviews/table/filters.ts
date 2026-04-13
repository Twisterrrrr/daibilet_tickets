export type ReviewsFilters = {
  q?: string;
  rating?: string;
  status?: string;
};

export const reviewsFiltersDefaults: Required<ReviewsFilters> = {
  q: '',
  rating: '',
  status: '',
};

