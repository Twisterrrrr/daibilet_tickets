import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export type LandingOverviewTabProps = {
  id: string;
  statusBadge?: { status: any; label?: string };
  cityName?: string | null;
  landingType?: string | null;
  isIndexable?: boolean | null;
  seoOk: boolean;
  blocksCount: number;
  canonicalUrl?: string | null;
  /** Полный URL или относительный путь для кнопки «На сайте». */
  previewHref?: string | null;
  hubReadiness?: Record<string, unknown> | null;
};

function readinessSummary(hub: Record<string, unknown> | null | undefined): { status: string; issueErrors: number } | null {
  if (!hub || typeof hub !== 'object') return null;
  const status = typeof hub.status === 'string' ? hub.status : '—';
  const issues = Array.isArray((hub as { issues?: unknown }).issues) ? (hub as { issues: { severity?: string }[] }).issues : [];
  const issueErrors = issues.filter((i) => String(i?.severity ?? '').toUpperCase() === 'ERROR').length;
  return { status, issueErrors };
}

export function LandingOverviewTab(props: LandingOverviewTabProps) {
  const { id, statusBadge, cityName, landingType, isIndexable, seoOk, blocksCount, canonicalUrl, previewHref, hubReadiness } = props;
  const snap = readinessSummary(hubReadiness ?? null);

  return (
    <Card className="mb-3 border-border p-4">
      {previewHref ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={previewHref} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Публичная страница
            </a>
          </Button>
          <span className="text-xs text-muted-foreground">Открывается в новой вкладке (тот же origin, что и у админки; иначе задайте canonical на бэке).</span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {statusBadge ? <StatusBadge status={statusBadge.status} label={statusBadge.label} /> : null}
        <Badge variant="outline" className="border-border font-normal text-muted-foreground">
          id: <span className="ml-1 font-mono">{id}</span>
        </Badge>
        {cityName ? (
          <Badge variant="outline" className="border-border font-normal text-muted-foreground">
            city: {cityName}
          </Badge>
        ) : null}
        {landingType ? (
          <Badge variant="outline" className="border-border font-normal text-muted-foreground">
            {landingType}
          </Badge>
        ) : null}
        {isIndexable != null ? (
          <Badge variant="outline" className="border-border font-normal text-muted-foreground">
            indexable: {isIndexable ? 'yes' : 'no'}
          </Badge>
        ) : null}
        <Badge variant="outline" className={`border-border font-normal ${seoOk ? 'text-muted-foreground' : 'text-warning-foreground border-warning/30 bg-warning/10'}`}>
          seo: {seoOk ? 'ok' : 'missing'}
        </Badge>
        <Badge variant="outline" className="border-border font-normal text-muted-foreground">
          blocks: {blocksCount}
        </Badge>
        {canonicalUrl ? (
          <Badge variant="outline" className="border-border font-normal text-muted-foreground">
            canonical: {canonicalUrl}
          </Badge>
        ) : null}
        {snap ? (
          <Badge
            variant="outline"
            className={
              'border-border font-normal ' +
              (snap.issueErrors > 0 ? 'border-warning/30 bg-warning/10 text-warning-foreground' : 'text-muted-foreground')
            }
          >
            hubReadiness: {snap.status}
            {snap.issueErrors > 0 ? ` · ERROR: ${snap.issueErrors}` : ''}
          </Badge>
        ) : null}
      </div>
    </Card>
  );
}

