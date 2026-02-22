import {
  ArrowRight,
  CalendarDays,
  DollarSign,
  ExternalLink,
  MessageSquare,
  Ticket,
  TrendingDown,
  TrendingUp,
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

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PAID: 'success',
  FULFILLING: 'success',
  FULFILLED: 'success',
  PARTIALLY_FULFILLED: 'warning',
  PENDING_PAYMENT: 'warning',
  DRAFT: 'secondary',
  FAILED: 'destructive',
  REFUNDED: 'destructive',
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

function formatCurrency(kopecks: number): string {
  return (kopecks / 100).toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  trend?: number;
  icon: React.ElementType;
  description?: string;
}

function StatCard({ title, value, trend, icon: Icon, description }: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <p className={`flex items-center gap-1 text-xs ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            <TrendIcon className="h-3 w-3" />
            <span>
              {isPositive ? '+' : ''}
              {trend}% за 30 дней
            </span>
          </p>
        )}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
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

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .get<DashboardStats>('/admin/dashboard/stats')
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error || !stats) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">Ошибка загрузки: {error || 'Неизвестная ошибка'}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Обновить
        </Button>
      </Card>
    );
  }

  const revenueChartData = stats.revenueByDay.map((d) => ({
    ...d,
    date: formatShortDate(d.date),
  }));

  const categoryChartData = stats.salesByCategory.map((d) => ({
    ...d,
    label: CATEGORY_LABELS[d.category] || d.category,
  }));

  // If topEvents max salesCount for progress bar
  const maxSales = stats.topEvents.length > 0 ? stats.topEvents[0].salesCount : 1;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Обзор ключевых метрик Дайбилет</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Выручка (30 дн)"
          value={formatCurrency(stats.revenue30d)}
          trend={stats.revenueTrend}
          icon={DollarSign}
        />
        <StatCard
          title="Продано билетов"
          value={stats.ticketsSold30d.toString()}
          trend={stats.ticketsSoldTrend}
          icon={Ticket}
        />
        <StatCard
          title="Активные события"
          value={stats.activeEvents.toString()}
          trend={stats.activeEventsTrend}
          icon={CalendarDays}
          description={`${stats.events.total} всего в базе`}
        />
        <StatCard
          title="Отзывы на модерации"
          value={stats.pendingReviews.toString()}
          icon={MessageSquare}
          description={stats.pendingReviews > 0 ? 'Требуют проверки' : 'Нет новых'}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Revenue chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Выручка за 30 дней</CardTitle>
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
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
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
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
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
              <p className="text-center text-sm text-muted-foreground py-8">Нет продаж за период</p>
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
                        <Badge variant={STATUS_VARIANT[order.status] || 'secondary'}>
                          {STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">Заказов пока нет</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
