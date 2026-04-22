import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { fetchAdminLandingSeoAudit, type AdminLandingSeoAuditResponse } from '@/modules/landings/api/landings';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

const SEO_ISSUE_LABELS: Record<string, string> = {
  NO_H1: 'Нет H1 (seoH1 / title)',
  NO_SEO_TITLE: 'Нет SEO title (seoTitle / metaTitle)',
  NO_SEO_DESCRIPTION: 'Нет SEO description (seoDescription / metaDescription)',
  TITLE_TOO_LONG: 'Title длиннее рекомендуемого',
  DESCRIPTION_TOO_LONG: 'Description длиннее рекомендуемого',
  NO_HERO: 'Нет явного hero (heroTitle / heroText / subtitle / картинка)',
  NO_VISIBLE_BLOCKS: 'Нет видимых блоков контента (композиция или legacy infoBlocks)',
  NO_FAQ: 'Нет FAQ (блок FAQ или legacy faq)',
  NO_SEO_TEXT: 'Нет SEO-текста (блок SEO_TEXT или legalText)',
  LOW_EVENT_COUNT: 'Мало событий в выдаче (< 3)',
  NO_MATCHED_EVENTS: 'Нет событий по фильтру',
  CANONICAL_MISSING: 'Не задан canonicalUrl',
  CANONICAL_CONFLICT: 'canonicalLandingId без связанного лендинга',
  CITY_MULTI_CITY_INTENT_COLLISION: 'Конфликт намерения CITY ↔ MULTI_CITY (тот же slug)',
  INDEXABLE_WITH_THIN_CONTENT: 'Индексируется при очень слабом контенте',
  BROKEN_RELATED_LINK: 'Битая related link (проверка в разработке)',
  MISSING_OG_IMAGE: 'Нет ogImageUrl',
};

function labelFor(code: string): string {
  return SEO_ISSUE_LABELS[code] ?? code;
}

function IssueList({ title, codes, tone }: { title: string; codes: string[]; tone: 'issue' | 'warn' }) {
  if (codes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        {title}: <span className="text-foreground">нет</span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <ul className="list-inside list-disc space-y-1 text-sm">
        {codes.map((c) => (
          <li key={c}>
            <span className="font-mono text-xs text-muted-foreground">{c}</span>
            {' — '}
            <span className={tone === 'issue' ? 'text-rose-800 dark:text-rose-200' : 'text-amber-900 dark:text-amber-200'}>
              {labelFor(c)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Props = {
  landingId: string;
};

export function LandingDiagnosticsPanel({ landingId }: Props) {
  const auditQ = useQuery({
    queryKey: ['admin-landing-seo-audit', landingId],
    queryFn: () => fetchAdminLandingSeoAudit(landingId),
  });

  const data = auditQ.data;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5 space-y-2">
        <div className="text-sm font-medium">SEO / контент-аудит</div>
        <p className="text-xs text-muted-foreground">
          Те же данные, что и у <span className="font-mono">GET /admin/landings/:id/seo-audit</span>. Счётчик событий — из
          filters-first resolver (как на публичной выдаче).
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" disabled={auditQ.isFetching} onClick={() => auditQ.refetch()}>
            {auditQ.isFetching ? 'Обновление…' : 'Обновить аудит'}
          </Button>
        </div>
      </div>

      {auditQ.isLoading ? <LoadingState label="Загрузка аудита…" /> : null}
      {auditQ.isError ? (
        <ErrorState title="Не удалось загрузить аудит" description="Проверьте сеть и права доступа." onRetry={() => auditQ.refetch()} />
      ) : null}

      {data ? <AuditSummary data={data} /> : null}

      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
        Полный preview списка событий — во вкладке «Все поля», колонка «Catalog source · Preview · resolved events».
      </div>
    </div>
  );
}

function AuditSummary({ data }: { data: AdminLandingSeoAuditResponse }) {
  const [domainsOpen, setDomainsOpen] = React.useState(false);
  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="text-sm text-muted-foreground">Оценка (эвристика)</div>
        <div className="text-2xl font-bold tabular-nums">{data.score}</div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border bg-muted/30 px-3 py-2">
          <div className="text-xs text-muted-foreground">Событий в выдаче</div>
          <div className="text-lg font-semibold tabular-nums">{data.matchedEventsCount}</div>
        </div>
        <div className="rounded-md border bg-muted/30 px-3 py-2">
          <div className="text-xs text-muted-foreground">Issues / warnings</div>
          <div className="text-lg font-semibold tabular-nums">
            {data.issues.length} / {data.warnings.length}
          </div>
        </div>
      </div>

      <IssueList title="Issues (сильнее влияют на score)" codes={data.issues} tone="issue" />
      <IssueList title="Warnings" codes={data.warnings} tone="warn" />

      <div>
        <button
          type="button"
          className="text-sm text-primary underline-offset-4 hover:underline"
          onClick={() => setDomainsOpen((v) => !v)}
        >
          {domainsOpen ? 'Скрыть' : 'Показать'} карту доменов кодов
        </button>
        {domainsOpen ? (
          <pre className="mt-2 max-h-[320px] overflow-auto rounded-md border bg-muted/40 p-3 text-[11px] leading-relaxed">
            {JSON.stringify(data.domains, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
