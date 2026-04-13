import * as React from 'react';
import { EventsListRow, type EventListRowData } from './EventsListRow';

const items: EventListRowData[] = [
  {
    id: 'evt_1',
    title: 'Ночная прогулка под развод мостов с экскурсией на борту и аудиогидом',
    slug: 'night-bridges-spb',
    city: 'Санкт-Петербург',
    venueName: 'Причал у Дворцового моста',
    source: 'MANUAL',
    status: 'published',
    isActive: true,
    categoryLabel: 'Экскурсии',
    subcategories: ['Ночные прогулки', 'Развод мостов', 'Теплоходы', 'Аудиогид'],
    readiness: { state: 'ready', score: 96, issues: [] },
    commerce: { priceFrom: '1 490 ₽', activeOffersCount: 3 },
    schedule: { modeLabel: 'Повторяющееся', nextSessionLabel: 'Сегодня, 23:55', futureSessionsCount: 18 },
  },
  {
    id: 'evt_2',
    title: 'Экскурсия по рекам и каналам',
    slug: 'rivers-and-canals-spb',
    city: 'Санкт-Петербург',
    venueName: 'Причал на Фонтанке',
    source: 'TICKETSCLOUD',
    status: 'draft',
    isActive: false,
    categoryLabel: 'Экскурсии',
    subcategories: ['Реки и каналы'],
    readiness: { state: 'needs-work', score: 61, issues: ['NO_PHOTO', 'NO_PRICE', 'NO_ACTIVE_OFFER'] },
    commerce: { priceFrom: null, activeOffersCount: 0 },
    schedule: { modeLabel: 'Разовое', nextSessionLabel: 'Нет ближайшего сеанса', futureSessionsCount: 0 },
  },
  {
    id: 'evt_3',
    title: 'Квест-перформанс в темноте: иммерсивное шоу',
    slug: 'immersive-quest',
    city: 'Санкт-Петербург',
    venueName: 'Локация сообщим позже',
    source: 'TEPLOHOD',
    status: 'review',
    isActive: true,
    categoryLabel: 'Развлечения',
    subcategories: ['Иммерсив', 'Квесты'],
    readiness: { state: 'blocked', score: 34, issues: ['NO_SESSIONS', 'MISSING_LOCATION'] },
    commerce: { priceFrom: '2 990 ₽', activeOffersCount: 1 },
    schedule: { modeLabel: 'Открытая дата', nextSessionLabel: null, futureSessionsCount: 0 },
  },
];

export function EventsTableDemo() {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  return (
    <div className="overflow-hidden rounded-2xl border bg-background">
      <div className="grid grid-cols-[40px_1.8fr_220px_220px_220px_124px] border-b bg-muted/40 px-0 py-2 text-xs font-medium text-muted-foreground">
        <div />
        <div className="px-3">Событие</div>
        <div className="px-3">Готовность</div>
        <div className="px-3">Коммерция</div>
        <div className="px-3">Расписание</div>
        <div className="px-3 text-right">Действия</div>
      </div>

      {items.map((item) => (
        <EventsListRow
          key={item.id}
          item={item}
          selected={selectedIds.includes(item.id)}
          onSelect={(id, checked) => {
            setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
          }}
          onOpen={() => {}}
          onArchive={() => {}}
        />
      ))}
    </div>
  );
}

