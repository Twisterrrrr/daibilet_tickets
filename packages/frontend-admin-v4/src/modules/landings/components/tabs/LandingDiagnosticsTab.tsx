import * as React from 'react';

import { Card } from '@/components/ui/card';
import { getLandingSeoAudit } from '@/modules/landings/api/landings';
import type { LandingSeoAuditResponseDto } from '@/modules/landings/types';
import { Badge } from '@/components/ui/badge';

export type LandingDiagnosticsTabProps = {
  landingId: string;
};

export function LandingDiagnosticsTab(props: LandingDiagnosticsTabProps) {
  const { landingId } = props;
  const [data, setData] = React.useState<LandingSeoAuditResponseDto | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!landingId) return;
      setLoading(true);
      setError('');
      try {
        const res = await getLandingSeoAudit(landingId);
        if (!cancelled) setData(res);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [landingId]);

  const issues = data?.issues ?? [];
  const warnings = data?.warnings ?? [];

  return (
    <Card className="border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Диагностика (SEO audit)</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-mono">GET /admin/landings/:id/seo-audit</span>
          </div>
        </div>
        {data ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border font-normal">
              score: {data.score}
            </Badge>
            {typeof data.matchedEventsCount === 'number' ? (
              <Badge variant="outline" className="border-border font-normal">
                событий: {data.matchedEventsCount}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      {loading ? <div className="mt-3 text-sm text-muted-foreground">Загрузка…</div> : null}
      {error ? <div className="mt-3 text-sm text-destructive">{error}</div> : null}

      {!loading && !error && data ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Issues</div>
            <ul className="mt-2 space-y-1 text-sm">
              {issues.length ? (
                issues.map((c) => (
                  <li key={c} className="font-mono text-xs text-destructive">
                    {c}
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted-foreground">—</li>
              )}
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Warnings</div>
            <ul className="mt-2 space-y-1 text-sm">
              {warnings.length ? (
                warnings.map((c) => (
                  <li key={c} className="font-mono text-xs text-warning-foreground">
                    {c}
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted-foreground">—</li>
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
