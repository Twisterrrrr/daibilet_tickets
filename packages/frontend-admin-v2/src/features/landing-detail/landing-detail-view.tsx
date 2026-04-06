import type { LandingDetail } from '@/shared/mock/landings';
import { DetailTabs } from '@/shared/layout/detail-tabs';
import { formatDateTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { SectionTitle } from '@/shared/ui/section-title';
import { Surface } from '@/shared/ui/surface';

export function LandingDetailView({ landing }: { landing: LandingDetail }) {
  return (
    <DetailTabs
      defaultValue="overview"
      items={[
        { id: 'overview', label: 'Обзор', content: <LandOverview landing={landing} /> },
        { id: 'blocks', label: 'Блоки', content: <LandBlocks landing={landing} /> },
        { id: 'seo', label: 'SEO', content: <LandSeo landing={landing} /> },
        { id: 'system', label: 'Системное', content: <LandSystem landing={landing} /> },
      ]}
    />
  );
}

function LandOverview({ landing }: { landing: LandingDetail }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant={landing.status === 'Активен' ? 'success' : 'default'}>{landing.status}</Badge>
        <Badge variant="default">v{landing.version}</Badge>
        <Badge variant="default">{landing.cityHint}</Badge>
      </div>
      <Surface padding="md">
        <SectionTitle title="Hero" description="Заголовки посадочной (mock)." />
        <div className="mt-4 space-y-2">
          <p className="text-h2 text-text-primary">{landing.heroTitle}</p>
          <p className="text-body text-text-secondary">{landing.heroSubtitle}</p>
        </div>
      </Surface>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Кампания" />
        <p className="mt-4 font-mono text-small text-text-primary">{landing.campaignTag}</p>
        <p className="mt-2 text-label text-text-muted">Публичный путь</p>
        <code className="mt-1 block text-small text-text-secondary">{landing.path}</code>
      </Surface>
    </div>
  );
}

function LandBlocks({ landing }: { landing: LandingDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Структура страницы" description="Порядок блоков лендинга." />
      <ul className="mt-6 space-y-3">
        {landing.blocksSummary.map((b, i) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border-soft bg-surface-alt px-4 py-3"
          >
            <div>
              <p className="text-body text-text-primary">{b.label}</p>
              <p className="text-small text-text-muted">{b.kind}</p>
            </div>
            <Badge variant="default">#{i + 1}</Badge>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

function LandSeo({ landing }: { landing: LandingDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Meta" />
      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-label text-text-muted">Title</dt>
          <dd className="mt-1 text-body text-text-primary">{landing.seoTitle}</dd>
        </div>
        <div>
          <dt className="text-label text-text-muted">Description</dt>
          <dd className="mt-1 text-body text-text-secondary">{landing.seoDescription}</dd>
        </div>
      </dl>
    </Surface>
  );
}

function LandSystem({ landing }: { landing: LandingDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Идентификаторы" />
      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-label text-text-muted">Slug (мультилендинг)</dt>
          <dd className="mt-1 font-mono text-small text-text-primary">{landing.slug}</dd>
        </div>
        <div>
          <dt className="text-label text-text-muted">ID</dt>
          <dd className="mt-1 font-mono text-small text-text-primary">{landing.id}</dd>
        </div>
        <div>
          <dt className="text-label text-text-muted">Обновлено</dt>
          <dd className="mt-1 text-small text-text-secondary">{formatDateTime(landing.updatedAt)}</dd>
        </div>
      </dl>
    </Surface>
  );
}
