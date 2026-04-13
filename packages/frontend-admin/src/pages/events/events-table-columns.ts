/** Колонки таблицы событий (паритет с admin-v2). Ключ хранения отдельный от v2. */
const STORAGE_KEY = 'daibilet-admin-events-table-columns-v1';

export type EventTableColumnId =
  | 'title'
  | 'city'
  | 'status'
  | 'source'
  | 'quality'
  | 'issues'
  | 'supplier'
  | 'sessions'
  | 'created'
  | 'updated';

export const EVENT_TABLE_COLUMN_IDS: EventTableColumnId[] = [
  'title',
  'city',
  'status',
  'source',
  'quality',
  'issues',
  'supplier',
  'sessions',
  'created',
  'updated',
];

export const EVENT_TABLE_COLUMN_LABELS: Record<EventTableColumnId, string> = {
  title: 'Событие',
  city: 'Город',
  status: 'Статус',
  source: 'Источник',
  quality: 'Quality',
  issues: 'Issues',
  supplier: 'Поставщик',
  sessions: 'Сеансы',
  created: 'Создано',
  updated: 'Обновлено',
};

export const EVENT_TABLE_COLUMN_REQUIRED: EventTableColumnId = 'title';

export const DEFAULT_EVENTS_VISIBLE_COLUMNS: EventTableColumnId[] = [
  'title',
  'city',
  'status',
  'source',
  'quality',
  'issues',
  'updated',
];

function normalizeOrder(ids: unknown): EventTableColumnId[] {
  if (!Array.isArray(ids)) return [...DEFAULT_EVENTS_VISIBLE_COLUMNS];
  const out: EventTableColumnId[] = [];
  for (const id of ids as string[]) {
    if (EVENT_TABLE_COLUMN_IDS.includes(id as EventTableColumnId)) out.push(id as EventTableColumnId);
  }
  if (!out.includes(EVENT_TABLE_COLUMN_REQUIRED)) {
    out.unshift(EVENT_TABLE_COLUMN_REQUIRED);
  }
  const seen = new Set<EventTableColumnId>();
  return out.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function loadPersistedEventsColumns(): EventTableColumnId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_EVENTS_VISIBLE_COLUMNS];
    const parsed = JSON.parse(raw) as unknown;
    return normalizeOrder(parsed);
  } catch {
    return [...DEFAULT_EVENTS_VISIBLE_COLUMNS];
  }
}

export function savePersistedEventsColumns(order: EventTableColumnId[]): void {
  try {
    const next = normalizeOrder(order);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
