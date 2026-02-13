import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, CreditCard, Users, MapPin, Calendar } from 'lucide-react';
import { adminApi } from '@/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'PAID' | 'FULFILLING' | 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'FAILED' | 'REFUNDED';
type PackageItemStatus = 'PENDING' | 'BOOKED' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';

interface PackageItem {
  id: string;
  dayNumber: number;
  slot: string;
  slotTime: string;
  adultTickets: number;
  childTickets: number;
  subtotal: number;
  tcOrderId: string | null;
  status: PackageItemStatus;
  event: { id: string; title: string; slug: string };
  session: { id: string; startsAt: string };
}

interface OrderDetailData {
  id: string;
  code: string;
  email: string;
  phone: string | null;
  customerName: string;
  cityId: string;
  dateFrom: string;
  dateTo: string;
  adults: number;
  children: number;
  intensity: string;
  variantName: string | null;
  totalPrice: number;
  serviceFee: number;
  status: OrderStatus;
  paymentId: string | null;
  paidAt: string | null;
  city: { id: string; name: string; slug: string };
  items: PackageItem[];
  voucher: { id: string; shortCode: string; publicUrl: string } | null;
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  DRAFT: 'secondary', PENDING_PAYMENT: 'warning', PAID: 'success',
  FULFILLING: 'success', FULFILLED: 'success', PARTIALLY_FULFILLED: 'warning',
  FAILED: 'destructive', REFUNDED: 'destructive',
};

const ITEM_STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PENDING: 'secondary', BOOKED: 'default', CONFIRMED: 'success',
  FAILED: 'destructive', REFUNDED: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик', PENDING_PAYMENT: 'Ожидает оплаты', PAID: 'Оплачен',
  FULFILLING: 'В исполнении', FULFILLED: 'Исполнен', PARTIALLY_FULFILLED: 'Частично',
  FAILED: 'Ошибка', REFUNDED: 'Возврат',
};

const SAFE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_PAYMENT'], PENDING_PAYMENT: ['PAID', 'FAILED'],
  PAID: ['FULFILLING', 'REFUNDED'], FULFILLING: ['FULFILLED', 'PARTIALLY_FULFILLED', 'FAILED'],
  FULFILLED: [], PARTIALLY_FULFILLED: [], FAILED: ['REFUNDED'], REFUNDED: [],
};

function formatPrice(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(kopecks / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Info Field ──────────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    adminApi
      .get<OrderDetailData>(`/admin/orders/${id}`)
      .then(setOrder)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = (newStatus: string) => {
    if (!id || !order) return;
    setUpdating(true);
    setError(null);
    adminApi
      .put<OrderDetailData | { error: string }>(`/admin/orders/${id}/status`, { status: newStatus })
      .then((res) => {
        if ('error' in res) setError((res as any).error);
        else setOrder(res as OrderDetailData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
      .finally(() => setUpdating(false));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">{error || 'Заказ не найден'}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/orders">Назад</Link>
        </Button>
      </Card>
    );
  }

  const transitions = SAFE_TRANSITIONS[order.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/orders"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Заказ {order.code}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={STATUS_VARIANT[order.status] || 'secondary'}>
                {STATUS_LABELS[order.status] || order.status}
              </Badge>
              <span className="text-xs text-muted-foreground">{order.city?.name}</span>
            </div>
          </div>
        </div>
        {transitions.length > 0 && (
          <div className="flex items-center gap-2">
            {transitions.map((status) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(status)}
                disabled={updating}
              >
                {STATUS_LABELS[status] || status}
              </Button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Customer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Клиент
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <InfoField label="Имя" value={order.customerName} />
            <InfoField label="Email" value={order.email} />
            <InfoField label="Телефон" value={order.phone} />
          </CardContent>
        </Card>

        {/* Trip */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Поездка
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <InfoField label="Город" value={order.city?.name} />
            <InfoField label="Даты" value={`${formatDate(order.dateFrom)} — ${formatDate(order.dateTo)}`} />
            <InfoField label="Состав" value={`${order.adults} взр. + ${order.children} дет.`} />
            <InfoField label="Интенсивность" value={order.intensity} />
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Оплата
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <InfoField label="Итого" value={<span className="text-lg font-bold">{formatPrice(order.totalPrice)}</span>} />
            <InfoField label="Сервисный сбор" value={formatPrice(order.serviceFee)} />
            <InfoField label="Payment ID" value={<span className="font-mono text-xs">{order.paymentId}</span>} />
            <InfoField label="Оплачен" value={order.paidAt ? formatDateTime(order.paidAt) : null} />
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Позиции заказа</CardTitle>
            <CardDescription>{order.items.length} мероприятий</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Событие</TableHead>
                  <TableHead>Начало</TableHead>
                  <TableHead>День</TableHead>
                  <TableHead>Слот</TableHead>
                  <TableHead>Билеты</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>TC Order</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{item.event?.title ?? '—'}</TableCell>
                    <TableCell className="text-sm">{item.session?.startsAt ? formatDateTime(item.session.startsAt) : '—'}</TableCell>
                    <TableCell className="tabular-nums">{item.dayNumber}</TableCell>
                    <TableCell>{item.slot}</TableCell>
                    <TableCell className="tabular-nums">{item.adultTickets}+{item.childTickets}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatPrice(item.subtotal)}</TableCell>
                    <TableCell className="font-mono text-xs">{item.tcOrderId || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={ITEM_STATUS_VARIANT[item.status] || 'secondary'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Voucher */}
      {order.voucher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ваучер</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <InfoField label="Код" value={<span className="font-mono text-lg">{order.voucher.shortCode}</span>} />
            <InfoField
              label="Ссылка"
              value={
                <a href={order.voucher.publicUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  Открыть <ExternalLink className="h-3 w-3" />
                </a>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
