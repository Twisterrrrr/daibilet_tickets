import { Fragment, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '../../api/client';

// ============================================================
// Types
// ============================================================

interface FulfillmentItem {
  id: string;
  lineItemIndex: number;
  offerId: string;
  purchaseFlow: string;
  provider: string;
  status: string;
  externalOrderId: string | null;
  amount: number;
  refundedAmount: number;
  attemptCount: number;
  lastError: string | null;
  escalatedAt: string | null;
  resolvedBy: string | null;
  nextRetryAt: string | null;
}

interface SessionSelect {
  id: string;
  shortCode: string;
  status: string;
  customerEmail: string | null;
  customerName: string | null;
  totalPrice: number;
  fulfillmentItems: FulfillmentItem[];
}

interface IntentItem {
  id: string;
  checkoutSessionId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerPaymentId: string | null;
  supplierId: string | null;
  grossAmount: number | null;
  platformFee: number | null;
  supplierAmount: number | null;
  createdAt: string;
  paidAt: string | null;
  failReason: string | null;
  checkoutSession: SessionSelect;
}

interface MismatchItem {
  sessionId: string;
  shortCode: string;
  status: string;
  customerEmail: string | null;
  paidAmount: number;
  failedAmount: number;
  failedItems: FulfillmentItem[];
  paymentIntents: Array<{ id: string; amount: number; providerPaymentId: string | null; provider: string }>;
}

interface WebhookEvent {
  id: string;
  providerEventId: string;
  provider: string;
  eventType: string;
  result: string | null;
  paymentIntentId: string | null;
  processedAt: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}

interface MetricsResponse {
  counters: Record<string, number>;
  rates: {
    fulfillmentFailRate: number;
    autoCompensateRate: number;
    webhookDedupRate: number;
  };
  alerts: Array<{ metric: string; level: 'ok' | 'warn' | 'critical'; value: number }>;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  counts: {
    pendingStale: number;
    failedUnresolved: number;
    escalatedOpen: number;
    totalActiveIntents: number;
  };
}

// ============================================================
// Constants
// ============================================================

type Tab = 'intents' | 'mismatches' | 'webhooks' | 'metrics';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  PAID: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  RESERVING: 'bg-blue-100 text-blue-800',
  RESERVED: 'bg-blue-100 text-blue-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
};

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300',
  degraded: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  critical: 'bg-red-100 text-red-800 border-red-300',
};

const ALERT_COLORS: Record<string, string> = {
  ok: 'text-green-700',
  warn: 'text-yellow-700 font-semibold',
  critical: 'text-red-700 font-bold',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  PROCESSING: 'Обрабатывается',
  PAID: 'Оплачен',
  FAILED: 'Ошибка',
  CANCELLED: 'Отменен',
  REFUNDED: 'Возврат',
  CONFIRMED: 'Подтвержден',
  COMPLETED: 'Завершен',
  RESERVING: 'Резервирование',
  RESERVED: 'Зарезервирован',
  EXPIRED: 'Истек',
};

const HEALTH_LABELS: Record<HealthResponse['status'], string> = {
  healthy: 'Норма',
  degraded: 'Деградация',
  critical: 'Критично',
};

function humanizeMetricKey(key: string): string {
  const map: Record<string, string> = {
    pending_stale: 'Зависшие платежи',
    failed_unresolved: 'Ошибки без решения',
    escalated_open: 'Открытые эскалации',
    total_active_intents: 'Активные платежи',
    payment_fail_rate: 'Доля ошибок платежей',
    webhook_dedup_rate: 'Доля дедупликации вебхуков',
  };
  return map[key] ?? key.replace(/_/g, ' ');
}

const formatRub = (kopecks: number) => `${(kopecks / 100).toFixed(2)} \u20BD`;
const formatDate = (d: string) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return 'Дата не указана';
  return date.toLocaleString('ru-RU');
};

// ============================================================
// Component
// ============================================================

export default function ReconciliationPage() {
  const [tab, setTab] = useState<Tab>('intents');

  // ---------- Intents ----------
  const [intents, setIntents] = useState<IntentItem[]>([]);
  const [intentsTotal, setIntentsTotal] = useState(0);
  const [intentsLoading, setIntentsLoading] = useState(false);
  const [intentsCursor, setIntentsCursor] = useState<string | null>(null);
  const [intentsHasMore, setIntentsHasMore] = useState(false);
  const [expandedIntent, setExpandedIntent] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterProviderPmtId, setFilterProviderPmtId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // ---------- Mismatches ----------
  const [mismatches, setMismatches] = useState<MismatchItem[]>([]);
  const [mismatchesLoading, setMismatchesLoading] = useState(false);

  // ---------- Webhooks ----------
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [webhooksTotal, setWebhooksTotal] = useState(0);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [webhooksCursor, setWebhooksCursor] = useState<string | null>(null);
  const [webhooksHasMore, setWebhooksHasMore] = useState(false);
  const [webhookDedupStats, setWebhookDedupStats] = useState<{
    totalReceived: number;
    duplicatesSkipped: number;
    dedupRate: number;
  } | null>(null);

  // ---------- Metrics ----------
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  // ============================================================
  // Loaders
  // ============================================================

  const loadIntents = useCallback(
    async (cursor?: string | null) => {
      setIntentsLoading(true);
      try {
        const params = new URLSearchParams();
        if (cursor) params.set('cursor', cursor);
        else params.set('page', '1');
        params.set('limit', '50');
        if (filterStatus) params.set('status', filterStatus);
        if (filterProvider) params.set('provider', filterProvider);
        if (filterProviderPmtId) params.set('providerPaymentId', filterProviderPmtId);
        if (filterFrom) params.set('from', filterFrom);
        if (filterTo) params.set('to', filterTo);

        const res = await adminApi.get<PaginatedResponse<IntentItem>>(
          `/admin/reconciliation/intents?${params.toString()}`,
        );
        if (cursor) {
          setIntents((prev) => [...prev, ...res.items]);
        } else {
          setIntents(res.items);
        }
        setIntentsTotal(res.total);
        setIntentsCursor(res.nextCursor);
        setIntentsHasMore(res.hasMore);
      } catch {
        toast.error('Ошибка загрузки платежей');
      }
      setIntentsLoading(false);
    },
    [filterStatus, filterProvider, filterProviderPmtId, filterFrom, filterTo],
  );

  const loadMismatches = useCallback(async () => {
    setMismatchesLoading(true);
    try {
      const res = await adminApi.get<{ items: MismatchItem[] }>('/admin/reconciliation/mismatches');
      setMismatches(res.items);
    } catch {
      toast.error('Ошибка загрузки расхождений');
    }
    setMismatchesLoading(false);
  }, []);

  const loadWebhooks = useCallback(
    async (cursor?: string | null) => {
      setWebhooksLoading(true);
      try {
        const params = new URLSearchParams();
        if (cursor) params.set('cursor', cursor);
        else params.set('page', '1');
        params.set('limit', '50');
        if (filterFrom) params.set('from', filterFrom);
        if (filterTo) params.set('to', filterTo);

        const res = await adminApi.get<
          PaginatedResponse<WebhookEvent> & {
            dedupStats: { totalReceived: number; duplicatesSkipped: number; dedupRate: number };
          }
        >(`/admin/reconciliation/webhooks?${params.toString()}`);
        if (cursor) {
          setWebhooks((prev) => [...prev, ...res.items]);
        } else {
          setWebhooks(res.items);
        }
        setWebhooksTotal(res.total);
        setWebhooksCursor(res.nextCursor);
        setWebhooksHasMore(res.hasMore);
        setWebhookDedupStats(res.dedupStats);
      } catch {
        toast.error('Ошибка загрузки вебхуков');
      }
      setWebhooksLoading(false);
    },
    [filterFrom, filterTo],
  );

  const loadMetrics = useCallback(async () => {
    try {
      const [m, h] = await Promise.all([
        adminApi.get<MetricsResponse>('/admin/ops/metrics'),
        adminApi.get<HealthResponse>('/admin/ops/health'),
      ]);
      setMetrics(m);
      setHealth(h);
    } catch {
      toast.error('Ошибка загрузки метрик');
    }
  }, []);

  useEffect(() => {
    if (tab === 'intents') loadIntents();
    if (tab === 'mismatches') loadMismatches();
    if (tab === 'webhooks') loadWebhooks();
    if (tab === 'metrics') loadMetrics();
  }, [tab, loadIntents, loadMismatches, loadWebhooks, loadMetrics]);

  // ============================================================
  // Actions
  // ============================================================

  const handleRetry = async (sessionId: string) => {
    try {
      await adminApi.post(`/admin/reconciliation/${sessionId}/retry`);
      toast.success('Повторный запуск отправлен');
      loadMismatches();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const handleRefund = async (intentId: string, partial: boolean) => {
    if (!confirm(`Вы уверены? ${partial ? 'Частичный' : 'Полный'} возврат.`)) return;
    try {
      await adminApi.post(`/admin/reconciliation/${intentId}/refund`, {
        partial,
        reason: 'Ручной возврат из админки',
      });
      toast.success('Возврат выполнен');
      if (tab === 'mismatches') loadMismatches();
      else loadIntents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const handleResolve = async (itemId: string) => {
    try {
      await adminApi.post(`/admin/reconciliation/${itemId}/resolve`, {
        note: 'Отмечено как решенное администратором',
      });
      toast.success('Отмечено как решённое');
      loadMismatches();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  // ============================================================
  // Render
  // ============================================================

  const tabItems: { key: Tab; label: string; badge?: number }[] = [
    { key: 'intents', label: 'Платежи', badge: intentsTotal },
    { key: 'mismatches', label: 'Расхождения', badge: mismatches.length },
    { key: 'webhooks', label: 'Вебхуки', badge: webhooksTotal },
    { key: 'metrics', label: 'Мониторинг' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Сверка платежей" />

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabItems.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ======================== INTENTS ======================== */}
      {tab === 'intents' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Статус</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value="">Все</option>
                {['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'].map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Провайдер</label>
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value="">Все</option>
                <option value="STUB">STUB</option>
                <option value="YOOKASSA">YOOKASSA</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">ID платежа провайдера</label>
              <input
                type="text"
                value={filterProviderPmtId}
                onChange={(e) => setFilterProviderPmtId(e.target.value)}
                placeholder="yk-..."
                className="border rounded px-2 py-1.5 text-sm w-48"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">От</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">До</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={() => loadIntents()}
              className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90"
            >
              Найти
            </button>
          </div>

          {/* Table */}
          {intentsLoading && intents.length === 0 && <p className="text-muted-foreground">Загрузка...</p>}

          <div className="border rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-3 py-2">Дата</th>
                  <th className="px-3 py-2">Сессия</th>
                  <th className="px-3 py-2">Статус</th>
                  <th className="px-3 py-2">Провайдер</th>
                  <th className="px-3 py-2">Сумма</th>
                  <th className="px-3 py-2">Платёж</th>
                  <th className="px-3 py-2">Действия</th>
                </tr>
              </thead>
              <tbody>
                {intents.map((intent) => (
                  <Fragment key={intent.id}>
                    <tr
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpandedIntent(expandedIntent === intent.id ? null : intent.id)}
                    >
                      <td className="px-3 py-2 text-xs">{formatDate(intent.createdAt)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{intent.checkoutSession?.shortCode || '—'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${STATUS_COLORS[intent.status] || 'bg-gray-100'}`}
                        >
                          {STATUS_LABELS[intent.status] ?? intent.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">{intent.provider}</td>
                      <td className="px-3 py-2 font-medium">{formatRub(intent.amount)}</td>
                      <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                        {intent.providerPaymentId || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {intent.status === 'PAID' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetry(intent.checkoutSessionId);
                                }}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Повторить
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRefund(intent.id, false);
                                }}
                                className="text-xs text-red-600 hover:underline"
                              >
                                Возврат
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded: fulfillment items */}
                    {expandedIntent === intent.id && intent.checkoutSession?.fulfillmentItems && (
                      <tr>
                        <td colSpan={7} className="bg-muted/20 px-6 py-3">
                          <div className="text-xs text-muted-foreground mb-2">
                            {intent.checkoutSession.customerEmail} | {intent.checkoutSession.customerName} | Статус:{' '}
                            {STATUS_LABELS[intent.checkoutSession.status] ?? intent.checkoutSession.status}
                          </div>
                          {intent.checkoutSession.fulfillmentItems.length === 0 ? (
                            <div className="text-xs text-muted-foreground">Нет данных по шагам исполнения</div>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-muted-foreground border-b">
                                  <th className="py-1">#</th>
                                  <th>Провайдер</th>
                                  <th>Поток</th>
                                  <th>Статус</th>
                                  <th>Сумма</th>
                                  <th>Попытки</th>
                                  <th>Ошибка</th>
                                  <th>Действия</th>
                                </tr>
                              </thead>
                              <tbody>
                                {intent.checkoutSession.fulfillmentItems.map((fi) => (
                                  <tr key={fi.id} className="border-b border-dashed">
                                    <td className="py-1">{fi.lineItemIndex}</td>
                                    <td>{fi.provider}</td>
                                    <td>{fi.purchaseFlow}</td>
                                    <td>
                                      <span className={`px-1.5 py-0.5 rounded ${STATUS_COLORS[fi.status] || ''}`}>
                                        {STATUS_LABELS[fi.status] ?? fi.status}
                                      </span>
                                    </td>
                                    <td>{formatRub(fi.amount)}</td>
                                    <td>{fi.attemptCount}</td>
                                    <td className="text-red-600 max-w-[200px] truncate">{fi.lastError || '—'}</td>
                                    <td>
                                      {fi.status === 'FAILED' && !fi.resolvedBy && (
                                        <button
                                          onClick={() => handleResolve(fi.id)}
                                          className="text-blue-600 hover:underline"
                                        >
                                          Решить
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          {/* Split info */}
                          {intent.grossAmount && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Сумма заказа: {formatRub(intent.grossAmount)} | Комиссия платформы:{' '}
                              {formatRub(intent.platformFee || 0)} | Поставщику: {formatRub(intent.supplierAmount || 0)}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {intentsHasMore && (
            <button
              onClick={() => loadIntents(intentsCursor)}
              disabled={intentsLoading}
              className="px-4 py-2 text-sm border rounded hover:bg-muted"
            >
              {intentsLoading ? 'Загрузка...' : 'Загрузить ещё'}
            </button>
          )}

          <div className="text-xs text-muted-foreground">
            Показано {intents.length} из {intentsTotal}
          </div>
        </div>
      )}

      {/* ======================== MISMATCHES ======================== */}
      {tab === 'mismatches' && (
        <div className="space-y-4">
          {mismatchesLoading && <p className="text-muted-foreground">Загрузка...</p>}
          {!mismatchesLoading && mismatches.length === 0 && (
            <div className="p-8 text-center text-muted-foreground border rounded-lg">
              Расхождений нет. Все платежи в порядке.
            </div>
          )}
          {mismatches.map((m) => (
            <div key={m.sessionId} className="border rounded-lg p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold">{m.shortCode}</span>
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded ${STATUS_COLORS[m.status] || 'bg-gray-100'}`}>
                    {STATUS_LABELS[m.status] ?? m.status}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">{m.customerEmail}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Оплачено:</span>{' '}
                  <span className="font-medium text-green-700">{formatRub(m.paidAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Не исполнено:</span>{' '}
                  <span className="font-medium text-red-700">{formatRub(m.failedAmount)}</span>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1">#</th>
                    <th>Провайдер</th>
                    <th>Статус</th>
                    <th>Сумма</th>
                    <th>Ошибка</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {m.failedItems.map((fi) => (
                    <tr key={fi.id} className="border-b">
                      <td className="py-1">{fi.lineItemIndex}</td>
                      <td>{fi.provider}</td>
                      <td>
                        <span className={`px-2 py-0.5 text-xs rounded ${STATUS_COLORS[fi.status] || ''}`}>
                          {STATUS_LABELS[fi.status] ?? fi.status}
                        </span>
                      </td>
                      <td>{formatRub(fi.amount)}</td>
                      <td className="text-xs text-red-600 max-w-[200px] truncate">{fi.lastError}</td>
                      <td>
                        {!fi.resolvedBy && (
                          <button
                            onClick={() => handleResolve(fi.id)}
                            className="text-xs text-blue-600 hover:underline mr-2"
                          >
                            Решено
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleRetry(m.sessionId)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Повторить все
                </button>
                {m.paymentIntents.map((pi) => (
                  <div key={pi.id} className="flex gap-1">
                    <button
                      onClick={() => handleRefund(pi.id, true)}
                      className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      Частичный
                    </button>
                    <button
                      onClick={() => handleRefund(pi.id, false)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Полный возврат
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================== WEBHOOKS ======================== */}
      {tab === 'webhooks' && (
        <div className="space-y-4">
          {/* Dedup stats */}
          {webhookDedupStats && (
            <div className="flex gap-4 text-sm">
              <div className="border rounded px-3 py-2">
                <div className="text-xs text-muted-foreground">Получено</div>
                <div className="font-bold">{webhookDedupStats.totalReceived}</div>
              </div>
              <div className="border rounded px-3 py-2">
                <div className="text-xs text-muted-foreground">Дубликатов</div>
                <div className="font-bold">{webhookDedupStats.duplicatesSkipped}</div>
              </div>
              <div className="border rounded px-3 py-2">
                <div className="text-xs text-muted-foreground">Доля дублей</div>
                <div className="font-bold">{webhookDedupStats.dedupRate}%</div>
              </div>
            </div>
          )}

          {webhooksLoading && webhooks.length === 0 && <p className="text-muted-foreground">Загрузка...</p>}

          <div className="border rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-3 py-2">Дата</th>
                  <th className="px-3 py-2">Провайдер</th>
                  <th className="px-3 py-2">Тип события</th>
                  <th className="px-3 py-2">Event ID</th>
                  <th className="px-3 py-2">Результат</th>
                  <th className="px-3 py-2">Платеж</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((wh) => (
                  <tr key={wh.id} className="border-b">
                    <td className="px-3 py-2 text-xs">{formatDate(wh.processedAt)}</td>
                    <td className="px-3 py-2">{wh.provider}</td>
                    <td className="px-3 py-2 font-mono text-xs">{wh.eventType}</td>
                    <td className="px-3 py-2 font-mono text-xs max-w-[150px] truncate">{wh.providerEventId}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${STATUS_COLORS[wh.result || ''] || 'bg-gray-100'}`}
                      >
                        {wh.result ? STATUS_LABELS[wh.result] ?? wh.result : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {wh.paymentIntentId ? wh.paymentIntentId.slice(0, 8) + '...' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {webhooksHasMore && (
            <button
              onClick={() => loadWebhooks(webhooksCursor)}
              disabled={webhooksLoading}
              className="px-4 py-2 text-sm border rounded hover:bg-muted"
            >
              {webhooksLoading ? 'Загрузка...' : 'Загрузить ещё'}
            </button>
          )}

          <div className="text-xs text-muted-foreground">
            Показано {webhooks.length} из {webhooksTotal}
          </div>
        </div>
      )}

      {/* ======================== METRICS ======================== */}
      {tab === 'metrics' && (
        <div className="space-y-6">
          {/* Health status */}
          {health && (
            <div className={`border rounded-lg p-4 ${HEALTH_COLORS[health.status] || ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold">{HEALTH_LABELS[health.status] ?? health.status}</span>
                  <span className="ml-2 text-sm">{formatDate(health.timestamp)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div>
                  <div className="text-xs opacity-70">Зависшие (в ожидании более 1 часа)</div>
                  <div className="text-xl font-bold">{health.counts?.pendingStale ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Ошибки без решения</div>
                  <div className="text-xl font-bold">{health.counts?.failedUnresolved ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Эскалированные</div>
                  <div className="text-xl font-bold">{health.counts?.escalatedOpen ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Активные интенты</div>
                  <div className="text-xl font-bold">{health.counts?.totalActiveIntents ?? 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {metrics?.alerts && metrics.alerts.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm">Оповещения</h3>
              {metrics.alerts.map((a) => (
                <div key={a.metric} className={`flex items-center justify-between text-sm ${ALERT_COLORS[a.level]}`}>
                  <span>{humanizeMetricKey(a.metric)}</span>
                  <span>
                    {a.value}% ({a.level === 'critical' ? 'критично' : a.level === 'warn' ? 'предупреждение' : 'норма'})
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Rates */}
          {metrics?.rates && (
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <div className="text-xs text-muted-foreground">Доля ошибок исполнения</div>
                <div className="text-2xl font-bold">{metrics.rates.fulfillmentFailRate}%</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-xs text-muted-foreground">Доля авто-компенсаций</div>
                <div className="text-2xl font-bold">{metrics.rates.autoCompensateRate}%</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-xs text-muted-foreground">Доля дедупликации вебхуков</div>
                <div className="text-2xl font-bold">{metrics.rates.webhookDedupRate}%</div>
              </div>
            </div>
          )}

          {/* Counters */}
          {metrics?.counters && (
            <div>
              <h3 className="font-semibold text-sm mb-3">Счётчики</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(metrics.counters).map(([key, value]) => (
                  <div key={key} className="border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">{humanizeMetricKey(key)}</div>
                    <div className="text-xl font-bold">{typeof value === 'number' ? value : String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
