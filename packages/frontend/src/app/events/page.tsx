import { Suspense } from 'react';
import { EventsPageClient } from './EventsPageClient';
import EventsCatalogLoading from './loading';

export default function EventsPage() {
  return (
    <Suspense fallback={<EventsCatalogLoading />}>
      <EventsPageClient />
    </Suspense>
  );
}
