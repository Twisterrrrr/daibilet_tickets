/** Подписи и маппинги для модерации отзывов (паритет с legacy Admin V2). */

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING_EMAIL: 'Ждёт email',
  PENDING: 'На модерации',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонён',
  HIDDEN: 'Скрыт',
};

export const DISPUTE_REASON_LABELS: Record<string, string> = {
  FALSE_FACTS: 'Неверные факты',
  OFF_TOPIC: 'Не по теме',
  ABUSIVE: 'Оскорбления',
  PERSONAL_DATA: 'Персональные данные',
  BLACKMAIL: 'Шантаж',
  SPAM: 'Спам',
};

/** Значения API: PATCH /admin/reviews/disputes/:id/resolve { status } */
export const DISPUTE_RESOLVE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'RESOLVED_KEEP', label: 'Оставить отзыв' },
  { value: 'RESOLVED_EDIT', label: 'Оставить с правкой (закрыть спор)' },
  { value: 'RESOLVED_HIDE', label: 'Скрыть отзыв' },
  { value: 'RESOLVED_DELETE', label: 'Удалить отзыв' },
];

export function reviewStars(n: number): string {
  const r = Math.max(0, Math.min(5, Math.round(n)));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}
