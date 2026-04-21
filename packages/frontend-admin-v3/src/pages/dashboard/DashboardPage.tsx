import { DashboardSectionCard } from '@/components/dashboard/DashboardSectionCard';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { PageGlyph } from '@/components/shared/page-glyph/PageGlyph';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import { fetchDashboardSummary, type DashboardSummary } from '@/modules/dashboard/api/dashboard';
import { cn } from '@/shared/lib/cn';
import { useQuery } from '@tanstack/react-query';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LifeBuoy,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const q = useQuery({
    queryKey: ['admin-dashboard-summary'],
    queryFn: () => fetchDashboardSummary(),
    staleTime: 45_000,
  });

  if (q.isLoading) return <LoadingState label="Загрузка обзора…" />;
  if (q.isError || !q.data) {
    const m = q.error ? getAdminErrorDisplay(q.error) : null;
    return (
      <ErrorState
        title={m?.title ?? 'Не удалось загрузить обзор'}
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
  const attentionTotal = d.attention.length;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Обзор"
        subtitle="Спокойная панель без лишнего шума — ключевые метрики и очередь внимания."
        glyph={<PageGlyph icon={LayoutDashboard} tone="sky" />}
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
              <Link to="/admin-v3/seo-audit">SEO-аудит</Link>
            </Button>
          </div>
        }
      />

      <p className="text-small text-muted-foreground">
        Снимок: {new Date(d.meta.generatedAt).toLocaleString('ru-RU')} · кэш ~{d.meta.cacheTtlSeconds} с
        {d.meta.hubVenuePageHubCount != null ? (
          <>
            {' '}
            · хаб-страниц площадок: {d.meta.hubVenuePageHubCount}, хаб-лендингов: {d.meta.hubLandingHubCount ?? '—'}
          </>
        ) : null}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Хабы готовы"
          value={h.hubs.ready}
          hint={`всего точек ~${h.hubs.total}`}
          icon={<Sparkles strokeWidth={1.5} aria-hidden />}
        />
        <DashboardStatCard
          label="События активные"
          value={h.catalog.activeEvents}
          hint={`всего: ${h.catalog.totalEvents}`}
          icon={<CalendarDays strokeWidth={1.5} aria-hidden />}
        />
        <DashboardStatCard
          label="SEO замечания"
          value={h.seo.totalIssues}
          hint={`ошибок ${h.seo.errors} · предупреждений ${h.seo.warnings}`}
          icon={<AlertTriangle strokeWidth={1.5} aria-hidden />}
        />
        <DashboardStatCard
          label="Тикеты открыты"
          value={o.tickets.open}
          hint="операционная очередь"
          icon={<LifeBuoy strokeWidth={1.5} aria-hidden />}
        />
      </div>

      <DashboardSectionCard
        title="Требует внимания"
        description="Быстрый срез очереди — переход к карточке в один клик."
        action={
          attentionTotal > 0 ? (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[0.6875rem] font-semibold tabular-nums text-amber-800 dark:text-amber-200">
              {attentionTotal}
            </span>
          ) : null
        }
      >
        {d.attention.length === 0 ? (
          <p className="text-small text-muted-foreground">Нет элементов в очереди внимания.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {d.attention.map((row, i) => (
              <Link
                key={`${row.entityType}-${row.entityId}-${i}`}
                to={row.url}
                className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-3 transition-colors hover:border-border hover:bg-muted/35"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-small font-medium leading-snug text-foreground">{row.title}</span>
                  <Badge variant={row.severity === 'ERROR' ? 'danger' : 'warning'} className="shrink-0 text-[0.65rem]">
                    {row.severity === 'ERROR' ? 'Ошибка' : row.severity === 'WARNING' ? 'Предупреждение' : row.severity}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-[0.6875rem] text-muted-foreground">{row.issue}</p>
                <span className="text-[0.65rem] text-muted-foreground/80">
                  {row.entityType} · {row.source}
                </span>
              </Link>
            ))}
          </div>
        )}
      </DashboardSectionCard>

      <TabsPrimitive.Root defaultValue="catalog" className="w-full">
        <TabsPrimitive.List className="mb-2 flex w-full max-w-full justify-start gap-1 overflow-x-auto rounded-lg border bg-card p-1">
          <TabsPrimitive.Trigger
            value="catalog"
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground',
              'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
            )}
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
            Каталог и контент
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            value="operations"
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground',
              'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
            )}
          >
            <ShoppingCart className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
            Операции
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            value="activity"
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground',
              'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
            )}
          >
            <Activity className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
            Активность
          </TabsPrimitive.Trigger>
        </TabsPrimitive.List>

        <TabsPrimitive.Content value="catalog" className="space-y-8 pt-2 outline-none">
          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardSectionCard title="Каталог и хабы" description="Состояние витрины и точек входа.">
              <div className="grid gap-3 sm:grid-cols-2">
                <DashboardStatCard label="Хабы: нужна доработка" value={h.hubs.needsWork} />
                <DashboardStatCard label="Хабы заблокированы" value={h.hubs.blocked} />
                <DashboardStatCard label="Всего хаб-страниц (оценка)" value={h.hubs.total} hint="города + страницы площадок + лендинги" />
                <DashboardStatCard label="События с проблемами" value={h.catalog.withIssues} />
                <DashboardStatCard label="Площадки: дубли" value={h.venues.unresolvedDuplicates} hint={`всего площадок: ${h.venues.total}`} />
                <DashboardStatCard label="Площадки: не хватает данных" value={h.venues.missingData} />
              </div>
            </DashboardSectionCard>
            <DashboardSectionCard title="Контент и индексация" description="Статьи, лендинги, подборки, SEO-слой.">
              <div className="grid gap-3 sm:grid-cols-2">
                <DashboardStatCard label="Статьи опубликовано" value={c.articles.published} hint={`всего: ${c.articles.total}`} />
                <DashboardStatCard label="Статьи без SEO" value={c.articles.withoutSeo} />
                <DashboardStatCard label="Лендинги опубликовано" value={c.landings.published} hint={`всего: ${c.landings.total}`} />
                <DashboardStatCard label="Лендинги: слабый SEO" value={c.landings.emptyResults} hint="пустые мета-теги" />
                <DashboardStatCard label="Подборки пустые" value={c.collections.empty} hint={`опубликовано: ${c.collections.published}`} />
                <DashboardStatCard label="Индексируемые страницы" value={c.indexability.indexablePages} />
                <DashboardStatCard label="Не для индекса" value={c.indexability.nonIndexablePages} />
              </div>
            </DashboardSectionCard>
          </div>
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="operations" className="space-y-6 pt-2 outline-none">
          <DashboardSectionCard title="Операции" description="Тикеты, чаты, отзывы — без лишних экранов.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DashboardStatCard label="Тикеты в работе" value={o.tickets.inProgress} />
              <DashboardStatCard label="Тикеты высокий приоритет" value={o.tickets.highPriority} />
              <DashboardStatCard label="Чаты открыты" value={o.chat.openConversations} />
              <DashboardStatCard label="Отзывы на модерации" value={o.reviews.pending} />
              <DashboardStatCard label="Негативные отзывы (≤2★)" value={o.reviews.negative} />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
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
          </DashboardSectionCard>
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="activity" className="space-y-6 pt-2 outline-none">
          <DashboardSectionCard
            title="Активность и конверсии"
            description={d.meta.activityNote ?? 'Сводка по трафику и воронке — часть метрик дорабатывается.'}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardStatCard label="Визиты (7 дн.)" value={a.traffic.visits || '—'} hint="аналитика уточняется" />
              <DashboardStatCard label="Просмотры страниц" value={a.traffic.pageViews || '—'} />
              <DashboardStatCard label="Просмотры событий" value={a.catalog.eventViews || '—'} />
              <DashboardStatCard label="Просмотры лендингов" value={a.catalog.landingViews || '—'} />
              <DashboardStatCard label="Просмотры подборок" value={a.catalog.collectionViews || '—'} />
              <DashboardStatCard label="Оформление начато (7 дн.)" value={a.conversions.checkoutStarted} />
              <DashboardStatCard label="Оплачено заказов (7 дн.)" value={a.conversions.checkoutCompleted} />
            </div>
          </DashboardSectionCard>
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>

      <DashboardSectionCard title="Быстрые переходы" description="Спокойные CTA без баннеров.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/admin-v3/seo-audit', label: 'SEO-аудит', desc: 'Проверки и отчёты' },
            { to: '/admin-v3/events', label: 'События', desc: 'Список и карточки' },
            { to: '/admin-v3/venues', label: 'Площадки', desc: 'Каталог и кандидаты' },
            { to: '/admin-v3/cities', label: 'Города', desc: 'Хабы и регионы' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-xl border border-border/80 bg-muted/15 px-4 py-4 transition-colors hover:border-border hover:bg-muted/30"
            >
              <p className="text-small font-medium text-foreground">{l.label}</p>
              <p className="mt-1 text-small text-muted-foreground">{l.desc}</p>
            </Link>
          ))}
        </div>
      </DashboardSectionCard>
    </div>
  );
}

export default DashboardPage;