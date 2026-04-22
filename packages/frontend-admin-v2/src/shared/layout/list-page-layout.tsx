import type { ReactNode } from 'react';

import { PageContainer } from '@/shared/ui/page-container';

import { PageHeader } from './page-header';

export function ListPageLayout({
  title,
  subtitle,
  headerActions,
  headerGlyph,
  filters,
  children,
  /** Нижний блок (например IntegrationBlueprint) — единый шаблон перед подключением API */
  blueprint,
}: {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  headerGlyph?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  blueprint?: ReactNode;
}) {
  return (
    <PageContainer className="space-y-8">
      <PageHeader title={title} subtitle={subtitle} actions={headerActions} glyph={headerGlyph} />
      {filters}
      <div className="space-y-4">{children}</div>
      {blueprint ? <div className="pt-2">{blueprint}</div> : null}
    </PageContainer>
  );
}
