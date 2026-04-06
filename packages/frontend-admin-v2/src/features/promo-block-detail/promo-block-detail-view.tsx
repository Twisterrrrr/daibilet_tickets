import type { PromoBlockDetail } from '@/shared/mock/promo-blocks';
import { DetailTabs } from '@/shared/layout/detail-tabs';
import { formatDateTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { SectionTitle } from '@/shared/ui/section-title';
import { Surface } from '@/shared/ui/surface';

export function PromoBlockDetailView({ block }: { block: PromoBlockDetail }) {
  return (
    <DetailTabs
      defaultValue="overview"
      items={[
        { id: 'overview', label: 'Обзор', content: <PromoOverview block={block} /> },
        { id: 'targeting', label: 'Показ', content: <PromoTargeting block={block} /> },
        { id: 'media', label: 'Медиа', content: <PromoMedia block={block} /> },
        { id: 'system', label: 'Системное', content: <PromoSystem block={block} /> },
      ]}
    />
  );
}

function PromoOverview({ block }: { block: PromoBlockDetail }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant={block.active ? 'success' : 'default'}>{block.active ? 'Активен' : 'Выключен'}</Badge>
        <Badge variant="default">Приоритет {block.priority}</Badge>
        <Badge variant="default">{block.zone}</Badge>
      </div>
      <Surface padding="md">
        <SectionTitle title="Ссылка" description="Куда ведёт клик по баннеру." />
        <code className="mt-4 block break-all text-small text-text-primary">{block.targetUrl}</code>
      </Surface>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Период (кратко)" />
        <p className="mt-4 text-body text-text-primary">{block.period}</p>
      </Surface>
    </div>
  );
}

function PromoTargeting({ block }: { block: PromoBlockDetail }) {
  return (
    <div className="space-y-6">
      <Surface padding="md">
        <SectionTitle title="Расписание" description="Детализация окна показа." />
        <p className="mt-4 text-body text-text-secondary">{block.scheduleDetail}</p>
      </Surface>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Аудитория" />
        <p className="mt-4 text-body text-text-secondary">{block.audience}</p>
        {block.abVariant ? (
          <p className="mt-4 text-small text-text-muted">
            A/B вариант: <span className="font-mono text-text-primary">{block.abVariant}</span>
          </p>
        ) : null}
      </Surface>
    </div>
  );
}

function PromoMedia({ block }: { block: PromoBlockDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Креатив" description="Требования к изображению / видео (mock)." />
      <div className="mt-6 flex aspect-[21/9] max-w-2xl items-center justify-center rounded-card border border-dashed border-border-soft bg-surface-alt text-small text-text-muted">
        Превью баннера
      </div>
      <p className="mt-4 text-body text-text-secondary">{block.imageHint}</p>
    </Surface>
  );
}

function PromoSystem({ block }: { block: PromoBlockDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Идентификаторы" />
      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-label text-text-muted">ID</dt>
          <dd className="mt-1 font-mono text-small text-text-primary">{block.id}</dd>
        </div>
        <div>
          <dt className="text-label text-text-muted">Обновлено</dt>
          <dd className="mt-1 text-small text-text-secondary">{formatDateTime(block.updatedAt)}</dd>
        </div>
      </dl>
    </Surface>
  );
}
