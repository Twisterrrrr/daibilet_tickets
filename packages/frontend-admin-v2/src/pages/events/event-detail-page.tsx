import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { EventDetailView } from '@/features/event-detail/event-detail-view';
import { DetailPageLayout } from '@/shared/layout/detail-page-layout';
import { formatDateTime } from '@/shared/lib/format';
import { getMockEventById } from '@/shared/mock/events';
import { Badge } from '@/shared/ui/badge';
import { Button, buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { StatusBadge } from '@/shared/ui/status-badge';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const event = useMemo(() => (id ? getMockEventById(id) : undefined), [id]);

  if (!id) return <Navigate to="/events" replace />;
  if (!event) return <Navigate to="/events" replace />;

  return (
    <DetailPageLayout
      title={event.title}
      subtitle={event.shortDescription}
      glyph={<PageGlyph icon={CalendarDays} tone="peach" />}
      meta={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge value={event.status} kind="event" />
          <StatusBadge value={event.source} kind="source" />
          <Badge variant="default">Обновлено {formatDateTime(event.updatedAt)}</Badge>
        </span>
      }
      actions={
        <>
          <Link to="/events" className={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'no-underline')}>
            К списку
          </Link>
          <Button type="button" variant="secondary">
            Предпросмотр
          </Button>
        </>
      }
      tabs={<EventDetailView event={event} />}
    />
  );
}
