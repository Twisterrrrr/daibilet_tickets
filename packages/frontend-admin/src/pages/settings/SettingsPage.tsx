import { useEffect, useState } from 'react';
import { adminApi } from '../../api/client';

interface SyncStatus {
  lastSyncAt: string | null;
  events: { total: number; active: number };
  sessions: { total: number; active: number };
  ops: {
    lastFullSyncAt: string | null;
    lastIncrSyncAt: string | null;
    lastRetagAt: string | null;
    lastPopulateAt: string | null;
    lastCacheFlush: string | null;
    lastError: string | null;
  } | null;
}

interface PricingConfig {
  id: string;
  serviceFeePercent: number;
  peakMarkupPercent: number;
  lastMinutePercent: number;
  tcCommissionPercent: number;
  peakRanges: any[];
}

export function SettingsPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [opsLoading, setOpsLoading] = useState<string | null>(null);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      adminApi.get<SyncStatus>('/admin/settings/sync-status'),
      adminApi.get<PricingConfig>('/admin/settings/pricing'),
    ]).then(([s, p]) => {
      setStatus(s);
      setPricing(p);
    }).finally(() => setLoading(false));
  }, []);

  const runOps = async (endpoint: string, label: string) => {
    setOpsLoading(label);
    setMessage('');
    try {
      const result = await adminApi.post(endpoint);
      setMessage((result as any).message || `${label} выполнено`);
      // Обновляем статус
      const s = await adminApi.get<SyncStatus>('/admin/settings/sync-status');
      setStatus(s);
    } catch (e: any) {
      setMessage(`Ошибка: ${e.message}`);
    } finally {
      setOpsLoading(null);
    }
  };

  const savePricing = async () => {
    if (!pricing) return;
    setPricingSaving(true);
    try {
      const { id, ...data } = pricing;
      const result = await adminApi.patch('/admin/settings/pricing', data);
      setPricing(result as any);
      setMessage('Pricing сохранён');
    } catch (e: any) {
      setMessage(`Ошибка: ${e.message}`);
    } finally {
      setPricingSaving(false);
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleString('ru-RU') : 'никогда';

  if (loading) return <div className="text-gray-400">Загрузка...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Настройки</h1>

      {message && (
        <div className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">{message}</div>
      )}

      {/* Sync Status */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Статус синхронизации</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">Последняя синхронизация</p>
            <p className="font-medium text-gray-700">{formatDate(status?.lastSyncAt || null)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">События</p>
            <p className="font-medium text-gray-700">{status?.events.active} / {status?.events.total}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Сессии</p>
            <p className="font-medium text-gray-700">{status?.sessions.active} / {status?.sessions.total}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Last cache flush</p>
            <p className="font-medium text-gray-700">{formatDate(status?.ops?.lastCacheFlush || null)}</p>
          </div>
        </div>

        {status?.ops && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 md:grid-cols-4">
            <p className="text-xs text-gray-400">Full sync: {formatDate(status.ops.lastFullSyncAt)}</p>
            <p className="text-xs text-gray-400">Incr sync: {formatDate(status.ops.lastIncrSyncAt)}</p>
            <p className="text-xs text-gray-400">Retag: {formatDate(status.ops.lastRetagAt)}</p>
            <p className="text-xs text-gray-400">Populate: {formatDate(status.ops.lastPopulateAt)}</p>
          </div>
        )}

        {status?.ops?.lastError && (
          <p className="mt-2 text-xs text-red-500">Последняя ошибка: {status.ops.lastError}</p>
        )}
      </section>

      {/* Ops Controls */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Управление операциями</h2>
        <div className="flex flex-wrap gap-3">
          <OpsButton label="Full Sync" loading={opsLoading === 'Full Sync'}
            onClick={() => runOps('/admin/settings/ops/sync/full', 'Full Sync')} />
          <OpsButton label="Incr Sync" loading={opsLoading === 'Incr Sync'}
            onClick={() => runOps('/admin/settings/ops/sync/incremental', 'Incr Sync')} />
          <OpsButton label="Retag" loading={opsLoading === 'Retag'}
            onClick={() => runOps('/admin/settings/ops/retag', 'Retag')} />
          <OpsButton label="Populate Combos" loading={opsLoading === 'Populate Combos'}
            onClick={() => runOps('/admin/settings/ops/populate-combos', 'Populate Combos')} />
          <OpsButton label="Flush Cache" loading={opsLoading === 'Flush Cache'} variant="red"
            onClick={() => runOps('/admin/settings/ops/cache/flush', 'Flush Cache')} />
        </div>
      </section>

      {/* Pricing Config */}
      {pricing && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Конфигурация цен</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Service Fee %</label>
              <input type="number" step="0.1" value={pricing.serviceFeePercent}
                onChange={(e) => setPricing(p => p ? { ...p, serviceFeePercent: Number(e.target.value) } : p)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Peak Markup %</label>
              <input type="number" step="0.1" value={pricing.peakMarkupPercent}
                onChange={(e) => setPricing(p => p ? { ...p, peakMarkupPercent: Number(e.target.value) } : p)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Last Minute %</label>
              <input type="number" step="0.1" value={pricing.lastMinutePercent}
                onChange={(e) => setPricing(p => p ? { ...p, lastMinutePercent: Number(e.target.value) } : p)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">TC Commission %</label>
              <input type="number" step="0.1" value={pricing.tcCommissionPercent}
                onChange={(e) => setPricing(p => p ? { ...p, tcCommissionPercent: Number(e.target.value) } : p)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={savePricing} disabled={pricingSaving}
            className="mt-4 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            {pricingSaving ? 'Сохранение...' : 'Сохранить pricing'}
          </button>
        </section>
      )}
    </div>
  );
}

function OpsButton({ label, loading, onClick, variant }: {
  label: string; loading: boolean; onClick: () => void; variant?: 'red';
}) {
  const base = variant === 'red'
    ? 'border-red-300 text-red-600 hover:bg-red-50'
    : 'border-gray-300 text-gray-600 hover:bg-gray-50';

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${base}`}
    >
      {loading ? `${label}...` : label}
    </button>
  );
}
