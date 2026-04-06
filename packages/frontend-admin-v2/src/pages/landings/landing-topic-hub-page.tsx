import { useMemo } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { blueprintLandingTopicHub } from '@/shared/config/admin-v2-blueprints';
import { IntegrationBlueprint } from '@/shared/layout/admin-v2-blueprint';
import { ListPageLayout } from '@/shared/layout/list-page-layout';
import { formatDateTime } from '@/shared/lib/format';
import { getMockLandingsBySlug } from '@/shared/mock/landings';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

export function LandingTopicHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const variants = useMemo(() => (slug ? getMockLandingsBySlug(slug) : []), [slug]);

  if (!slug) return <Navigate to="/landings" replace />;
  if (variants.length === 0) return <Navigate to="/landings?view=topics" replace />;

  return (
    <ListPageLayout
      title={`Тема: ${slug}`}
      subtitle="Один slug — несколько посадочных страниц по городам (мультилендинг). Ниже варианты из мока."
      headerGlyph={<PageGlyph icon={LayoutTemplate} tone="sky" />}
      headerActions={
        <Link to="/landings?view=topics" className={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'no-underline')}>
          К списку тем
        </Link>
      }
      blueprint={<IntegrationBlueprint {...blueprintLandingTopicHub} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Страница</TableHead>
            <TableHead>Город</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Версия</TableHead>
            <TableHead>Обновлено</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variants.map((v) => (
            <TableRow key={v.id}>
              <TableCell>
                <Link
                  className="font-medium text-text-primary underline-offset-2 hover:text-accent hover:underline"
                  to={`/landings/${v.id}`}
                >
                  {v.title}
                </Link>
                <code className="mt-1 block text-small text-text-muted">{v.path}</code>
              </TableCell>
              <TableCell className="text-small text-text-secondary">{v.cityHint}</TableCell>
              <TableCell>
                <Badge variant={v.status === 'Активен' ? 'success' : 'default'}>{v.status}</Badge>
              </TableCell>
              <TableCell>v{v.version}</TableCell>
              <TableCell className="text-small text-text-secondary">{formatDateTime(v.updatedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ListPageLayout>
  );
}
