import { Badge } from '@/components/ui/badge';
import type { AdminVenueCandidateRow } from '@/modules/venues/api/candidates';
import { VenueDecisionHintBadge } from '@/modules/venues/components/candidates/VenueDecisionHintBadge';
import { ConfidenceTierBadge, SimilarityHintBadge } from '@/modules/venues/components/candidates/venue-candidate-badges';

type Props = {
  row: AdminVenueCandidateRow;
  hasDuplicates: boolean | undefined;
};

/** Эвристика по полям списка; точное решение — dry-run на /venues/automation. */
function getAutoEligibilityHint(
  row: AdminVenueCandidateRow,
  hasDuplicates: boolean | undefined,
): { kind: 'merge' | 'approve'; label: string } | null {
  if (row.needsReview || hasDuplicates === undefined) return null;
  const c = row.confidenceScore;
  if (row.decisionHint === 'MERGE_RECOMMENDED' && c !== null && c >= 0.92 && hasDuplicates) {
    return { kind: 'merge', label: 'Возможен авто-merge (оценка)' };
  }
  if (row.decisionHint === 'APPROVE_AS_NEW' && c !== null && c <= 0.5 && !hasDuplicates) {
    return { kind: 'approve', label: 'Возможен авто-approve (оценка)' };
  }
  return null;
}

export function VenueCandidateMatchCell({ row, hasDuplicates }: Props) {
  const autoHint = getAutoEligibilityHint(row, hasDuplicates);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <ConfidenceTierBadge score={row.confidenceScore} />
      </div>
      {row.needsReview ? (
        <div>
          <Badge variant="warning">нужен разбор</Badge>
        </div>
      ) : null}
      {row.decisionHint && row.decisionHint !== 'NO_HINT' ? (
        <div>
          <VenueDecisionHintBadge hint={row.decisionHint} />
        </div>
      ) : null}
      {autoHint ? (
        <div>
          <Badge variant={autoHint.kind === 'merge' ? 'info' : 'outline'}>{autoHint.label}</Badge>
        </div>
      ) : null}
      <div>
        <div className="mb-0.5 text-[10px] uppercase text-muted-foreground">дубли</div>
        <SimilarityHintBadge hasDuplicates={hasDuplicates} />
      </div>
    </div>
  );
}
