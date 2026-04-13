export type ChatFilters = {
  q?: string;
  status?: string;
};

export const chatFiltersDefaults: Required<ChatFilters> = {
  q: '',
  status: '',
};

