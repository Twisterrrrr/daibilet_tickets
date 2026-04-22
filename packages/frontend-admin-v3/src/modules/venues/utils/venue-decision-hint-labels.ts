import type { VenueDecisionHint } from '@/modules/venues/api/candidates';

const HINT_LABEL: Record<VenueDecisionHint, string> = {
  MERGE_RECOMMENDED: 'Рекомендуется объединение',
  APPROVE_AS_NEW: 'Можно как новую',
  NEEDS_REVIEW: 'Нужна проверка',
  REJECT_RECOMMENDED: 'Рекомендуется отклонить',
  NO_HINT: '',
};

export function venueDecisionHintLabel(hint: VenueDecisionHint): string {
  return HINT_LABEL[hint] ?? '';
}

export function venueDecisionHintReasonLabel(code: string): string {
  const map: Record<string, string> = {
    HIGH_CONFIDENCE: 'высокая уверенность',
    LOW_CONFIDENCE: 'низкая уверенность',
    NEEDS_REVIEW_FLAG: 'флаг проверки',
    NO_DUPLICATES: 'нет дублей',
    MULTIPLE_DUPLICATES: 'несколько дублей',
    SAME_CITY: 'тот же город',
    TITLE_SIMILARITY_HIGH: 'сильная схожесть названий',
    TITLE_SIMILARITY_MEDIUM: 'средняя схожесть названий',
    ADDRESS_SIMILARITY_HIGH: 'сильная схожесть адресов',
    ADDRESS_SIMILARITY_MEDIUM: 'средняя схожесть адресов',
    ADDRESS_SIMILARITY_LOW: 'слабая схожесть адресов',
    SOURCE_INVALID: 'подозрительные данные',
    WRONG_CITY: 'город',
  };
  return map[code] ?? code;
}
