export type TagsFilters = {
  q?: string;
  kind?: string;
};

export const tagsFiltersDefaults: Required<TagsFilters> = {
  q: '',
  kind: '',
};

