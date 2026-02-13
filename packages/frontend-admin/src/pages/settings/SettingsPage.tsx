import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '@/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

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

function OpsButton({
  label,
  loading,
  onClick,
  variant,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  variant?: 'destructive';
}) {
  return (
    <Button
      variant={variant === 'destructive' ? 'destructive' : 'outline'}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? `${label}...` : label}
    </Button>
  );
}

export function SettingsPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [opsLoading, setOpsLoading] = useState<string | null>(null);
  const [pricingSaving, setPricingSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      adminApi.get<SyncStatus>('/admin/settings/sync-status'),
      adminApi.get<PricingConfig>('/admin/settings/pricing'),
    ])
      .then(([s, p]) => {
        setStatus(s);
        setPricing(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const runOps = async (endpoint: string, label: string) => {
    setOpsLoading(label);
    try {
      const result = await adminApi.post(endpoint);
      toast.success((result as any).message || `${label} выполнено`);
      const s = await adminApi.get<SyncStatus>('/admin/settings/sync-status');
      setStatus(s);
    } catch (e: any) {
      toast.error(e.message ? `Ошибка: ${e.message}` : 'Ошибка выполнения операции');
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
      toast.success('Pricing сохранён');
    } catch (e: any) {
      toast.error(e.message ? `Ошибка: ${e.message}` : 'Ошибка сохранения');
    } finally {
      setPricingSaving(false);
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleString('ru-RU') : 'никогда';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
        <p className="text-muted-foreground">Конфигурация синхронизации и ценообразования</p>
      </div>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle>Статус синхронизации</CardTitle>
          <CardDescription>Состояние данных из внешних источников</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Последняя синхронизация</Label>
              <p className="font-medium">{formatDate(status?.lastSyncAt || null)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">События</Label>
              <p className="font-medium">
                {status?.events.active} / {status?.events.total}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Сессии</Label>
              <p className="font-medium">
                {status?.sessions.active} / {status?.sessions.total}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Last cache flush</Label>
              <p className="font-medium">{formatDate(status?.ops?.lastCacheFlush || null)}</p>
            </div>
          </div>

          {status?.ops && (
            <>
              <Separator />
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 md:grid-cols-4">
                <p>Full sync: {formatDate(status.ops.lastFullSyncAt)}</p>
                <p>Incr sync: {formatDate(status.ops.lastIncrSyncAt)}</p>
                <p>Retag: {formatDate(status.ops.lastRetagAt)}</p>
                <p>Populate: {formatDate(status.ops.lastPopulateAt)}</p>
              </div>
            </>
          )}

          {status?.ops?.lastError && (
            <p className="text-sm text-destructive">Последняя ошибка: {status.ops.lastError}</p>
          )}
        </CardContent>
      </Card>

      {/* Ops Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Управление операциями</CardTitle>
          <CardDescription>Запуск синхронизации и служебных задач</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <OpsButton
              label="Full Sync"
              loading={opsLoading === 'Full Sync'}
              onClick={() => runOps('/admin/settings/ops/sync/full', 'Full Sync')}
            />
            <OpsButton
              label="Incr Sync"
              loading={opsLoading === 'Incr Sync'}
              onClick={() => runOps('/admin/settings/ops/sync/incremental', 'Incr Sync')}
            />
            <OpsButton
              label="Retag"
              loading={opsLoading === 'Retag'}
              onClick={() => runOps('/admin/settings/ops/retag', 'Retag')}
            />
            <OpsButton
              label="Populate Combos"
              loading={opsLoading === 'Populate Combos'}
              onClick={() => runOps('/admin/settings/ops/populate-combos', 'Populate Combos')}
            />
            <OpsButton
              label="Flush Cache"
              loading={opsLoading === 'Flush Cache'}
              variant="destructive"
              onClick={() => runOps('/admin/settings/ops/cache/flush', 'Flush Cache')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Config */}
      {pricing && (
        <Card>
          <CardHeader>
            <CardTitle>Конфигурация цен</CardTitle>
            <CardDescription>Проценты наценок и комиссий</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="serviceFeePercent">Service Fee %</Label>
                <Input
                  id="serviceFeePercent"
                  type="number"
                  step="0.1"
                  value={pricing.serviceFeePercent}
                  onChange={(e) =>
                    setPricing((p) =>
                      p ? { ...p, serviceFeePercent: Number(e.target.value) } : p,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peakMarkupPercent">Peak Markup %</Label>
                <Input
                  id="peakMarkupPercent"
                  type="number"
                  step="0.1"
                  value={pricing.peakMarkupPercent}
                  onChange={(e) =>
                    setPricing((p) =>
                      p ? { ...p, peakMarkupPercent: Number(e.target.value) } : p,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastMinutePercent">Last Minute %</Label>
                <Input
                  id="lastMinutePercent"
                  type="number"
                  step="0.1"
                  value={pricing.lastMinutePercent}
                  onChange={(e) =>
                    setPricing((p) =>
                      p ? { ...p, lastMinutePercent: Number(e.target.value) } : p,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tcCommissionPercent">TC Commission %</Label>
                <Input
                  id="tcCommissionPercent"
                  type="number"
                  step="0.1"
                  value={pricing.tcCommissionPercent}
                  onChange={(e) =>
                    setPricing((p) =>
                      p ? { ...p, tcCommissionPercent: Number(e.target.value) } : p,
                    )
                  }
                />
              </div>
            </div>
            <Button onClick={savePricing} disabled={pricingSaving}>
              {pricingSaving ? 'Сохранение...' : 'Сохранить pricing'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
