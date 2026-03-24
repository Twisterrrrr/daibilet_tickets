import {
  AlertCircle,
  BarChart3,
  ArrowRight,
  Clock3,
  DollarSign,
  Eye,
  Layers3,
  MapPinned,
  ShoppingBag,
  ShoppingCart,
  TicketX,
  TrendingUp,
  Undo2,
  FileWarning,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ErrorState, LoadingState, PageHeader, SectionCard, StatCard, StatusBadge } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardStats {
  events: { total: number; active: number };
  cities: number;
  tags: number;
  articles: number;
  landings: number;
  combos: number;
  orders: { total: number; paid: number };
  revenue30d: number;
  revenueTrend: number;
  ticketsSold30d: number;
  ticketsSoldTrend: number;
  activeEvents: number;
  activeEventsTrend: number;
  pendingReviews: number;
  revenueByDay: { date: string; revenue: number }[];
  salesByCategory: { category: string; count: number }[];
  topEvents: {
    eventId: string;
    title: string;
    slug: string;
    category: string | null;
    imageUrl: string | null;
    salesCount: number;
  }[];
  recentOrders: {
    id: string;
    code: string;
    customer: string;
    email: string;
    amount: number;
    status: string;
    date: string;
    paidAt: string | null;
    city: string;
  }[];
}

interface SupplierActivityItem {
  id: string;
  name: string;
  companyName: string | null;
  _count?: { events?: number };
}

interface DashboardAttentionSummary {
  noSessions: number;
  noPrice: number;
  rejectedModeration: number;
  pendingModeration: number;
  draftOrHidden: number;
  lowListingHealth: number;
}

interface DashboardTabMetric {
  value: number;
  suffix: string;
  hint: string;
}

interface DashboardAnalyticsTabs {
  content: {
    qualityCards: DashboardTabMetric;
    citiesCoverage: DashboardTabMetric;
    popularCategories: DashboardTabMetric;
  };
  operations: {
    recentOrders: DashboardTabMetric;
    paymentIssues: DashboardTabMetric;
    refundsAndCancels: DashboardTabMetric;
  };
  marketing: {
    eventsConversion: DashboardTabMetric;
    promoEfficiency: DashboardTabMetric;
    popularTopics: DashboardTabMetric;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  EXCURSION: 'Экскурсии',
  MUSEUM: 'Музеи',
  EVENT: 'Мероприятия',
};

const CHART_COLORS = [
  'hsl(221.2, 83.2%, 53.3%)',
  'hsl(160, 60%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(280, 65%, 60%)',
  'hsl(340, 75%, 55%)',
];

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  PAID: 'success',
  FULFILLING: 'success',
  FULFILLED: 'success',
  PARTIALLY_FULFILLED: 'warning',
  PENDING_PAYMENT: 'warning',
  DRAFT: 'neutral',
  FAILED: 'danger',
  REFUNDED: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING_PAYMENT: 'Ожидает',
  PAID: 'Оплачен',
  FULFILLING: 'В обработке',
  FULFILLED: 'Выполнен',
  PARTIALLY_FULFILLED: 'Частично',
  FAILED: 'Ошибка',
  REFUNDED: 'Возврат',
};

type PeriodFilter = 'today' | '7d' | '30d';

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  today: 'Сегодня',
  '7d': '7 дней',
  '30d': '30 дней',
};

function formatCurrency(kopecks: number): string {
  return (kopecks / 100).toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ─── Custom Tooltip for Charts ───────────────────────────────────────────────

function RevenueTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

function CategoryTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
      <p className="text-sm font-medium">{payload[0].payload.label}</p>
      <p className="text-sm text-muted-foreground">{payload[0].value} продаж</p>
    </div>
  );
}

function DashboardCompactEmpty({ text }: { text: string }) {
  return (
    <div className="flex h-[96px] items-center justify-center rounded-lg border border-dashed bg-muted/20 px-3 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierActivityItem[]>([]);
  const [attention, setAttention] = useState<DashboardAttentionSummary>({
    noSessions: 0,
    noPrice: 0,
    rejectedModeration: 0,
    pendingModeration: 0,
    draftOrHidden: 0,
    lowListingHealth: 0,
  });
  const [analyticsTabs, setAnalyticsTabs] = useState<DashboardAnalyticsTabs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('30d');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [statsRes, suppliersRes, diagnosticsRes, analyticsTabsRes] = await Promise.allSettled([
          adminApi.get<DashboardStats>('/admin/dashboard/stats'),
          adminApi.get<{ items: SupplierActivityItem[] }>('/admin/suppliers?limit=5'),
          adminApi.get<DashboardAttentionSummary>('/admin/dashboard/attention'),
          adminApi.get<DashboardAnalyticsTabs>('/admin/dashboard/analytics-tabs'),
        ]);

        if (cancelled) return;

        if (statsRes.status === 'rejected') {
          setError(statsRes.reason?.message ?? 'Ошибка загрузки дашборда');
          return;
        }

        setStats(statsRes.value);

        if (suppliersRes.status === 'fulfilled') {
          setSuppliers(Array.isArray(suppliersRes.value.items) ? suppliersRes.value.items : []);
        } else {
          setSuppliers([]);
        }

        if (diagnosticsRes.status === 'fulfilled') {
          setAttention(diagnosticsRes.value);
        } else {
          setAttention({
            noSessions: 0,
            noPrice: 0,
            rejectedModeration: 0,
            pendingModeration: 0,
            draftOrHidden: 0,
            lowListingHealth: 0,
          });
        }

        if (analyticsTabsRes.status === 'fulfilled') {
          setAnalyticsTabs(analyticsTabsRes.value);
        } else {
          setAnalyticsTabs(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Ошибка загрузки дашборда');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingState label="Загрузка дашборда..." className="rounded-xl border" />;
  if (error || !stats) {
    return (
      <ErrorState
        title="Ошибка загрузки дашборда"
        description={error || 'Неизвестная ошибка. Попробуйте обновить страницу.'}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            Обновить
          </Button>
        }
      />
    );
  }

  const now = new Date();
  const periodStart = new Date(now);
  if (period === 'today') {
    periodStart.setHours(0, 0, 0, 0);
  } else if (period === '7d') {
    periodStart.setDate(now.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);
  } else {
    periodStart.setDate(now.getDate() - 29);
    periodStart.setHours(0, 0, 0, 0);
  }

  const filteredRevenue = stats.revenueByDay.filter((d) => new Date(d.date) >= periodStart);
  const revenueForPeriod = filteredRevenue.reduce((sum, day) => sum + day.revenue, 0);
  const _showThirtyDayTrend = period === '30d';

  const revenueChartData = filteredRevenue.map((d) => ({
    ...d,
    date: formatShortDate(d.date),
  }));

  const categoryChartData = stats.salesByCategory.map((d) => ({
    ...d,
    label: CATEGORY_LABELS[d.category] || d.category,
  }));

  // If topEvents max salesCount for progress bar
  const maxSales = stats.topEvents.length > 0 ? stats.topEvents[0].salesCount : 1;
  const totalAttentionProblems =
    attention.noSessions +
    attention.noPrice +
    attention.rejectedModeration +
    attention.pendingModeration +
    attention.draftOrHidden +
    attention.lowListingHealth;
  const attentionItems = [
    {
      key: 'noSessions',
      title: 'Без сеансов',
      description: 'Активные события без доступных будущих сеансов',
      value: attention.noSessions,
      to: '/availability',
      icon: AlertCircle,
      iconClassName: 'text-amber-600',
    },
    {
      key: 'noPrice',
      title: 'Без цены',
      description: 'События без валидной стоимости оффера',
      value: attention.noPrice,
      to: '/events',
      icon: TicketX,
      iconClassName: 'text-rose-600',
    },
    {
      key: 'rejectedModeration',
      title: 'Отклонены модерацией',
      description: 'Карточки, отклоненные и требующие доработки',
      value: attention.rejectedModeration,
      to: '/moderation',
      icon: XCircle,
      iconClassName: 'text-red-600',
    },
    {
      key: 'pendingModeration',
      title: 'Очередь модерации',
      description: 'События, ожидающие решения модератора',
      value: attention.pendingModeration,
      to: '/moderation',
      icon: Clock3,
      iconClassName: 'text-blue-600',
    },
    {
      key: 'draftOrHidden',
      title: 'Черновики и скрытые',
      description: 'Неактивные карточки, не попадающие в витрину',
      value: attention.draftOrHidden,
      to: '/events',
      icon: FileWarning,
      iconClassName: 'text-orange-600',
    },
    {
      key: 'lowListingHealth',
      title: 'Низкое качество карточек',
      description: 'Проблемы с контентом, ценой или доступностью',
      value: attention.lowListingHealth,
      to: '/events',
      icon: ShieldAlert,
      iconClassName: 'text-amber-700',
    },
  ] as const;
  const contentMetrics = analyticsTabs?.content;
  const operationsMetrics = analyticsTabs?.operations;
  const marketingMetrics = analyticsTabs?.marketing;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Дашборд"
        subtitle="Операционная сводка по ключевым метрикам и зонам внимания"
        actions={
          <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
            {(['today', '7d', '30d'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={
                  period === key
                    ? 'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium text-foreground shadow-sm bg-background'
                    : 'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium'
                }
              >
                {PERIOD_LABELS[key]}
              </button>
            ))}
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Заказы"
          value={stats.orders.total}
          icon={<ShoppingCart className="h-8 w-8 text-primary/30" />}
          description={`Всего заказов • тренд ${stats.ticketsSoldTrend > 0 ? '+' : ''}${stats.ticketsSoldTrend}%`}
        />
        <StatCard
          label="Выручка"
          value={formatCurrency(revenueForPeriod)}
          icon={<DollarSign className="h-8 w-8 text-success/30" />}
          description={`За ${PERIOD_LABELS[period].toLowerCase()} • тренд ${stats.revenueTrend > 0 ? '+' : ''}${stats.revenueTrend}%`}
        />
        <StatCard
          label="Активные события"
          value={stats.activeEvents}
          icon={<Eye className="h-8 w-8 text-info/30" />}
          description={`Всего событий: ${stats.events.total} • тренд ${stats.activeEventsTrend > 0 ? '+' : ''}${stats.activeEventsTrend}%`}
        />
        <StatCard
          label="Ожидают модерации"
          value={stats.pendingReviews}
          icon={<BarChart3 className="h-8 w-8 text-accent/30" />}
          description="Карточки в очереди, требуют внимания команды"
        />
      </div>

      <div className="grid gap-4">
        <SectionCard
          title="Требует внимания"
          description="Ключевые блокеры по каталогу и модерации"
          headerRight={
            <div className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-destructive px-2 text-xs font-semibold text-white">
              {totalAttentionProblems}
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {attentionItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className="group flex items-center justify-between rounded-xl border border-border/80 bg-white p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${item.iconClassName}`} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <span className="ml-3 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold">
                    {item.value}
                  </span>
                </Link>
              );
            })}
          </div>
        </SectionCard>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Контент</TabsTrigger>
            <TabsTrigger value="operations">Операции</TabsTrigger>
            <TabsTrigger value="marketing">Маркетинг</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <SectionCard title="Качество карточек">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Layers3 className="h-4 w-4" />
                    Полнота контента и готовность к публикации
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {contentMetrics?.qualityCards.value ?? 0}
                    {contentMetrics?.qualityCards.suffix ?? ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{contentMetrics?.qualityCards.hint ?? 'Нет данных'}</p>
                </div>
              </SectionCard>
              <SectionCard title="Покрытие по городам">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPinned className="h-4 w-4" />
                    География активных предложений
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {contentMetrics?.citiesCoverage.value ?? 0}
                    {contentMetrics?.citiesCoverage.suffix ?? ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{contentMetrics?.citiesCoverage.hint ?? 'Нет данных'}</p>
                </div>
              </SectionCard>
              <SectionCard title="Популярные категории">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    Категории с наибольшей активностью
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {contentMetrics?.popularCategories.value ?? 0}
                    {contentMetrics?.popularCategories.suffix ?? ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{contentMetrics?.popularCategories.hint ?? 'Нет данных'}</p>
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          <TabsContent value="operations" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <SectionCard title="Последние заказы">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShoppingBag className="h-4 w-4" />
                    Оперативная лента новых заказов
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {operationsMetrics?.recentOrders.value ?? 0}
                    {operationsMetrics?.recentOrders.suffix ?? ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{operationsMetrics?.recentOrders.hint ?? 'Нет данных'}</p>
                </div>
              </SectionCard>
              <SectionCard title="Проблемы оплат">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TicketX className="h-4 w-4" />
                    Ошибки платежей и зависшие транзакции
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {operationsMetrics?.paymentIssues.value ?? 0}
                    {operationsMetrics?.paymentIssues.suffix ?? ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{operationsMetrics?.paymentIssues.hint ?? 'Нет данных'}</p>
                </div>
              </SectionCard>
              <SectionCard title="Возвраты и отмены">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Undo2 className="h-4 w-4" />
                    Динамика спорных и отмененных заказов
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {operationsMetrics?.refundsAndCancels.value ?? 0}
                    {operationsMetrics?.refundsAndCancels.suffix ?? ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {operationsMetrics?.refundsAndCancels.hint ?? 'Нет данных'}
                  </p>
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          <TabsContent value="marketing" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <SectionCard title="Конверсия событий">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Переходы в покупку по карточкам событий
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {marketingMetrics?.eventsConversion.value ?? 0}
                    {marketingMetrics?.eventsConversion.suffix ?? ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{marketingMetrics?.eventsConversion.hint ?? 'Нет данных'}</p>
                </div>
              </SectionCard>
              <SectionCard title="Промо эффективность">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Вклад промо-механик в продажи
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {marketingMetrics?.promoEfficiency.value ?? 0}
                    {marketingMetrics?.promoEfficiency.suffix ?? ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{marketingMetrics?.promoEfficiency.hint ?? 'Нет данных'}</p>
                </div>
              </SectionCard>
              <SectionCard title="Популярные темы">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    Темы с максимальным интересом аудитории
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {marketingMetrics?.popularTopics.value ?? 0}
                    {marketingMetrics?.popularTopics.suffix ?? ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{marketingMetrics?.popularTopics.hint ?? 'Нет данных'}</p>
                </div>
              </SectionCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <SectionCard title="Активность поставщиков" description="Короткий список по последним поставщикам">
        {suppliers.length ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {suppliers.map((supplier) => (
              <Link
                key={supplier.id}
                to={`/suppliers/${supplier.id}`}
                className="rounded-[10px] border border-border/80 bg-white p-3 transition-colors hover:bg-muted/30"
              >
                <p className="truncate text-sm font-medium">{supplier.companyName || supplier.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{supplier.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Событий: {supplier._count?.events ?? 0}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">Нет данных по поставщикам</p>
        )}
      </SectionCard>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Revenue chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">{`Выручка за ${PERIOD_LABELS[period].toLowerCase()}`}</CardTitle>
            <CardDescription>Общая сумма оплаченных заказов по дням</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221.2, 83.2%, 53.3%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(221.2, 83.2%, 53.3%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickFormatter={(v) => `${(v / 100).toLocaleString('ru-RU')}₽`}
                  />
                  <RechartsTooltip content={<RevenueTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(221.2, 83.2%, 53.3%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[140px] items-center justify-center text-muted-foreground">
                Нет данных за этот период
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales by category */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Продажи по категориям</CardTitle>
            <CardDescription>Распределение проданных билетов</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <RechartsTooltip content={<CategoryTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {categoryChartData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[140px] items-center justify-center text-muted-foreground">
                Нет данных о продажах
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Top events + Recent orders */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Top events */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Топ мероприятия</CardTitle>
              <CardDescription>По количеству продаж за 30 дней</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {stats.topEvents.length > 0 ? (
              <div className="space-y-4">
                {stats.topEvents.map((ev, idx) => (
                  <div key={ev.eventId} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link to={`/events/${ev.eventId}`} className="text-sm font-medium hover:underline truncate block">
                        {ev.title}
                      </Link>
                      <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(ev.salesCount / maxSales) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{ev.salesCount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <DashboardCompactEmpty text="Нет продаж за выбранный период" />
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Последние заказы</CardTitle>
              <CardDescription>10 последних оформленных заказов</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/orders" className="gap-1">
                Все заказы <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Заказ</TableHead>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Город</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                          {order.code}
                        </Link>
                        <p className="text-xs text-muted-foreground">{formatDate(order.date)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm truncate max-w-[120px]">{order.customer}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{order.city}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(order.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={STATUS_TONE[order.status] || 'neutral'}
                          label={STATUS_LABELS[order.status] || order.status}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <DashboardCompactEmpty text="Заказов пока нет" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
