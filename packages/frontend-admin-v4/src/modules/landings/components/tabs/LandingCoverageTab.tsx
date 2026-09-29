import * as React from 'react';
import { Link } from 'react-router-dom';

import { DataTableShell, EmptyState, StatusBadge } from '@/components/admin/primitives';
import { Card } from '@/components/ui/card';
import { LayoutTemplate } from 'lucide-react';

export type LandingCoverageChild = {
  id: string;
  slug: string;
  title: string;
  status?: string | null;
  isActive?: boolean | null;
  landingType?: string | null;
  city?: { slug: string; name: string } | null;
};

export type LandingCoverageTabProps = {
  loading: boolean;
  error: string;
  hasLanding: boolean;
  childLandings: LandingCoverageChild[];
};

export function LandingCoverageTab(props: LandingCoverageTabProps) {
  const { loading, error, hasLanding, childLandings } = props;

  return (
    <Card className="border-border">
      <DataTableShell
        columns={['Child landing', 'Город', 'Тип', 'Статус']}
        loading={loading}
        empty={!loading && !error && hasLanding && childLandings.length === 0 ? <EmptyState icon={LayoutTemplate} title="Дочерних лендингов нет" description="Для MULTI_CITY здесь появятся child landing pages." /> : null}
      >
        {childLandings.map((c) => (
          <tr key={c.id} className="border-b border-border/60 hover:bg-secondary/40">
            <td className="px-4 py-3">
              <Link to={`/admin-v4/landings/${c.id}`} className="font-medium hover:underline">
                {c.title}
              </Link>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">{c.slug}</div>
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground">{c.city?.name ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-muted-foreground">{c.landingType ?? '—'}</td>
            <td className="px-4 py-3">
              <StatusBadge status={(c.isActive ? 'live' : 'draft') as any} label={c.status ?? undefined} />
            </td>
          </tr>
        ))}
      </DataTableShell>
    </Card>
  );
}

