import { LayoutDashboard, Plus } from 'lucide-react';

import { DashboardOverviewView } from '@/features/dashboard-overview/dashboard-overview';
import { ListPageLayout } from '@/shared/layout/list-page-layout';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { getMockDashboardOverview } from '@/shared/mock/dashboard';
import { Button } from '@/shared/ui/button';

const overview = getMockDashboardOverview();

export function DashboardPage() {
  return (
    <ListPageLayout
      title="Обзор"
      subtitle="Спокойная панель без аналитического шума — только то, что помогает команде."
      headerGlyph={<PageGlyph icon={LayoutDashboard} tone="sky" />}
      headerActions={
        <>
          <Button type="button" variant="secondary" size="md">
            Экспорт (скоро)
          </Button>
          <Button type="button" variant="primary" size="md">
            <Plus className="h-4 w-4" aria-hidden />
            Создать
          </Button>
        </>
      }
    >
      <DashboardOverviewView data={overview} />
    </ListPageLayout>
  );
}
