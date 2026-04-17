import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import { fetchDashboardSummary, type DashboardSummary } from '@/modules/dashboard/api/dashboard';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold tracking-tight">{children}</h2>;
}

export function DashboardPage() {
  const q = useQuery({
    queryKey: ['admin-dashboard-summary'],
    queryFn: () => fetchDashboardSummary(),
    staleTime: 45_000,
  });

  if (q.isLoading) return <LoadingState label="Загрузка дашборда…" />;
  if (q.isError || !q.data) {
    const m = q.error ? getAdminErrorDisplay(q.error) : null;
    return (
      <ErrorState
        title={m?.title ?? 'Не удалось загрузить дашборд'}
        description={m?.description ?? m?.rawMessage}
        onRetry={() => q.refetch()}
      />
    );
  }

  const d: DashboardSummary = q.data;
  const h = d.health;
  const c = d.content;
  const o = d.operations;
  const a = d.activity;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Дашборд"
        subtitle="Операционный центр витрины"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {d.meta.servedFromCache ? (
              <Badge variant="outline" className="text-xs">
                кэш
              </Badge>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={() => q.refetch()}>
              Обновить
            </Button>
            <Button type="button" size="sm" variant="secondary" asChild>
              <Link to="/admin-v3/seo-audit">SEO Audit</Link>
            </Button>
          </div>
        }
      />

      <p className="text-sm text-muted-foreground">
        Снимок: {new Date(d.meta.generatedAt).toLocaleString('ru-RU')} · TTL ~{d.meta.cacheTtlSeconds}s
        {d.meta.hubVenuePageHubCount != null ? (
          <>
            {' '}
            · hub-площадок: {d.meta.hubVenuePageHubCount}, hub-лендингов: {d.meta.hubLandingHubCount ?? '—'}
          </>
        ) : null}
      </p>

      <section className="space-y-3">
        <SectionTitle>Health — каталог и хабы</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Hubs готовы" value={h.hubs.ready} />
          <StatCard label="Hubs нужна работа" value={h.hubs.needsWork} />
          <StatCard label="Hubs заблокированы" value={h.hubs.blocked} />
          <StatCard label="Всего hub-точек (оценка)" value={h.hubs.total} hint="города + venue HUB + лендинги" />
          <StatCard label="События активные" value={h.catalog.activeEvents} hint={`всего: ${h.catalog.totalEvents}`} />
          <StatCard label="События с проблемами" value={h.catalog.withIssues} />
          <StatCard label="SEO issues" value={h.seo.totalIssues} hint={`err ${h.seo.errors} / warn ${h.seo.warnings}`} />
          <StatCard label="Площадки: дубли" value={h.venues.unresolvedDuplicates} hint={`всего: ${h.venues.total}`} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Activity</SectionTitle>
        <p className="text-sm text-muted-foreground">{d.meta.activityNote}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Визиты (7d)" value={a.traffic.visits || '—'} hint="аналитика позже" />
          <StatCard label="Просмотры страниц" value={a.traffic.pageViews || '—'} />
          <StatCard label="Checkout начат (7d)" value={a.conversions.checkoutStarted} />
          <StatCard label="Оплачено заказов (7d)" value={a.conversions.checkoutCompleted} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Content &amp; SEO</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Статьи опубликовано" value={c.articles.published} hint={`всего: ${c.articles.total}`} />
          <StatCard label="Статьи без SEO" value={c.articles.withoutSeo} />
          <StatCard label="Лендинги опубликовано" value={c.landings.published} />
          <StatCard label="Лендинги: слабый SEO" value={c.landings.emptyResults} hint="пустой meta" />
          <StatCard label="Подборки пустые" value={c.collections.empty} hint={`опубликовано: ${c.collections.published}`} />
          <StatCard label="Индексируемые страницы" value={c.indexability.indexablePages} />
          <StatCard label="Не для индекса" value={c.indexability.nonIndexablePages} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Operations</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Тикеты открыты" value={o.tickets.open} />
          <StatCard label="Тикеты в работе" value={o.tickets.inProgress} />
          <StatCard label="Тикеты высокий приоритет" value={o.tickets.highPriority} />
          <StatCard label="Чаты открыты" value={o.chat.openConversations} />
          <StatCard label="Отзывы на модерации" value={o.reviews.pending} />
          <StatCard label="Негативные отзывы (≤2★)" value={o.reviews.negative} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/admin-v3/tickets">Тикеты</Link>
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/admin-v3/chat">Чаты</Link>
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/admin-v3/reviews">Отзывы</Link>
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Requires attention</SectionTitle>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Сущность</th>
                <th className="px-3 py-2">Проблема</th>
                <th className="px-3 py-2">Важность</th>
                <th className="px-3 py-2">Источник</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {d.attention.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    Нет элементов в очереди внимания
                  </td>
                </tr>
              ) : (
                d.attention.map((row, i) => (
                  <tr key={`${row.entityType}-${row.entityId}-${i}`} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.entityType} · {row.entityId.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="max-w-md px-3 py-2 text-xs text-muted-foreground">{row.issue}</td>
                    <td className="px-3 py-2">
                      <Badge variant={row.severity === 'ERROR' ? 'danger' : 'warning'}>{row.severity}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">{row.source}</td>
                    <td className="px-3 py-2 text-right">
                      <Button type="button" variant="ghost" size="sm" asChild>
                        <Link to={row.url}>Открыть</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;