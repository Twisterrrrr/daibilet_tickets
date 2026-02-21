import { useState, useCallback, useEffect } from 'react';
import { adminApi } from '../../api/client';
import { toast } from 'sonner';

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

const formatRub = (kopecks: number) => `${(kopecks / 100).toFixed(2)} \u20BD`;
const formatDate = (d: string) => new Date(d).toLocaleString('ru-RU');

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
  const [webhookDedupStats, setWebhookDedupStats] = useState<{ totalReceived: number; duplicatesSkipped: number; dedupRate: number } | null>(null);

  // ---------- Metrics ----------
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  // ============================================================
  // Loaders
  // ============================================================

  const loadIntents = useCallback(async (cursor?: string | null) => {
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
      toast.error('Ошибка загрузки PaymentIntents');
    }
    setIntentsLoading(false);
  }, [filterStatus, filterProvider, filterProviderPmtId, filterFrom, filterTo]);

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

  const loadWebhooks = useCallback(async (cursor?: string | null) => {
    setWebhooksLoading(true);
    try {
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      else params.set('page', '1');
      params.set('limit', '50');
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);

      const res = await adminApi.get<PaginatedResponse<WebhookEvent> & { dedupStats: { totalReceived: number; duplicatesSkipped: number; dedupRate: number } }>(
        `/admin/reconciliation/webhooks?${params.toString()}`,
      );
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
      toast.error('Ошибка загрузки webhooks');
    }
    setWebhooksLoading(false);
  }, [filterFrom, filterTo]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ============================================================
  // Actions
  // ============================================================

  const handleRetry = async (sessionId: string) => {
    try {
      await adminApi.post(`/admin/reconciliation/${sessionId}/retry`);
      toast.success('Retry запущен');
      loadMismatches();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const handleRefund = async (intentId: string, partial: boolean) => {
    if (!confirm(`Вы уверены? ${partial ? 'Частичный' : 'Полный'} возврат.`)) return;
    try {
      await adminApi.post(`/admin/reconciliation/${intentId}/refund`, { partial, reason: 'Admin manual refund' });
      toast.success('Возврат выполнен');
      if (tab === 'mismatches') loadMismatches();
      else loadIntents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const handleResolve = async (itemId: string) => {
    try {
      await adminApi.post(`/admin/reconciliation/${itemId}/resolve`, { note: 'Resolved by admin' });
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
    { key: 'webhooks', label: 'Webhooks', badge: webhooksTotal },
    { key: 'metrics', label: 'Мониторинг' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Сверка платежей</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabItems.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
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
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                <option value="">Все</option>
                {['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Провайдер</label>
              <select value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                <option value="">Все</option>
                <option value="STUB">STUB</option>
                <option value="YOOKASSA">YOOKASSA</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Provider Payment ID</label>
              <input type="text" value={filterProviderPmtId} onChange={(e) => setFilterProviderPmtId(e.target.value)} placeholder="yk-..." className="border rounded px-2 py-1.5 text-sm w-48" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">От</label>
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">До</label>
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="border rounded px-2 py-1.5 text-sm" />
            </div>
            <button onClick={() => loadIntents()} className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90">
              Найти
            </button>
          </div>

          {/* Table */}
          {intentsLoading && intents.length === 0 && <p className="text-muted-foreground">Загрузка...</p>}

          <div className="border rounded-lg overflow-hidden">
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
                  <>
                    <tr key={intent.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedIntent(expandedIntent === intent.id ? null : intent.id)}>
                      <td className="px-3 py-2 text-xs">{formatDate(intent.createdAt)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{intent.checkoutSession?.shortCode || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${STATUS_COLORS[intent.status] || 'bg-gray-100'}`}>
                          {intent.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">{intent.provider}</td>
                      <td className="px-3 py-2 font-medium">{formatRub(intent.amount)}</td>
                      <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{intent.providerPaymentId || '—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {intent.status === 'PAID' && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleRetry(intent.checkoutSessionId); }} className="text-xs text-blue-600 hover:underline">
                                Retry
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleRefund(intent.id, false); }} className="text-xs text-red-600 hover:underline">
                                Refund
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded: fulfillment items */}
                    {expandedIntent === intent.id && intent.checkoutSession?.fulfillmentItems && (
                      <tr key={`${intent.id}-details`}>
                        <td colSpan={7} className="bg-muted/20 px-6 py-3">
                          <div className="text-xs text-muted-foreground mb-2">
                            {intent.checkoutSession.customerEmail} | {intent.checkoutSession.customerName} | Сессия: {intent.checkoutSession.status}
                          </div>
                          {intent.checkoutSession.fulfillmentItems.length === 0 ? (
                            <div className="text-xs text-muted-foreground">Нет fulfillment items</div>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-muted-foreground border-b">
                                  <th className="py-1">#</th>
                                  <th>Provider</th>
                                  <th>Flow</th>
                                  <th>Status</th>
                                  <th>Amount</th>
                                  <th>Attempts</th>
                                  <th>Error</th>
                                  <th>Actions</th>
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
                                        {fi.status}
                                      </span>
                                    </td>
                                    <td>{formatRub(fi.amount)}</td>
                                    <td>{fi.attemptCount}</td>
                                    <td className="text-red-600 max-w-[200px] truncate">{fi.lastError || '—'}</td>
                                    <td>
                                      {fi.status === 'FAILED' && !fi.resolvedBy && (
                                        <button onClick={() => handleResolve(fi.id)} className="text-blue-600 hover:underline">
                                          Resolve
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
                              Gross: {formatRub(intent.grossAmount)} | Platform fee: {formatRub(intent.platformFee || 0)} | Supplier: {formatRub(intent.supplierAmount || 0)}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {intentsHasMore && (
            <button onClick={() => loadIntents(intentsCursor)} disabled={intentsLoading} className="px-4 py-2 text-sm border rounded hover:bg-muted">
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
            <div key={m.sessionId} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold">{m.shortCode}</span>
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded ${STATUS_COLORS[m.status] || 'bg-gray-100'}`}>
                    {m.status}
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
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Error</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {m.failedItems.map((fi) => (
                    <tr key={fi.id} className="border-b">
                      <td className="py-1">{fi.lineItemIndex}</td>
                      <td>{fi.provider}</td>
                      <td>
                        <span className={`px-2 py-0.5 text-xs rounded ${STATUS_COLORS[fi.status] || ''}`}>
                          {fi.status}
                        </span>
                      </td>
                      <td>{formatRub(fi.amount)}</td>
                      <td className="text-xs text-red-600 max-w-[200px] truncate">{fi.lastError}</td>
                      <td>
                        {!fi.resolvedBy && (
                          <button onClick={() => handleResolve(fi.id)} className="text-xs text-blue-600 hover:underline mr-2">
                            Решено
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex gap-2 pt-2">
                <button onClick={() => handleRetry(m.sessionId)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                  Retry All
                </button>
                {m.paymentIntents.map((pi) => (
                  <div key={pi.id} className="flex gap-1">
                    <button onClick={() => handleRefund(pi.id, true)} className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700">
                      Частичный
                    </button>
                    <button onClick={() => handleRefund(pi.id, false)} className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
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
                <div className="text-xs text-muted-foreground">Dedup rate</div>
                <div className="font-bold">{webhookDedupStats.dedupRate}%</div>
              </div>
            </div>
          )}

          {webhooksLoading && webhooks.length === 0 && <p className="text-muted-foreground">Загрузка...</p>}

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-3 py-2">Дата</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Event Type</th>
                  <th className="px-3 py-2">Event ID</th>
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2">Intent</th>
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
                      <span className={`px-2 py-0.5 text-xs rounded ${STATUS_COLORS[wh.result || ''] || 'bg-gray-100'}`}>
                        {wh.result || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{wh.paymentIntentId ? wh.paymentIntentId.slice(0, 8) + '...' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {webhooksHasMore && (
            <button onClick={() => loadWebhooks(webhooksCursor)} disabled={webhooksLoading} className="px-4 py-2 text-sm border rounded hover:bg-muted">
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
                  <span className="text-lg font-bold uppercase">{health.status}</span>
                  <span className="ml-2 text-sm">{formatDate(health.timestamp)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div>
                  <div className="text-xs opacity-70">Зависшие (PENDING &gt;1h)</div>
                  <div className="text-xl font-bold">{health.counts.pendingStale}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">FAILED без решения</div>
                  <div className="text-xl font-bold">{health.counts.failedUnresolved}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Эскалированные</div>
                  <div className="text-xl font-bold">{health.counts.escalatedOpen}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Активные интенты</div>
                  <div className="text-xl font-bold">{health.counts.totalActiveIntents}</div>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {metrics?.alerts && metrics.alerts.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm">Алерты</h3>
              {metrics.alerts.map((a) => (
                <div key={a.metric} className={`flex items-center justify-between text-sm ${ALERT_COLORS[a.level]}`}>
                  <span>{a.metric.replace(/_/g, ' ')}</span>
                  <span>{a.value}% ({a.level.toUpperCase()})</span>
                </div>
              ))}
            </div>
          )}

          {/* Rates */}
          {metrics?.rates && (
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <div className="text-xs text-muted-foreground">Fulfillment Fail Rate</div>
                <div className="text-2xl font-bold">{metrics.rates.fulfillmentFailRate}%</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-xs text-muted-foreground">Auto-compensate Rate</div>
                <div className="text-2xl font-bold">{metrics.rates.autoCompensateRate}%</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-xs text-muted-foreground">Webhook Dedup Rate</div>
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
                    <div className="text-xs text-muted-foreground">{key.replace(/_/g, ' ')}</div>
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
