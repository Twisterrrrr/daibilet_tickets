export type AdminErrorUiMeta = {
  title: string;
  description?: string;
  actionLabel?: string;
};

/**
 * Каталог доменных кодов API (см. тело ошибки Nest: { code, message }).
 * Неизвестный код → показываем message как раньше.
 */
export const adminErrorCodes: Record<string, AdminErrorUiMeta> = {
  VENUE_APPROVE_NOT_DRAFT: {
    title: 'Площадка уже не в статусе черновика',
    description: 'Обновите список и проверьте актуальный статус.',
  },
  VENUE_MERGE_SELF: {
    title: 'Нельзя сливать площадку саму с собой',
  },
  VENUE_MERGE_CYCLE: {
    title: 'Обнаружен цикл при объединении',
  },
  VENUE_MERGE_SOURCE_MERGED: {
    title: 'Исходная площадка уже объединена',
  },
  VENUE_MERGE_SOURCE_REJECTED: {
    title: 'Нельзя объединить отклонённую площадку',
  },
  VENUE_MERGE_TARGET_INVALID: {
    title: 'Некорректная цель объединения',
  },
  VENUE_MERGE_TARGET_NOT_ACTIVE: {
    title: 'Целевая площадка должна быть активной',
  },
  VENUE_WHITELIST_NOT_ALLOWED: {
    title: 'Whitelist страницы недоступен для этого статуса',
  },
  VENUE_PUBLISH_NOT_ALLOWED: {
    title: 'Публикация недоступна для этого статуса жизненного цикла',
  },
  VENUE_SIMILAR_BATCH_IDS_REQUIRED: {
    title: 'Не передан список площадок',
  },
  VENUE_NOT_FOUND: {
    title: 'Площадка не найдена',
    description: 'Обновите список и попробуйте снова.',
  },
  MERGE_TARGET_NOT_FOUND: {
    title: 'Целевая площадка не найдена',
  },
  VENUE_MERGE_SELF_TARGET: {
    title: 'Нельзя объединить площадку саму с собой',
  },
  VENUE_MERGE_PREVIEW_CANDIDATE_NOT_DRAFT: {
    title: 'Предпросмотр доступен только для черновика (DRAFT)',
  },
  VENUE_MERGE_PREVIEW_TARGET_INVALID: {
    title: 'Целевая площадка не подходит для объединения',
  },
  VENUE_MERGE_PREVIEW_INVALID_SOURCE: {
    title: 'Объединение для этой записи недоступно',
  },
  VENUE_BATCH_LIMIT_EXCEEDED: {
    title: 'Слишком много записей в одном запросе',
    description: 'Уменьшите размер выборки (не более 50).',
  },
  VALIDATION_ERROR: {
    title: 'Ошибка проверки данных',
  },
  VENUE_REJECT_NOT_DRAFT: {
    title: 'Отклонить можно только черновик (DRAFT)',
  },
  VENUE_ALREADY_REJECTED: {
    title: 'Запись уже отклонена',
  },
  VENUE_ALREADY_MERGED: {
    title: 'Площадка уже объединена',
  },
  VENUE_STALE_STATE: {
    title: 'Запись изменилась',
    description: 'Данные кандидата обновились. Перезагрузите список и повторите действие.',
  },
  VENUE_SLUG_TAKEN: {
    title: 'Slug уже занят',
    description: 'Выберите другой slug или объедините с существующей площадкой.',
  },
  VENUE_BATCH_APPROVE_PREVIEW_LIMIT_EXCEEDED: {
    title: 'Слишком много записей для предпросмотра',
    description: 'Уменьшите размер выборки.',
  },
};
