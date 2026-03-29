import { CalendarPlus } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { PageGlyph } from '@/shared/ui/page-glyph';
import { PageHeader } from '@/shared/ui/page-primitives';

/** Маршруты /events/new и /events/:id — до переноса EventWizard из shared-ui. */
export function EventWorkspaceStubPage() {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const isNew = pathname.endsWith('/new');

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? 'Новое событие' : `Событие ${id ?? ''}`}
        glyph={<PageGlyph icon={CalendarPlus} tone="mint" />}
      />
      <p className="text-body text-text-muted">
        Мастер создания и редактирования в кабинете V2 ещё подключается. Сейчас используйте классический пакет{' '}
        <code className="rounded bg-surface-alt px-1 text-small">frontend-supplier</code> (порт 5174 в dev) — тот же API
        и токен при входе там.
      </p>
      <Link
        to="/events"
        className="inline-block rounded-control border border-border-soft bg-surface px-4 py-2 text-label font-medium text-text-primary no-underline hover:bg-surface-alt"
      >
        ← К списку событий
      </Link>
    </div>
  );
}
