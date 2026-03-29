import { Users } from 'lucide-react';

import { SuppliersListView } from '@/features/suppliers-list/suppliers-list-view';
import { ListPageLayout } from '@/shared/layout/list-page-layout';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { getMockSuppliers } from '@/shared/mock/suppliers';
import { Button } from '@/shared/ui/button';

const suppliers = getMockSuppliers();

export function SuppliersListPage() {
  return (
    <ListPageLayout
      title="Поставщики"
      subtitle="Партнёры, онбординг и качество каталога."
      headerGlyph={<PageGlyph icon={Users} tone="violet" />}
      headerActions={<Button variant="secondary">Пригласить</Button>}
    >
      <SuppliersListView rows={suppliers} />
    </ListPageLayout>
  );
}
