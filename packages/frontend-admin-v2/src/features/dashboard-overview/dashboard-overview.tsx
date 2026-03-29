import {
  BarChart3,
  BookOpen,
  LineChart,
  Megaphone,
  ShoppingCart,
  Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { formatDateTime } from '@/shared/lib/format';
import type { DashboardOverview, DashboardStatIcon } from '@/shared/mock/dashboard';
import { Button } from '@/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { SectionCard } from '@/widgets/section-card/section-card';
import { StatCard } from '@/widgets/stat-card/stat-card';

function StatGlyph({ kind }: { kind: DashboardStatIcon }) {
  const cls = 'h-5 w-5 shrink-0 text-text-muted/40';
  switch (kind) {
    case 'orders':
      return <ShoppingCart className={cls} strokeWidth={1.5} aria-hidden />;
    case 'revenue':
      return <LineChart className={cls} strokeWidth={1.5} aria-hidden />;
    case 'events':
      return <Eye className={cls} strokeWidth={1.5} aria-hidden />;
    case 'promo':
      return <BarChart3 className={cls} strokeWidth={1.5} aria-hidden />;
  }
}

function gapBadgeClass(label: string): string {
  if (label === 'SEO') return 'border-border-soft bg-[hsl(220_32%_95%)] text-[hsl(220_22%_40%)]';
  return 'border-border-soft bg-[hsl(35_52%_95%)] text-[hsl(35_38%_38%)]';
}

export function DashboardOverviewView({ data }: { data: DashboardOverview }) {
  const attentionTotal = data.attentionSignals.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((s) => (
          <StatCard
            key={s.id}
            label={s.label}
            value={s.value}
            hint={s.delta}
            icon={<StatGlyph kind={s.icon} />}
          />
        ))}
      </div>

      <SectionCard
        title="Требует внимания"
        description="Быстрый срез очереди — без лишних экранов."
        action={
          attentionTotal > 0 ? (
            <span className="rounded-full bg-[hsl(var(--warning)_/_0.11)] px-2.5 py-1 text-[0.6875rem] font-semibold tabular-nums text-warning">
              {attentionTotal}
            </span>
          ) : null
        }
        padding="md"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data.attentionSignals.map((sig) => (
            <Link
              key={sig.id}
              to={sig.href}
              className="flex items-center justify-between gap-2 rounded-control border border-border-soft/70 bg-surface-alt/25 px-3 py-2.5 transition-colors hover:border-border-soft hover:bg-surface-alt/50"
            >
              <span className="text-small font-medium leading-tight text-text-primary">{sig.label}</span>
              <span className="shrink-0 tabular-nums text-small text-text-muted">{sig.count}</span>
            </Link>
          ))}
        </div>
      </SectionCard>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="mb-2 w-full max-w-full justify-start">
          <TabsTrigger value="content" className="gap-2">
            <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
            Контент
          </TabsTrigger>
          <TabsTrigger value="operations" className="gap-2">
            <ShoppingCart className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
            Операции
          </TabsTrigger>
          <TabsTrigger value="marketing" className="gap-2">
            <Megaphone className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
            Маркетинг
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-8 pt-2">
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Качество карточек" description="Чего не хватает в моках каталога." padding="md">
              <ul className="space-y-1">
                {data.cardQuality.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 border-b border-border-soft/50 py-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-body text-text-primary">{row.title}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {row.gaps.length === 0 ? (
                        <span className="text-[0.6875rem] text-text-muted">Без замечаний</span>
                      ) : (
                        row.gaps.map((g) => (
                          <span
                            key={g}
                            className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${gapBadgeClass(g)}`}
                          >
                            {g}
                          </span>
                        ))
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Покрытие по городам" description="События с заполненными полями к целевому числу." padding="md">
              <ul className="space-y-4">
                {data.cityCoverage.map((c) => {
                  const pct = c.total > 0 ? Math.round((c.current / c.total) * 100) : 0;
                  return (
                    <li key={c.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-small font-medium text-text-primary">{c.city}</span>
                        <span className="tabular-nums text-[0.6875rem] text-text-muted">
                          {c.current}/{c.total}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                        <div
                          className="h-full max-w-full rounded-full bg-[hsl(var(--accent)_/_0.32)] transition-[width] duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          </div>

          <SectionCard title="Популярные категории" description="Относительный интерес — только тонкие полоски." padding="md">
            <div className="flex flex-wrap gap-x-8 gap-y-5">
              {data.categoryStrip.map((cat) => (
                <div key={cat.id} className="min-w-[6.5rem] flex-1 sm:max-w-[10rem]">
                  <p className="text-[0.6875rem] font-medium text-text-secondary">{cat.label}</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-alt">
                    <div
                      className="h-full rounded-full bg-[hsl(var(--accent)_/_0.26)]"
                      style={{ width: `${cat.weight}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="operations" className="pt-2">
          <SectionCard title="Последняя активность" description="Лента для операционного контекста." padding="md">
            <ul className="space-y-4">
              {data.activity.map((a) => (
                <li key={a.id} className="flex flex-col gap-0.5">
                  <p className="text-body text-text-primary">{a.title}</p>
                  <p className="text-small text-text-muted">
                    {a.meta} · {formatDateTime(a.at)}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="marketing" className="pt-2">
          <SectionCard
            title="Маркетинг"
            description="Каркас без виджетов — позже промо, UTM и кампании."
            padding="md"
          >
            <ul className="space-y-2 text-small text-text-secondary">
              <li className="flex gap-2">
                <span className="text-text-muted">—</span>
                CTR и источники трафика (макет)
              </li>
              <li className="flex gap-2">
                <span className="text-text-muted">—</span>
                Сводка по рекламным зонам
              </li>
            </ul>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <SectionCard title="Быстрые переходы" description="Спокойные CTA без баннеров." padding="md">
        <div className="grid gap-3 sm:grid-cols-3">
          {data.quickLinks.map((l) => (
            <Link
              key={l.href + l.label}
              to={l.href}
              className="rounded-card border border-border-soft bg-surface-alt/60 px-4 py-4 transition-colors hover:border-border hover:bg-surface"
            >
              <p className="text-label font-medium text-text-primary">{l.label}</p>
              <p className="mt-1 text-small text-text-secondary">{l.description}</p>
            </Link>
          ))}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm">
          Показать отчёты (скоро)
        </Button>
      </div>
    </div>
  );
}
