import type { CollectionDetail } from '@/shared/mock/collections';
import { DetailTabs } from '@/shared/layout/detail-tabs';
import { formatDateTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { SectionTitle } from '@/shared/ui/section-title';
import { Surface } from '@/shared/ui/surface';

export function CollectionDetailView({ collection }: { collection: CollectionDetail }) {
  return (
    <DetailTabs
      defaultValue="overview"
      items={[
        { id: 'overview', label: 'Обзор', content: <ColOverview collection={collection} /> },
        { id: 'items', label: 'Состав', content: <ColItems collection={collection} /> },
        { id: 'seo', label: 'SEO', content: <ColSeo collection={collection} /> },
        { id: 'system', label: 'Системное', content: <ColSystem collection={collection} /> },
      ]}
    />
  );
}

function ColOverview({ collection }: { collection: CollectionDetail }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant={collection.status === 'Опубликовано' ? 'success' : 'default'}>{collection.status}</Badge>
        <Badge variant="default">{collection.itemsCount} элементов</Badge>
        {collection.pinnedFirst ? <Badge variant="accent">Пин первого</Badge> : null}
      </div>
      <Surface padding="md">
        <SectionTitle title="Описание" description="Текст для витрины и админки." />
        <p className="mt-4 text-body text-text-secondary">{collection.description}</p>
      </Surface>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Куратор" />
        <p className="mt-4 text-body text-text-primary">{collection.curatedBy}</p>
      </Surface>
    </div>
  );
}

function ColItems({ collection }: { collection: CollectionDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Элементы подборки" description="Первые позиции (mock)." />
      <ul className="mt-6 space-y-3">
        {collection.itemTitles.map((title, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-4 rounded-control border border-border-soft bg-surface-alt px-4 py-3 text-body text-text-primary"
          >
            <span>{title}</span>
            <Badge variant="default">#{i + 1}</Badge>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

function ColSeo({ collection }: { collection: CollectionDetail }) {
  const publicPath = 'collections/' + collection.slug;
  return (
    <Surface padding="md">
      <SectionTitle title="Meta" />
      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-label text-text-muted">Title</dt>
          <dd className="mt-1 text-body text-text-primary">{collection.metaTitle}</dd>
        </div>
        <div>
          <dt className="text-label text-text-muted">Description</dt>
          <dd className="mt-1 text-body text-text-secondary">{collection.metaDescription}</dd>
        </div>
        <div>
          <dt className="text-label text-text-muted">Slug</dt>
          <dd className="mt-1 font-mono text-small text-text-primary">/{publicPath}</dd>
        </div>
      </dl>
    </Surface>
  );
}

function ColSystem({ collection }: { collection: CollectionDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Идентификаторы" />
      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-label text-text-muted">ID</dt>
          <dd className="mt-1 font-mono text-small text-text-primary">{collection.id}</dd>
        </div>
        <div>
          <dt className="text-label text-text-muted">Обновлено</dt>
          <dd className="mt-1 text-small text-text-secondary">{formatDateTime(collection.updatedAt)}</dd>
        </div>
      </dl>
    </Surface>
  );
}
