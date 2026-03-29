import { CalendarDays } from 'lucide-react';

import { EventsListView } from '@/features/events-list/events-list-view';
import { ListPageLayout } from '@/shared/layout/list-page-layout';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { getMockEvents } from '@/shared/mock/events';
import { Button } from '@/shared/ui/button';

const events = getMockEvents();

export function EventsListPage() {
  return (
    <ListPageLayout
      title="События"
      subtitle="Лёгкий список с фильтрами — без Excel-ощущения."
      headerGlyph={<PageGlyph icon={CalendarDays} tone="mint" />}
      headerActions={
        <Button type="button" variant="secondary">
          Новое событие
        </Button>
      }
    >
      <EventsListView rows={events} />
    </ListPageLayout>
  );
}
