import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Search, RefreshCw, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { adminApi } from '@/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// ─── Types ──────────────────────────────────────────────

interface CheckoutSession {
  id: string;
  shortCode: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  totalPrice: number | null;
  expiresAt: string | null;
  createdAt: string;
  _count?: { orderRequests: number };
}

interface OrderRequest {
  id: string;
  checkoutSessionId: string | null;
  eventOfferId: string;
  eventId: string;
  quantity: number;
  priceSnapshot: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerComment: string | null;
  status: string;
  adminNote: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  STARTED: 'warning',
  VALIDATED: 'secondary',
  REDIRECTED: 'secondary',
  PENDING_CONFIRMATION: 'warning',
  CONFIRMED: 'success',
  AWAITING_PAYMENT: 'warning',
  COMPLETED: 'success',
  EXPIRED: 'destructive',
  CANCELLED: 'destructive',
  PENDING: 'warning',
  REJECTED: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
  STARTED: 'Создана',
  VALIDATED: 'Проверена',
  REDIRECTED: 'Перенаправлен',
  PENDING_CONFIRMATION: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждено',
  AWAITING_PAYMENT: 'Ожидает оплату',
  COMPLETED: 'Завершено',
  EXPIRED: 'Истекло',
  CANCELLED: 'Отменено',
  PENDING: 'Ожидает',
  REJECTED: 'Отклонено',
};

function formatPrice(kopecks: number | null): string {
  if (!kopecks) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(kopecks / 100);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Page ───────────────────────────────────────────────

export function CheckoutSessionsListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Заявки и сессии</h1>
        <p className="text-muted-foreground">Управление заказами и заявками на подтверждение</p>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Заявки</TabsTrigger>
          <TabsTrigger value="sessions">Checkout Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <OrderRequestsTab />
        </TabsContent>

        <TabsContent value="sessions">
          <CheckoutSessionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════
// Order Requests Tab
// ═══════════════════════════════════════════

function OrderRequestsTab() {
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [actionDialog, setActionDialog] = useState<{ id: string; action: 'confirm' | 'reject' } | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await adminApi.get<any>(`/admin/checkout/requests?${params}`);
      setRequests(res.items || []);
      setTotal(res.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async () => {
    if (!actionDialog) return;
    setActing(true);
    try {
      await adminApi.post(`/admin/checkout/requests/${actionDialog.id}/${actionDialog.action}`, { adminNote: adminNote || undefined });
      toast.success(actionDialog.action === 'confirm' ? 'Заявка подтверждена' : 'Заявка отклонена');
      setActionDialog(null);
      setAdminNote('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setActing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Заявки ({total})</CardTitle>
            <CardDescription>Заявки на подтверждение от клиентов</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по email, имени, телефону..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {['', 'PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED'].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s ? STATUS_LABELS[s] || s : 'Все'}
              </Button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : requests.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">Нет заявок</p>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{req.customerName || 'Без имени'}</span>
                    <Badge variant={(STATUS_COLORS[req.status] || 'secondary') as any}>
                      {STATUS_LABELS[req.status] || req.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-x-3">
                    {req.customerEmail && <span>{req.customerEmail}</span>}
                    {req.customerPhone && <span>{req.customerPhone}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground space-x-3">
                    <span>Кол-во: {req.quantity}</span>
                    <span>Сумма: {formatPrice(req.priceSnapshot)}</span>
                    <span>{formatDate(req.createdAt)}</span>
                  </div>
                  {req.customerComment && (
                    <p className="text-xs text-slate-500 italic">"{req.customerComment}"</p>
                  )}
                  {req.adminNote && (
                    <p className="text-xs text-amber-600">Заметка: {req.adminNote}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {req.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => { setActionDialog({ id: req.id, action: 'confirm' }); setAdminNote(''); }}
                      >
                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                        Подтвердить
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => { setActionDialog({ id: req.id, action: 'reject' }); setAdminNote(''); }}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Отклонить
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Confirm/Reject Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === 'confirm' ? 'Подтвердить заявку' : 'Отклонить заявку'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.action === 'confirm'
                ? 'Места будут зарезервированы. Клиент получит уведомление.'
                : 'Клиент получит уведомление об отклонении.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Заметка для клиента (необязательно)</Label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Например: Места подтверждены на 14:00"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Отмена</Button>
            <Button
              variant={actionDialog?.action === 'confirm' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={acting}
            >
              {acting ? 'Обработка...' : actionDialog?.action === 'confirm' ? 'Подтвердить' : 'Отклонить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ═══════════════════════════════════════════
// Checkout Sessions Tab
// ═══════════════════════════════════════════

function CheckoutSessionsTab() {
  const [sessions, setSessions] = useState<CheckoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await adminApi.get<any>(`/admin/checkout/sessions?${params}`);
      setSessions(res.items || []);
      setTotal(res.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (id: string) => {
    setDetailId(id);
    try {
      const data = await adminApi.get<any>(`/admin/checkout/sessions/${id}`);
      setDetail(data);
    } catch {
      setDetail(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Checkout Sessions ({total})</CardTitle>
            <CardDescription>Все оформленные заказы</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по коду, email..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {['', 'PENDING_CONFIRMATION', 'REDIRECTED', 'COMPLETED', 'EXPIRED', 'CANCELLED'].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s ? (STATUS_LABELS[s] || s) : 'Все'}
              </Button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">Нет сессий</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">{session.shortCode}</span>
                    <Badge variant={(STATUS_COLORS[session.status] || 'secondary') as any}>
                      {STATUS_LABELS[session.status] || session.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-x-3">
                    <span>{session.customerName || '—'}</span>
                    <span>{session.customerEmail || '—'}</span>
                    <span>{session.customerPhone || '—'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-x-3">
                    <span>Сумма: {formatPrice(session.totalPrice)}</span>
                    <span>Заявок: {session._count?.orderRequests || 0}</span>
                    <span>{formatDate(session.createdAt)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => loadDetail(session.id)}>
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  Детали
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Детали сессии {detail?.shortCode}</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Статус:</span>
                  <Badge variant={(STATUS_COLORS[detail.status] || 'secondary') as any} className="ml-2">
                    {STATUS_LABELS[detail.status] || detail.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Сумма:</span>
                  <span className="font-medium ml-2">{formatPrice(detail.totalPrice)}</span>
                </div>
                <div><span className="text-muted-foreground">Имя:</span> <span className="ml-1">{detail.customerName || '—'}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="ml-1">{detail.customerEmail || '—'}</span></div>
                <div><span className="text-muted-foreground">Телефон:</span> <span className="ml-1">{detail.customerPhone || '—'}</span></div>
                <div><span className="text-muted-foreground">Создано:</span> <span className="ml-1">{formatDate(detail.createdAt)}</span></div>
              </div>

              {detail.utmSource && (
                <div className="text-xs text-muted-foreground">
                  UTM: {detail.utmSource} / {detail.utmMedium} / {detail.utmCampaign}
                </div>
              )}

              {/* Order Requests */}
              {detail.orderRequests && detail.orderRequests.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Заявки ({detail.orderRequests.length})</h4>
                  <div className="space-y-2">
                    {detail.orderRequests.map((req: any) => (
                      <div key={req.id} className="rounded border p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant={(STATUS_COLORS[req.status] || 'secondary') as any}>
                            {STATUS_LABELS[req.status] || req.status}
                          </Badge>
                          <span className="font-medium">{formatPrice(req.priceSnapshot)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Кол-во: {req.quantity} | Event: {req.eventId.slice(0, 8)}...
                        </div>
                        {req.customerComment && (
                          <p className="text-xs italic">"{req.customerComment}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cart Snapshot */}
              {detail.cartSnapshot && (
                <div>
                  <h4 className="font-medium mb-2">Корзина</h4>
                  <div className="space-y-1">
                    {(Array.isArray(detail.cartSnapshot) ? detail.cartSnapshot : []).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between rounded bg-muted px-3 py-2 text-xs">
                        <span className="line-clamp-1">{item.eventTitle}</span>
                        <span className="font-medium">{formatPrice(item.priceFrom * (item.quantity || 1))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Skeleton className="h-40" />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
