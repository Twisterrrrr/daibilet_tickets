import type { EventEntity } from '@/entities/event/types';
import { formatDateTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Surface } from '@/shared/ui/surface';
import { DetailTabs } from '@/shared/layout/detail-tabs';
import { SectionTitle } from '@/shared/ui/section-title';

export function EventDetailView({ event }: { event: EventEntity }) {
  return (
    <DetailTabs
      defaultValue="main"
      items={[
        {
          id: 'main',
          label: 'Основное',
          content: <EventMainTab event={event} />,
        },
        {
          id: 'schedule',
          label: 'Расписание',
          content: <EventScheduleTab event={event} />,
        },
        {
          id: 'offers',
          label: 'Тарифы',
          content: <EventOffersTab />,
        },
        {
          id: 'seo',
          label: 'SEO',
          content: <EventSeoTab event={event} />,
        },
        {
          id: 'media',
          label: 'Медиа',
          content: <EventMediaTab />,
        },
        {
          id: 'quality',
          label: 'Качество',
          content: <EventQualityTab event={event} />,
        },
      ]}
    />
  );
}

function EventMainTab({ event }: { event: EventEntity }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Surface padding="md">
        <SectionTitle title="Карточка" description="Ключевые поля без форм и сохранения." />
        <dl className="mt-6 space-y-4">
          <div>
            <dt className="text-label text-text-muted">Поставщик</dt>
            <dd className="mt-1 text-body text-text-primary">{event.supplierName}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Город</dt>
            <dd className="mt-1 text-body text-text-primary">{event.city}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Статус и источник</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              <StatusBadge value={event.status} kind="event" />
              <StatusBadge value={event.source} kind="source" />
            </dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Кратко</dt>
            <dd className="mt-1 text-body text-text-secondary">{event.shortDescription}</dd>
          </div>
        </dl>
      </Surface>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Сводка сеансов" description={event.sessionsSummary} />
        <p className="mt-6 text-small text-text-secondary">
          Обновлено {formatDateTime(event.updatedAt)} · создано {formatDateTime(event.createdAt)}
        </p>
      </Surface>
    </div>
  );
}

function EventScheduleTab({ event }: { event: EventEntity }) {
  const sessions = [
    { at: '2025-03-26T10:30:00.000Z', label: 'Дневной выход', seats: '14 / 18' },
    { at: '2025-03-26T14:00:00.000Z', label: 'Дневной выход', seats: '9 / 18' },
    { at: '2025-03-27T10:30:00.000Z', label: 'Будни', seats: '18 / 18' },
  ];
  return (
    <Surface padding="md">
      <SectionTitle title="Ближайшие сеансы" description={event.sessionsSummary} />
      <ul className="mt-6 divide-y divide-border-soft">
        {sessions.map((s, i) => (
          <li key={i} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div>
              <p className="text-body text-text-primary">{s.label}</p>
              <p className="text-small text-text-muted">{formatDateTime(s.at)}</p>
            </div>
            <Badge variant="default">{s.seats}</Badge>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

function EventOffersTab() {
  const offers = [
    { name: 'Стандарт', price: '1 800 ₽', hint: 'Взрослый, основной зал' },
    { name: 'Семейный', price: '3 200 ₽', hint: '2 взрослых + ребёнок' },
    { name: 'Приват (малый)', price: '9 500 ₽', hint: 'До 8 человек' },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {offers.map((o) => (
        <Surface key={o.name} padding="md" className="hover:border-border">
          <p className="text-section text-text-primary">{o.name}</p>
          <p className="mt-3 text-h2 text-text-primary">{o.price}</p>
          <p className="mt-2 text-small text-text-secondary">{o.hint}</p>
        </Surface>
      ))}
    </div>
  );
}

function EventSeoTab({ event }: { event: EventEntity }) {
  return (
    <Surface padding="md">
      <SectionTitle title="SEO-блок" description="Спокойная зона без редакторов." />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-label text-text-muted">URL</p>
          <p className="mt-1 rounded-control border border-border-soft bg-surface-alt px-3 py-2 font-mono text-small text-text-primary">
            /events/{event.slug}
          </p>
        </div>
        <div>
          <p className="text-label text-text-muted">Title</p>
          <p className="mt-1 text-body text-text-primary">{event.title} — Дайбилет</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-label text-text-muted">Meta description</p>
          <p className="mt-1 text-body text-text-secondary">
            {event.shortDescription} Билеты онлайн, спокойная покупка, поддержка 24/7.
          </p>
        </div>
      </div>
    </Surface>
  );
}

function EventMediaTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex aspect-[4/3] items-center justify-center rounded-card border border-dashed border-border-soft bg-surface-alt/80 text-small text-text-muted"
        >
          Изображение {i + 1}
        </div>
      ))}
    </div>
  );
}

function EventQualityTab({ event }: { event: EventEntity }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Surface padding="md" className="lg:col-span-1">
        <SectionTitle title="Score" description="Агрегированная оценка карточки." />
        <p className="mt-6 text-4xl font-semibold tracking-tight text-text-primary">{event.qualityScore}</p>
        <p className="mt-2 text-small text-text-secondary">Цель для публикации: 85+</p>
      </Surface>
      <Surface padding="md" className="lg:col-span-2">
        <SectionTitle title="Замечания" description={`Открыто: ${event.issuesCount}`} />
        <ul className="mt-6 space-y-3 text-small text-text-secondary">
          <li>— Заполнить расписание на апрель</li>
          <li>— Проверить обложку 3:2 для маркетинга</li>
          <li>— Уточнить возрастные ограничения в оферте</li>
        </ul>
        <div className="mt-8 rounded-control border border-border-soft bg-surface-alt px-4 py-3 text-small text-text-secondary">
          Рекомендация: после правок пересчитать quality и отправить поставщику короткий чек-лист.
        </div>
      </Surface>
    </div>
  );
}
