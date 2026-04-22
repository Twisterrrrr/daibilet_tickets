import { Badge } from '@/components/ui/badge';
import type { VenueImportSource, VenueLifecycleStatus, VenueSourceType } from '@/modules/venues/api/candidates';
import { getConfidenceMeta } from '@/modules/venues/utils/venue-confidence';

export function LifecycleStatusBadge({ status }: { status: VenueLifecycleStatus }) {
  const variant =
    status === 'ACTIVE' ? 'success' : status === 'DRAFT' ? 'warning' : status === 'MERGED' ? 'outline' : 'danger';
  return <Badge variant={variant}>{status}</Badge>;
}

export function SourceTypeBadge({ t }: { t: VenueSourceType }) {
  return <Badge variant="outline">{t}</Badge>;
}

export function ImportSourceBadge({ s }: { s: VenueImportSource | null }) {
  if (!s) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge variant="info" className="font-mono text-[10px]">
      {s}
    </Badge>
  );
}

export function ReviewBadge({ needsReview }: { needsReview: boolean }) {
  return needsReview ? (
    <Badge variant="warning">нужен разбор</Badge>
  ) : (
    <Badge variant="outline">разбор не требуется</Badge>
  );
}

/** Уверенность импорта (отдельно от needsReview и от дублей). */
export function ConfidenceTierBadge({ score }: { score: number | null }) {
  const meta = getConfidenceMeta(score);
  if (meta.level === 'NONE') {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">—</Badge>
      </div>
    );
  }
  const variant =
    meta.level === 'HIGH' ? 'success' : meta.level === 'MEDIUM' ? 'warning' : 'outline';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={variant}>{meta.level}</Badge>
      {meta.percent ? <span className="text-xs tabular-nums text-muted-foreground">{meta.percent}</span> : null}
    </div>
  );
}

export function SimilarityHintBadge({ hasDuplicates }: { hasDuplicates: boolean | undefined }) {
  if (hasDuplicates === undefined) {
    return <span className="text-xs text-muted-foreground">…</span>;
  }
  return hasDuplicates ? (
    <Badge variant="danger">возможные дубли</Badge>
  ) : (
    <Badge variant="outline">дублей не найдено</Badge>
  );
}
