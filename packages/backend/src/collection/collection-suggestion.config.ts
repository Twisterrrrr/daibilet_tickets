export const MIN_EVENTS_FOR_SUGGESTION = 6;

export const ALLOWED_STRUCTURAL_SUGGESTIONS = ['walking', 'boat', 'museums', 'family', 'bus-tour', 'rooftop'] as const;

export const ALLOWED_POPULAR_SUGGESTIONS = ['bridge_opening', 'salyut', 'white_nights', 'new_year', 'navy_day'] as const;

export const ALLOWED_COMBINATIONS = [
  ['family', 'walking'],
  ['romantic', 'boat'],
  ['museums', 'kids'],
] as const;
