import { ShoppingCart } from 'lucide-react';

import { OrdersListView } from '@/features/orders-list/orders-list-view';
import { ListPageLayout } from '@/shared/layout/list-page-layout';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { getMockOrders } from '@/shared/mock/orders';

const orders = getMockOrders();

export function OrdersListPage() {
  return (
    <ListPageLayout
      title="Заказы"
      subtitle="Статусы и суммы — спокойный операционный вид."
      headerGlyph={<PageGlyph icon={ShoppingCart} tone="amber" />}
    >
      <OrdersListView rows={orders} />
    </ListPageLayout>
  );
}
