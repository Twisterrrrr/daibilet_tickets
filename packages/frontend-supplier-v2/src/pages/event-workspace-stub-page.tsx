import { CalendarPlus } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { EventMasterSketchView } from '@/features/event-master-sketch/event-master-sketch-view';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { PageHeader, SectionCard } from '@/shared/ui/page-primitives';

/** Маршруты /events/new и /events/:id — визуальный каркас мастера (волна M); API на волне R. */
export function EventWorkspaceStubPage() {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const isNew = pathname.endsWith('/new');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Мастер события"
        subtitle={
          isNew
            ? 'Создание: те же шаги, что в админке V2. Сохранение — волна R; ниже — мок-форма.'
            : `Редактирование · id: ${id ?? '—'} · мок-интерфейс`
        }
        glyph={<PageGlyph icon={CalendarPlus} tone="mint" />}
        actions={
          <Link
            to="/events"
            className="inline-flex min-h-control items-center rounded-control border border-border-soft bg-surface px-4 py-2 text-label font-medium text-text-primary no-underline hover:bg-surface-alt"
          >
            К списку
          </Link>
        }
      />

      <EventMasterSketchView variant="supplier" mode={isNew ? 'create' : 'edit'} />

      <SectionCard title="Классический кабинет">
        <p className="text-small text-text-secondary">
          Пакет <code className="rounded bg-surface-alt px-1 text-text-primary">frontend-supplier</code> (dev-порт 5174) —
          тот же API и сессия. После волны R сюда подключится реальный адаптер вместо моков.
        </p>
      </SectionCard>
    </div>
  );
}
