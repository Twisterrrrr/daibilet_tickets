import { Building2 } from 'lucide-react';

import { VenuesListView } from '@/features/venues-list/venues-list-view';
import { ListPageLayout } from '@/shared/layout/list-page-layout';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { getMockVenues } from '@/shared/mock/venues';
import { Button } from '@/shared/ui/button';

const venues = getMockVenues();

export function VenuesListPage() {
  return (
    <ListPageLayout
      title="Площадки"
      subtitle="Каталог точек проведения с мягкой таблицей и фильтрами."
      headerGlyph={<PageGlyph icon={Building2} tone="slate" />}
      headerActions={<Button variant="secondary">Добавить площадку</Button>}
    >
      <VenuesListView rows={venues} />
    </ListPageLayout>
  );
}
