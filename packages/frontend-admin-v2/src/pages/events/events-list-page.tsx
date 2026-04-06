import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EventsListView } from '@/features/events-list/events-list-view';
import { blueprintEventsList } from '@/shared/config/admin-v2-blueprints';
import { IntegrationBlueprint } from '@/shared/layout/admin-v2-blueprint';
import { ListPageLayout } from '@/shared/layout/list-page-layout';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { getMockEvents } from '@/shared/mock/events';
import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';

const events = getMockEvents();

export function EventsListPage() {
  return (
    <ListPageLayout
      title="События"
      subtitle="Лёгкий список с фильтрами — без Excel-ощущения."
      headerGlyph={<PageGlyph icon={CalendarDays} tone="mint" />}
      headerActions={
        <Link to="/events/new" className={cn(buttonVariants({ variant: 'secondary', size: 'md' }), 'no-underline')}>
          Новое событие
        </Link>
      }
      blueprint={<IntegrationBlueprint {...blueprintEventsList} />}
    >
      <EventsListView rows={events} />
    </ListPageLayout>
  );
}
