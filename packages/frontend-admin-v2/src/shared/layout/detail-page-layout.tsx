import type { ReactNode } from 'react';

import { PageContainer } from '@/shared/ui/page-container';

import { PageHeader } from './page-header';

export function DetailPageLayout({
  title,
  subtitle,
  meta,
  actions,
  glyph,
  tabs,
  children,
  blueprint,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Пастельная пиктограмма раздела — как в ListPageLayout */
  glyph?: ReactNode;
  tabs?: ReactNode;
  children?: ReactNode;
  blueprint?: ReactNode;
}) {
  return (
    <PageContainer className="space-y-8">
      <PageHeader title={title} subtitle={subtitle} actions={actions} meta={meta} glyph={glyph} />
      {tabs}
      {children ? <div>{children}</div> : null}
      {blueprint ? <div className="pt-2">{blueprint}</div> : null}
    </PageContainer>
  );
}
