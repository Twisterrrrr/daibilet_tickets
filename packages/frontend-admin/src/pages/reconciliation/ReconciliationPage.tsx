import { useState, useCallback, useEffect } from 'react';
import { adminApi } from '../../api/client';
import { toast } from 'sonner';

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

interface PaymentMetrics {
  payment_intent_created: number;
  payment_intent_paid: number;
  payment_intent_failed: number;
  fulfillment_reserve_success: number;
  fulfillment_reserve_fail: number;
  refund_success: number;
  refund_fail: number;
  webhook_received: number;
  webhook_duplicate: number;
  uptime_seconds: number;
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  RESERVING: 'bg-blue-100 text-blue-800',
  RESERVED: 'bg-blue-100 text-blue-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function ReconciliationPage() {
  const [tab, setTab] = useState<'mismatches' | 'intents' | 'metrics'>('mismatches');
  const [mismatches, setMismatches] = useState<MismatchItem[]>([]);
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMismatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get<{ items: MismatchItem[] }>('/admin/reconciliation/mismatches');
      setMismatches(res.items);
    } catch (e) {
      console.error('Load mismatches failed:', e);
    }
    setLoading(false);
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await adminApi.get<PaymentMetrics>('/admin/ops/metrics');
      setMetrics(res);
    } catch (e) {
      console.error('Load metrics failed:', e);
    }
  }, []);

  useEffect(() => {
    if (tab === 'mismatches') loadMismatches();
    if (tab === 'metrics') loadMetrics();
  }, [tab, loadMismatches, loadMetrics]);

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
      loadMismatches();
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

  const formatRub = (kopecks: number) => `${(kopecks / 100).toFixed(2)} ₽`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Сверка платежей</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['mismatches', 'intents', 'metrics'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'mismatches' ? 'Расхождения' : t === 'intents' ? 'Все платежи' : 'Метрики'}
          </button>
        ))}
      </div>

      {/* Mismatches */}
      {tab === 'mismatches' && (
        <div className="space-y-4">
          {loading && <p className="text-muted-foreground">Загрузка...</p>}
          {!loading && mismatches.length === 0 && (
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

              {/* Failed Items */}
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

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleRetry(m.sessionId)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Retry
                </button>
                {m.paymentIntents.map((pi) => (
                  <div key={pi.id} className="flex gap-1">
                    <button
                      onClick={() => handleRefund(pi.id, true)}
                      className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      Частичный возврат
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

      {/* Metrics */}
      {tab === 'metrics' && metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(metrics).map(([key, value]) => (
            <div key={key} className="border rounded-lg p-4">
              <div className="text-xs text-muted-foreground">{key.replace(/_/g, ' ')}</div>
              <div className="text-2xl font-bold">{typeof value === 'number' ? value : String(value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Intents placeholder */}
      {tab === 'intents' && (
        <p className="text-muted-foreground">Используйте фильтры для поиска PaymentIntents.</p>
      )}
    </div>
  );
}
