import { useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { OrderDetailView } from '@/features/order-detail/order-detail-view';
import { blueprintOrderDetail } from '@/shared/config/admin-v2-blueprints';
import { IntegrationBlueprint } from '@/shared/layout/admin-v2-blueprint';
import { DetailPageLayout } from '@/shared/layout/detail-page-layout';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { getMockOrderById } from '@/shared/mock/orders';
import { Badge } from '@/shared/ui/badge';
import { Button, buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { StatusBadge } from '@/shared/ui/status-badge';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const order = useMemo(() => (id ? getMockOrderById(id) : undefined), [id]);

  if (!id) return <Navigate to="/orders" replace />;
  if (!order) return <Navigate to="/orders" replace />;

  return (
    <DetailPageLayout
      title={order.code}
      subtitle={order.eventTitle}
      glyph={<PageGlyph icon={ShoppingCart} tone="amber" />}
      meta={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge value={order.status} kind="order" />
          <Badge variant="default">{formatMoney(order.amount, order.currency)}</Badge>
          <Badge variant="default">Обновлено {formatDateTime(order.updatedAt)}</Badge>
        </span>
      }
      actions={
        <>
          <Link to="/orders" className={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'no-underline')}>
            К списку
          </Link>
          <Button type="button" variant="secondary">
            Действия (мок)
          </Button>
        </>
      }
      tabs={<OrderDetailView order={order} />}
      blueprint={<IntegrationBlueprint {...blueprintOrderDetail} />}
    />
  );
}
