import type { VenueEntity } from '@/entities/venue/types';
import { DetailTabs } from '@/shared/layout/detail-tabs';
import { formatDateTime } from '@/shared/lib/format';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Surface } from '@/shared/ui/surface';
import { SectionTitle } from '@/shared/ui/section-title';

export function VenueDetailView({ venue }: { venue: VenueEntity }) {
  return (
    <DetailTabs
      defaultValue="main"
      items={[
        {
          id: 'main',
          label: 'Основное',
          content: <VenueMain venue={venue} />,
        },
        {
          id: 'content',
          label: 'Контент',
          content: <VenueContent />,
        },
        {
          id: 'events',
          label: 'События',
          content: <VenueEvents venue={venue} />,
        },
        {
          id: 'seo',
          label: 'SEO',
          content: <VenueSeo venue={venue} />,
        },
        {
          id: 'media',
          label: 'Медиа',
          content: <VenueMedia />,
        },
      ]}
    />
  );
}

function VenueMain({ venue }: { venue: VenueEntity }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Surface padding="md">
        <SectionTitle title="Профиль площадки" description="Лаконичная карточка без форм." />
        <dl className="mt-6 space-y-4">
          <div>
            <dt className="text-label text-text-muted">Город</dt>
            <dd className="mt-1 text-body text-text-primary">{venue.city}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Статус · тип</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              <StatusBadge value={venue.status} kind="venue" />
              <StatusBadge value={venue.type} kind="venue-type" />
            </dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Описание</dt>
            <dd className="mt-1 text-body text-text-secondary">{venue.shortDescription}</dd>
          </div>
        </dl>
      </Surface>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Метрики" description="Связанные события и качество." />
        <dl className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-label text-text-muted">События</dt>
            <dd className="mt-1 text-h2 text-text-primary">{venue.eventsCount}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Quality</dt>
            <dd className="mt-1 text-h2 text-text-primary">{venue.qualityScore}</dd>
          </div>
          <div className="col-span-2 text-small text-text-muted">
            Обновлено {formatDateTime(venue.updatedAt)}
          </div>
        </dl>
      </Surface>
    </div>
  );
}

function VenueContent() {
  return (
    <Surface padding="md">
      <SectionTitle
        title="Тексты и правила"
        description="Макет зоны для описаний, правил посещения и контактов площадки."
      />
      <p className="mt-6 text-body text-text-secondary">
        Здесь позже появятся редакторы и превью. Сейчас — спокойный плейсхолдер без визуального шума.
      </p>
    </Surface>
  );
}

function VenueEvents({ venue }: { venue: VenueEntity }) {
  const links = [
    { title: 'Речная прогулка у причала', hint: 'Привязано к этой площадке' },
    { title: 'Семейный маршрут по набережной', hint: 'Сезон весна' },
  ];
  return (
    <Surface padding="md">
      <SectionTitle title="События на площадке" description={`Всего в каталоге: ${venue.eventsCount}`} />
      <ul className="mt-6 divide-y divide-border-soft">
        {links.map((l) => (
          <li key={l.title} className="py-3 first:pt-0 last:pb-0">
            <p className="text-body text-text-primary">{l.title}</p>
            <p className="text-small text-text-muted">{l.hint}</p>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

function VenueSeo({ venue }: { venue: VenueEntity }) {
  return (
    <Surface padding="md">
      <SectionTitle title="SEO" description="Шаблон блока для страницы площадки." />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-label text-text-muted">URL</p>
          <p className="mt-1 rounded-control border border-border-soft bg-surface-alt px-3 py-2 font-mono text-small text-text-primary">
            /venues/{venue.id}
          </p>
        </div>
        <div>
          <p className="text-label text-text-muted">Title</p>
          <p className="mt-1 text-body text-text-primary">{venue.name} — Дайбилет</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-label text-text-muted">Meta description</p>
          <p className="mt-1 text-body text-text-secondary">{venue.shortDescription}</p>
        </div>
      </div>
    </Surface>
  );
}

function VenueMedia() {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex aspect-square items-center justify-center rounded-card border border-dashed border-border-soft bg-surface-alt/80 text-small text-text-muted"
        >
          Медиа {i + 1}
        </div>
      ))}
    </div>
  );
}
