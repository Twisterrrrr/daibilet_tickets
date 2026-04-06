import { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { SupplierDetailView } from '@/features/supplier-detail/supplier-detail-view';
import { blueprintSupplierDetail } from '@/shared/config/admin-v2-blueprints';
import { IntegrationBlueprint } from '@/shared/layout/admin-v2-blueprint';
import { DetailPageLayout } from '@/shared/layout/detail-page-layout';
import { formatDateTime } from '@/shared/lib/format';
import { getMockSupplierById } from '@/shared/mock/suppliers';
import { Badge } from '@/shared/ui/badge';
import { Button, buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { StatusBadge } from '@/shared/ui/status-badge';

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supplier = useMemo(() => (id ? getMockSupplierById(id) : undefined), [id]);

  if (!id) return <Navigate to="/suppliers" replace />;
  if (!supplier) return <Navigate to="/suppliers" replace />;

  return (
    <DetailPageLayout
      title={supplier.name}
      subtitle={supplier.legalName}
      glyph={<PageGlyph icon={Building2} tone="slate" />}
      meta={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge value={supplier.status} kind="supplier" />
          <Badge variant="default">{supplier.eventsCount} событий</Badge>
          <Badge variant="default">Обновлено {formatDateTime(supplier.updatedAt)}</Badge>
        </span>
      }
      actions={
        <>
          <Link to="/suppliers" className={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'no-underline')}>
            К списку
          </Link>
          <Button type="button" variant="secondary">
            Действия (мок)
          </Button>
        </>
      }
      tabs={<SupplierDetailView supplier={supplier} />}
      blueprint={<IntegrationBlueprint {...blueprintSupplierDetail} />}
    />
  );
}
