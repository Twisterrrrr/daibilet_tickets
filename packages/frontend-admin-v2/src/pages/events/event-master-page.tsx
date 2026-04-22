import { CalendarPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EventMasterSketchView } from '@/features/event-master-sketch/event-master-sketch-view';
import { blueprintEventMaster } from '@/shared/config/admin-v2-blueprints';
import { IntegrationBlueprint } from '@/shared/layout/admin-v2-blueprint';
import { PageContainer } from '@/shared/ui/page-container';
import { PageHeader } from '@/shared/layout/page-header';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';

export function EventMasterPage() {
  return (
    <PageContainer className="space-y-8">
      <PageHeader
        title="Мастер события"
        subtitle="Волна M: визуальный каркас и мок-состояние. Реальный create / batch-connect на волне R."
        glyph={<PageGlyph icon={CalendarPlus} tone="peach" />}
        actions={
          <Link
            to="/events"
            className={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'no-underline')}
          >
            К списку событий
          </Link>
        }
      />
      <EventMasterSketchView variant="admin" mode="create" />
      <div className="pt-2">
        <IntegrationBlueprint {...blueprintEventMaster} />
      </div>
    </PageContainer>
  );
}
