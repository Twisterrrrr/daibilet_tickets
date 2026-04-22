import { Building2 } from 'lucide-react';

import { VenuesListView } from '@/features/venues-list/venues-list-view';
import { blueprintVenuesList } from '@/shared/config/admin-v2-blueprints';
import { IntegrationBlueprint } from '@/shared/layout/admin-v2-blueprint';
import { ListPageLayout } from '@/shared/layout/list-page-layout';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { getMockVenues } from '@/shared/mock/venues';
import { Button } from '@/shared/ui/button';

const venues = getMockVenues();

export function VenuesListPage() {
  return (
    <ListPageLayout
      title="Площадки"
      subtitle="Музеи, галереи, театры и парки (Venue). Причалы и старт маршрутов — не здесь: в проде это Location; отдельный хаб под причалы можно вести с каталога / речных лендингов."
      headerGlyph={<PageGlyph icon={Building2} tone="slate" />}
      headerActions={<Button variant="secondary">Добавить площадку</Button>}
      blueprint={<IntegrationBlueprint {...blueprintVenuesList} />}
    >
      <VenuesListView rows={venues} />
    </ListPageLayout>
  );
}
