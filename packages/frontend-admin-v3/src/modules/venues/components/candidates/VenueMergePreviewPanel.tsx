import { Badge } from '@/components/ui/badge';
import type { VenueMergePreviewDto } from '@/modules/venues/api/candidates';
import { VenueDecisionHintBadge } from '@/modules/venues/components/candidates/VenueDecisionHintBadge';
import { getConfidenceMeta } from '@/modules/venues/utils/venue-confidence';
import {
  mergeSimilarityBadgeVariant,
  mergeSimilarityLabelText,
} from '@/modules/venues/utils/merge-preview-labels';
import { venueDecisionHintReasonLabel } from '@/modules/venues/utils/venue-decision-hint-labels';

function SourceLine({
  sourceType,
  importSource,
}: {
  sourceType: string;
  importSource: string | null;
}) {
  return (
    <span className="text-sm">
      {sourceType}
      {importSource ? (
        <>
          {' '}
          / <span className="font-mono text-xs">{importSource}</span>
        </>
      ) : (
        ' / —'
      )}
    </span>
  );
}

type Props = {
  preview: VenueMergePreviewDto;
};

export function VenueMergePreviewPanel({ preview }: Props) {
  const { candidate: c, target: t, comparison: cmp } = preview;
  const conf = getConfidenceMeta(c.confidenceScore);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">Кандидат</div>
          <div className="font-medium leading-snug">{c.displayTitle}</div>
          <div className="text-sm text-muted-foreground">{c.displayAddress ?? '—'}</div>
          <div className="text-sm">{c.city ? `${c.city.name} (${c.city.slug})` : '—'}</div>
          <SourceLine sourceType={c.sourceType} importSource={c.importSource} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Статус:</span>
            <Badge variant="outline">{c.lifecycleStatus}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Уверенность:</span>
            {conf.level === 'NONE' ? (
              <Badge variant="outline">—</Badge>
            ) : (
              <>
                <Badge
                  variant={
                    conf.level === 'HIGH' ? 'success' : conf.level === 'MEDIUM' ? 'warning' : 'outline'
                  }
                >
                  {conf.level}
                </Badge>
                {conf.percent ? (
                  <span className="text-xs tabular-nums text-muted-foreground">{conf.percent}</span>
                ) : null}
              </>
            )}
          </div>
          {c.needsReview ? (
            <Badge variant="warning" className="text-xs">
              нужен разбор
            </Badge>
          ) : null}
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">Целевая площадка</div>
          <div className="font-medium leading-snug">{t.displayTitle}</div>
          <div className="text-sm text-muted-foreground">{t.displayAddress ?? '—'}</div>
          <div className="text-sm">{t.city ? `${t.city.name} (${t.city.slug})` : '—'}</div>
          <SourceLine sourceType={t.sourceType} importSource={t.importSource} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Статус:</span>
            <Badge variant="outline">{t.lifecycleStatus}</Badge>
            {t.isPublished ? (
              <Badge variant="info" className="text-xs">
                опубликована
              </Badge>
            ) : null}
            {!t.isActive ? (
              <Badge variant="danger" className="text-xs">
                неактивна
              </Badge>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground">
            События (активные):{' '}
            <span className="font-medium text-foreground">{t.stats.eventsCount}</span>
          </div>
        </div>
      </div>

      {(preview.decisionHint && preview.decisionHint !== 'NO_HINT') || preview.decisionHintReasons.length > 0 ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <div className="mb-1 font-medium text-muted-foreground">Рекомендация модерации</div>
          <div className="flex flex-col gap-2">
            <div>
              <VenueDecisionHintBadge hint={preview.decisionHint} />
            </div>
            {preview.decisionHintReasons.length > 0 ? (
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                {preview.decisionHintReasons.map((code) => (
                  <li key={code}>{venueDecisionHintReasonLabel(code)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Badge variant={cmp.sameCity ? 'success' : 'danger'}>
          {cmp.sameCity ? 'Один город' : 'Разные города'}
        </Badge>
        <Badge variant={mergeSimilarityBadgeVariant(cmp.titleSimilarityLabel)}>
          Название: {mergeSimilarityLabelText(cmp.titleSimilarityLabel)}
        </Badge>
        <Badge variant={mergeSimilarityBadgeVariant(cmp.addressSimilarityLabel)}>
          Адрес: {mergeSimilarityLabelText(cmp.addressSimilarityLabel)}
        </Badge>
      </div>

      {cmp.warnings.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="mb-1 font-medium">Предупреждения</div>
          <ul className="list-inside list-disc space-y-0.5">
            {cmp.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
