import { AlertCircle, Calendar, CheckCircle, ChevronRight, TrendingUp } from 'lucide-react';
import { SupplierFinanceWidget } from '@/components/SupplierFinanceWidget';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatCard } from '@daibilet/shared-ui';

import { Button } from '@/components/ui/button';
import { api } from '../lib/api';

interface TrustKeyFactor {
  name: string;
  label: string;
  score: number;
  max: number;
}

interface DashboardData {
  operator: { name: string; trustLevel: number; commissionRate: string; successfulSales: number };
  events: { total: number; active: number; pending: number };
  offers: { total: number };
  sales: { totalOrders: number; grossRevenue: number; platformFee: number; netRevenue: number };
  trust?: {
    score: number;
    level: number;
    activeEventsLimit: number;
    activeEventsCount: number;
    nextLevelRequirements: { code: string; message: string }[];
    keyFactors?: TrustKeyFactor[];
    nextStepRecommendation?: string | null;
  };
  attention?: {
    eventsWithoutSchedule: number;
    eventsWithoutPhoto: number;
    reviewsWithoutResponse: number;
  };
  profileRequisites?: {
    status: string;
    hasPrimaryAccount: boolean;
    issues: string[];
  };
}

interface SupplierEvent {
  id: string;
  title: string;
  moderationStatus?: string;
  imageUrl?: string | null;
  moderationNote?: string | null;
}

interface SalesReportResponse {
  items: {
    id: string;
    date: string | null;
    shortCode?: string | null;
    customerName?: string | null;
    grossAmount?: number | null;
    platformFee?: number | null;
    supplierAmount?: number | null;
  }[];
  total: number;
}

interface ListingHealthIssue {
  code: string;
  message: string;
  eventId?: string;
  actionUrl?: string;
}

interface ListingHealthEvent {
  eventId: string;
  title: string;
  score: number;
  issues: ListingHealthIssue[];
}

interface ListingHealthResponse {
  score: number;
  byEvent: ListingHealthEvent[];
}

const TRUST_LABELS: Record<number, string> = {
  0: 'Новый',
  1: 'Базовый',
  2: 'Проверенный',
  3: 'Надёжный',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attentionEvents, setAttentionEvents] = useState<SupplierEvent[] | null>(null);
  const [recentSales, setRecentSales] = useState<SalesReportResponse | null>(null);
  const [listingHealth, setListingHealth] = useState<ListingHealthResponse | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>('/supplier/dashboard')
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((e: any) => {
        setError(e.message ?? 'Ошибка загрузки');
      });

    // Дополнительные данные для блоков "Требует внимания", "Качество листингов" и "Последние продажи"
    Promise.allSettled([
      api.get<{ items: SupplierEvent[]; total: number }>('/supplier/events?limit=25&page=1'),
      api.get<SalesReportResponse>('/supplier/reports/sales?limit=4'),
      api.get<ListingHealthResponse>('/supplier/listing-health'),
    ])
      .then(([eventsResult, salesResult, healthResult]) => {
        if (eventsResult.status === 'fulfilled') {
          const rawItems = eventsResult.value.items || [];
          const problematic = rawItems.filter((e) => {
            const hasStatusIssue =
              e.moderationStatus === 'PENDING_REVIEW' ||
              e.moderationStatus === 'REJECTED' ||
              e.moderationStatus === 'DRAFT';
            const hasNoImage = !e.imageUrl;
            return hasStatusIssue || hasNoImage;
          });
          setAttentionEvents(problematic);
        } else {
          setAttentionEvents(null);
        }

        if (salesResult.status === 'fulfilled') {
          const value = salesResult.value;
          const canRenderItems =
            Array.isArray(value.items) &&
            value.items.length > 0 &&
            value.items.every(
              (i) => typeof i.shortCode === 'string' && typeof i.supplierAmount === 'number' && i.supplierAmount !== null,
            );

          setRecentSales(canRenderItems ? value : null);
        } else {
          setRecentSales(null);
        }

        if (healthResult.status === 'fulfilled') {
          setListingHealth(healthResult.value);
        } else {
          setListingHealth(null);
        }
      })
      .finally(() => setLoadingExtra(false));
  }, []);

  if (error && !data) {
    return <ErrorState title="Не удалось загрузить дашборд" description={error} />;
  }

  if (!data && !error) {
    return <LoadingState label="Загружаем статистику по продажам..." />;
  }

  if (!data) return null;

  const trustLevel = data.trust?.level ?? data.operator.trustLevel;
  const trustLabel = TRUST_LABELS[trustLevel] || '?';
  const trustScore = data.trust?.score ?? (trustLevel * 25);
  const trustProgress = Math.max(0, Math.min(100, trustScore));
  const commissionPct = (Number(data.operator.commissionRate) * 100).toFixed(0);

  const kpiCards = [
    { label: 'Активных событий', value: data.events.active, icon: Calendar, color: 'text-blue-600' },
    { label: 'На модерации', value: data.events.pending, icon: AlertCircle, color: 'text-orange-500' },
    { label: 'Продано билетов', value: data.sales.totalOrders, icon: CheckCircle, color: 'text-green-600' },
    {
      label: 'Ваш доход (нетто), ₽',
      value: (data.sales.netRevenue / 100).toLocaleString('ru-RU'),
      icon: TrendingUp,
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Добро пожаловать, ${data.operator.name}`}
        subtitle={`Уровень доверия: ${trustLabel} · Комиссия ${commissionPct}%`}
        meta={`Активных событий: ${data.events.active} · На модерации: ${data.events.pending}`}
      />

      {/* Trust & commission row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SectionCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">Уровень доверия</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {trustLabel} · {trustScore} из 100
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {data.operator.successfulSales} успешных продаж
            </span>
          </div>
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all"
                style={{ width: `${trustProgress}%` }}
              />
            </div>
            {data.trust?.keyFactors && data.trust.keyFactors.length > 0 && (
              <p className="mt-3 text-xs text-gray-600">
                Ключевые факторы:{' '}
                {data.trust.keyFactors
                  .map((f) => `${f.label} ${f.score}/${f.max}`)
                  .join(', ')}
              </p>
            )}
            {data.trust?.nextStepRecommendation && (
              <p className="mt-2 text-xs font-medium text-amber-700">
                Что улучшить: {data.trust.nextStepRecommendation}
              </p>
            )}
            {!data.trust?.nextStepRecommendation && (
              <p className="mt-2 text-xs text-gray-500">
                Чем выше уровень, тем больше лимиты и приоритет в модерации.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard>
          <p className="text-xs text-gray-500">Комиссия платформы</p>
          <p className="mt-2 text-2xl font-bold">{commissionPct}%</p>
          <p className="mt-1 text-xs text-gray-500">Списывается с каждой успешной продажи.</p>
        </SectionCard>

        <SectionCard>
          <p className="text-xs text-gray-500">Лимит активных событий</p>
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <p>
              Активных сейчас:{' '}
              <span className="font-semibold text-gray-900">
                {data.trust?.activeEventsCount ?? data.events.active} из {data.trust?.activeEventsLimit ?? '—'}
              </span>
            </p>
            {data.trust && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full ${
                    data.trust.activeEventsCount / data.trust.activeEventsLimit >= 0.8
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (data.trust.activeEventsCount / data.trust.activeEventsLimit) * 100 || 0,
                    )}%`,
                  }}
                />
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              При достижении лимита новые события нужно будет деактивировать или повысить уровень доверия.
            </p>
          </div>
        </SectionCard>
      </div>

      {/* KPI cards — StatCard для компактных метрик */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((c) => (
          <StatCard
            key={c.label}
            label={c.label}
            value={c.value}
            icon={<c.icon className={`h-5 w-5 ${c.color}`} />}
          />
        ))}
      </div>

      {/* Реквизиты — если профиль не верифицирован или нет основного счёта */}
      {data.profileRequisites && (
        <SupplierFinanceWidget profileRequisites={data.profileRequisites} />
      )}

      {/* Financial summary */}
      <SectionCard title="Финансовая сводка">
        <div className="grid gap-6 md:grid-cols-3 text-center">
          <div>
            <p className="text-sm text-gray-500">Оборот (гросс)</p>
            <p className="mt-1 text-xl font-bold">
              {(data.sales.grossRevenue / 100).toLocaleString('ru-RU')} ₽
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Комиссия платформы</p>
            <p className="mt-1 text-xl font-bold text-red-500">
              -{(data.sales.platformFee / 100).toLocaleString('ru-RU')} ₽
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Ваш доход (нетто)</p>
            <p className="mt-1 text-xl font-bold text-green-600">
              {(data.sales.netRevenue / 100).toLocaleString('ru-RU')} ₽
            </p>
          </div>
        </div>
      </SectionCard>

      {/* До следующего уровня */}
      {data.trust && data.trust.nextLevelRequirements.length > 0 && (
        <SectionCard title="До следующего уровня">
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {data.trust.nextLevelRequirements.map((r) => (
              <li key={r.code}>{r.message}</li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Требует внимания — сводка из API (listing health + отзывы без ответа) */}
      {data.attention &&
        (data.attention.eventsWithoutSchedule > 0 ||
          data.attention.eventsWithoutPhoto > 0 ||
          data.attention.reviewsWithoutResponse > 0) && (
          <SectionCard title="Требует внимания">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700">
              {data.attention.eventsWithoutSchedule > 0 && (
                <Button asChild variant="link" size="sm" className="h-auto p-0 font-medium text-amber-700 hover:text-amber-800">
                  <Link to="/availability">
                  <AlertCircle className="h-4 w-4" />
                  {data.attention.eventsWithoutSchedule} событий без расписания
                  </Link>
                </Button>
              )}
              {data.attention.eventsWithoutPhoto > 0 && (
                <Button asChild variant="link" size="sm" className="h-auto p-0 font-medium text-amber-700 hover:text-amber-800">
                  <Link to="/events">
                  <AlertCircle className="h-4 w-4" />
                  {data.attention.eventsWithoutPhoto} без фото
                  </Link>
                </Button>
              )}
              {data.attention.reviewsWithoutResponse > 0 && (
                <Button asChild variant="link" size="sm" className="h-auto p-0 font-medium text-amber-700 hover:text-amber-800">
                  <Link to="/reviews">
                  <AlertCircle className="h-4 w-4" />
                  {data.attention.reviewsWithoutResponse} отзывов без ответа
                  </Link>
                </Button>
              )}
            </div>
          </SectionCard>
        )}

      {/* Качество листингов — список замечаний со ссылками «Исправить» */}
      {listingHealth &&
        listingHealth.byEvent.some((e) => e.issues.length > 0) && (
          <SectionCard title="Качество листингов">
            <p className="mb-3 text-xs text-gray-500">
              Оценка: {listingHealth.score} из 100. Исправьте замечания, чтобы улучшить видимость событий.
            </p>
            <ul className="space-y-3">
              {listingHealth.byEvent
                .filter((e) => e.issues.length > 0)
                .map((event) => (
                  <li key={event.eventId} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <p className="mb-2 text-sm font-medium text-gray-900">{event.title}</p>
                    <ul className="space-y-1">
                      {event.issues.map((issue, idx) => (
                        <li key={`${issue.code}-${idx}`} className="flex items-center gap-2 text-sm text-gray-700">
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                          {issue.actionUrl ? (
                            <Link
                              to={issue.actionUrl}
                              className="font-medium text-amber-700 hover:text-amber-800 hover:underline"
                            >
                              {issue.message} → Исправить
                            </Link>
                          ) : (
                            <span>{issue.message}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
          </SectionCard>
        )}

      {/* Требует внимания — список событий (модерация, черновики, без фото) */}
      {attentionEvents && attentionEvents.length > 0 && (
        <SectionCard title="События с замечаниями">
          <div className="divide-y">
            {attentionEvents.map((event) => {
              const badges: { label: string; color: string }[] = [];
              if (event.moderationStatus === 'PENDING_REVIEW') {
                badges.push({ label: 'На модерации', color: 'bg-amber-50 text-amber-800' });
              }
              if (event.moderationStatus === 'REJECTED') {
                badges.push({ label: 'Отклонено', color: 'bg-red-50 text-red-700' });
              }
              if (event.moderationStatus === 'DRAFT') {
                badges.push({ label: 'Черновик', color: 'bg-slate-100 text-slate-700' });
              }
              if (!event.imageUrl) {
                badges.push({ label: 'Без фото', color: 'bg-amber-50 text-amber-800' });
              }

              return (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <p className="truncate text-sm font-medium text-slate-900">{event.title}</p>
                    </div>
                    {event.moderationNote && (
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{event.moderationNote}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {badges.map((b) => (
                      <span
                        key={b.label}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${b.color}`}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Последние продажи */}
      {recentSales && (
        <SectionCard
          title="Последние продажи"
          headerRight={
            <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs font-medium text-blue-600 hover:text-blue-700">
              <Link to="/reports">
                Все отчёты
                <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          }
        >
          {recentSales.items.length === 0 && !loadingExtra ? (
            <EmptyState title="Пока нет продаж" description="Как только появятся оплаченные заказы, они появятся здесь." />
          ) : (
            <div className="space-y-2 text-sm">
              {recentSales.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs text-slate-500">{item.shortCode}</span>
                    <span className="text-xs text-slate-400">
                      {item.date ? new Date(item.date).toLocaleDateString('ru-RU') : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600">
                      {((item.supplierAmount || 0) / 100).toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
