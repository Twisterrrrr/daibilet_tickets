import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { LoadingState, PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

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

type FeatureFlagRow = {
  key: string;
  enabled: boolean;
  description?: string | null;
  updatedAt: string;
};

type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SeoKv = {
  siteName?: string;
  defaultTitleSuffix?: string;
  defaultOgImageUrl?: string;
  twitterSite?: string;
  indexableDefault?: boolean;
};

type SystemKv = {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  showAdminDebugBanner?: boolean;
};

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
    <Button variant={variant === 'destructive' ? 'destructive' : 'outline'} onClick={onClick} disabled={loading}>
      {loading ? `${label}...` : label}
    </Button>
  );
}

export function SettingsPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagRow[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [opsLoading, setOpsLoading] = useState<string | null>(null);
  const [flushNamespace, setFlushNamespace] = useState<string>('full');
  const [pricingSaving, setPricingSaving] = useState(false);
  const [flagsSavingKey, setFlagsSavingKey] = useState<string | null>(null);
  const [userSavingId, setUserSavingId] = useState<string | null>(null);
  const [meRole, setMeRole] = useState<string | null>(null);
  const [seoKv, setSeoKv] = useState<SeoKv>({});
  const [seoUpdatedAt, setSeoUpdatedAt] = useState<string | null>(null);
  const [systemKv, setSystemKv] = useState<SystemKv>({});
  const [systemUpdatedAt, setSystemUpdatedAt] = useState<string | null>(null);
  const [seoSaving, setSeoSaving] = useState(false);
  const [systemSaving, setSystemSaving] = useState(false);

  const canEditAppKv = meRole === 'ADMIN' || meRole === 'OWNER';

  useEffect(() => {
    Promise.all([
      adminApi.get<SyncStatus>('/admin/settings/sync-status'),
      adminApi.get<PricingConfig>('/admin/settings/pricing'),
      adminApi.get<{ items: FeatureFlagRow[] }>('/admin/feature-flags'),
      adminApi.get<{ items: AdminUserRow[] }>('/admin/users'),
      adminApi.get<{ role: string }>('/auth/me').catch(() => null),
      adminApi.get<{ value: SeoKv; updatedAt: string | null }>('/admin/settings/app/seo'),
      adminApi.get<{ value: SystemKv; updatedAt: string | null }>('/admin/settings/app/system'),
    ])
      .then(([s, p, f, u, me, seo, sys]) => {
        setStatus(s);
        setPricing(p);
        setFeatureFlags(Array.isArray(f?.items) ? f.items : []);
        setAdminUsers(Array.isArray(u?.items) ? u.items : []);
        if (me?.role) setMeRole(me.role);
        setSeoKv(seo?.value && typeof seo.value === 'object' ? seo.value : {});
        setSeoUpdatedAt(seo?.updatedAt ?? null);
        setSystemKv(sys?.value && typeof sys.value === 'object' ? sys.value : {});
        setSystemUpdatedAt(sys?.updatedAt ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const runOps = async (endpoint: string, label: string, query?: Record<string, string>) => {
    setOpsLoading(label);
    try {
      const url = query ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}${new URLSearchParams(query).toString()}` : endpoint;
      const result = await adminApi.post(url);
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
      const { id: _omitId, ...data } = pricing;
      const result = await adminApi.patch('/admin/settings/pricing', data);
      setPricing(result as any);
      toast.success('Pricing сохранён');
    } catch (e: any) {
      toast.error(e.message ? `Ошибка: ${e.message}` : 'Ошибка сохранения');
    } finally {
      setPricingSaving(false);
    }
  };

  const toggleFlag = async (row: FeatureFlagRow) => {
    setFlagsSavingKey(row.key);
    try {
      const updated = await adminApi.patch<FeatureFlagRow>(`/admin/feature-flags/${encodeURIComponent(row.key)}`, {
        enabled: !row.enabled,
        description: row.description ?? undefined,
      });
      setFeatureFlags((prev) => prev.map((x) => (x.key === updated.key ? updated : x)));
      toast.success(`Флаг ${updated.key}: ${updated.enabled ? 'ON' : 'OFF'}`);
    } catch (e: any) {
      toast.error(e.message ? `Ошибка: ${e.message}` : 'Ошибка обновления feature flag');
    } finally {
      setFlagsSavingKey(null);
    }
  };

  const saveSeo = async () => {
    if (!canEditAppKv) return;
    setSeoSaving(true);
    try {
      const res = await adminApi.patch<{ value: SeoKv; updatedAt: string }>('/admin/settings/app/seo', {
        value: seoKv,
      });
      setSeoKv(res.value);
      setSeoUpdatedAt(res.updatedAt);
      toast.success('SEO настройки сохранены');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Ошибка сохранения SEO');
    } finally {
      setSeoSaving(false);
    }
  };

  const saveSystem = async () => {
    if (!canEditAppKv) return;
    setSystemSaving(true);
    try {
      const res = await adminApi.patch<{ value: SystemKv; updatedAt: string }>('/admin/settings/app/system', {
        value: systemKv,
      });
      setSystemKv(res.value);
      setSystemUpdatedAt(res.updatedAt);
      toast.success('System настройки сохранены');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Ошибка сохранения System');
    } finally {
      setSystemSaving(false);
    }
  };

  const updateAdminUser = async (row: AdminUserRow, patch: { role?: AdminUserRow['role']; isActive?: boolean }) => {
    setUserSavingId(row.id);
    try {
      const updated = await adminApi.patch<AdminUserRow>(`/admin/users/${encodeURIComponent(row.id)}`, patch);
      setAdminUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success('Пользователь обновлён');
    } catch (e: any) {
      toast.error(e.message ? `Ошибка: ${e.message}` : 'Ошибка обновления пользователя');
    } finally {
      setUserSavingId(null);
    }
  };

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleString('ru-RU') : 'никогда');

  if (loading) {
    return <LoadingState label="Загружаем настройки..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Настройки"
        subtitle="Синхронизация, цены, feature flags, SEO/System KV, пользователи"
      />

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
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={flushNamespace}
              onChange={(e) => setFlushNamespace(e.target.value)}
            >
              <option value="full">Кэш (всё)</option>
              <option value="cities">cities</option>
              <option value="events">events</option>
              <option value="catalog">catalog</option>
              <option value="tags">tags</option>
              <option value="regions">regions</option>
              <option value="landings">landings</option>
              <option value="combos">combos</option>
              <option value="search">search</option>
            </select>
            <OpsButton
              label="Flush Cache"
              loading={opsLoading === 'Flush Cache'}
              variant="destructive"
              onClick={() => runOps('/admin/settings/ops/cache/flush', 'Flush Cache', { namespace: flushNamespace })}
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
                  onChange={(e) => setPricing((p) => (p ? { ...p, serviceFeePercent: Number(e.target.value) } : p))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peakMarkupPercent">Peak Markup %</Label>
                <Input
                  id="peakMarkupPercent"
                  type="number"
                  step="0.1"
                  value={pricing.peakMarkupPercent}
                  onChange={(e) => setPricing((p) => (p ? { ...p, peakMarkupPercent: Number(e.target.value) } : p))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastMinutePercent">Last Minute %</Label>
                <Input
                  id="lastMinutePercent"
                  type="number"
                  step="0.1"
                  value={pricing.lastMinutePercent}
                  onChange={(e) => setPricing((p) => (p ? { ...p, lastMinutePercent: Number(e.target.value) } : p))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tcCommissionPercent">TC Commission %</Label>
                <Input
                  id="tcCommissionPercent"
                  type="number"
                  step="0.1"
                  value={pricing.tcCommissionPercent}
                  onChange={(e) => setPricing((p) => (p ? { ...p, tcCommissionPercent: Number(e.target.value) } : p))}
                />
              </div>
            </div>
            <Button onClick={savePricing} disabled={pricingSaving}>
              {pricingSaving ? 'Сохранение...' : 'Сохранить pricing'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SEO (KV) — canonical base URL только из ENV */}
      <Card>
        <CardHeader>
          <CardTitle>SEO (AppSetting)</CardTitle>
          <CardDescription>
            Ключ <code className="text-xs">seo</code> в KV. Базовый URL сайта не задаётся здесь (ENV).
            {seoUpdatedAt && (
              <span className="block text-xs text-muted-foreground">Обновлено: {formatDate(seoUpdatedAt)}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>siteName</Label>
              <Input
                value={seoKv.siteName ?? ''}
                disabled={!canEditAppKv}
                onChange={(e) => setSeoKv((v) => ({ ...v, siteName: e.target.value }))}
                placeholder="Дайбилет"
              />
            </div>
            <div className="space-y-2">
              <Label>defaultTitleSuffix</Label>
              <Input
                value={seoKv.defaultTitleSuffix ?? ''}
                disabled={!canEditAppKv}
                onChange={(e) => setSeoKv((v) => ({ ...v, defaultTitleSuffix: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>defaultOgImageUrl</Label>
              <Input
                value={seoKv.defaultOgImageUrl ?? ''}
                disabled={!canEditAppKv}
                onChange={(e) => setSeoKv((v) => ({ ...v, defaultOgImageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>twitterSite</Label>
              <Input
                value={seoKv.twitterSite ?? ''}
                disabled={!canEditAppKv}
                onChange={(e) => setSeoKv((v) => ({ ...v, twitterSite: e.target.value }))}
                placeholder="@daibilet"
              />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={!!seoKv.indexableDefault}
                  disabled={!canEditAppKv}
                  onChange={(e) => setSeoKv((v) => ({ ...v, indexableDefault: e.target.checked }))}
                />
                indexableDefault
              </label>
            </div>
          </div>
          <Button onClick={saveSeo} disabled={!canEditAppKv || seoSaving}>
            {seoSaving ? 'Сохранение...' : 'Сохранить SEO'}
          </Button>
          {!canEditAppKv && (
            <p className="text-xs text-muted-foreground">Редактирование: роли ADMIN или OWNER.</p>
          )}
        </CardContent>
      </Card>

      {/* System (KV) */}
      <Card>
        <CardHeader>
          <CardTitle>System (AppSetting)</CardTitle>
          <CardDescription>
            Ключ <code className="text-xs">system</code>. Флаги обслуживания и отладки.
            {systemUpdatedAt && (
              <span className="block text-xs text-muted-foreground">Обновлено: {formatDate(systemUpdatedAt)}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={!!systemKv.maintenanceMode}
              disabled={!canEditAppKv}
              onChange={(e) => setSystemKv((v) => ({ ...v, maintenanceMode: e.target.checked }))}
            />
            maintenanceMode
          </label>
          <div className="space-y-2">
            <Label>maintenanceMessage</Label>
            <Textarea
              value={systemKv.maintenanceMessage ?? ''}
              disabled={!canEditAppKv}
              onChange={(e) => setSystemKv((v) => ({ ...v, maintenanceMessage: e.target.value }))}
              rows={3}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={!!systemKv.showAdminDebugBanner}
              disabled={!canEditAppKv}
              onChange={(e) => setSystemKv((v) => ({ ...v, showAdminDebugBanner: e.target.checked }))}
            />
            showAdminDebugBanner
          </label>
          <Button onClick={saveSystem} disabled={!canEditAppKv || systemSaving}>
            {systemSaving ? 'Сохранение...' : 'Сохранить System'}
          </Button>
          {!canEditAppKv && (
            <p className="text-xs text-muted-foreground">Редактирование: роли ADMIN или OWNER.</p>
          )}
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Глобальные флаги (scope=global). Работают для UI и backend.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {featureFlags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет флагов.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">Key</th>
                    <th className="py-2 text-left font-medium">Описание</th>
                    <th className="py-2 text-left font-medium">Статус</th>
                    <th className="py-2 text-left font-medium">Updated</th>
                    <th className="py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {featureFlags.map((f) => (
                    <tr key={f.key} className="border-b last:border-b-0">
                      <td className="py-2 font-mono text-xs">{f.key}</td>
                      <td className="py-2 text-muted-foreground">{f.description || '—'}</td>
                      <td className="py-2">
                        <span className={f.enabled ? 'text-emerald-700' : 'text-slate-500'}>
                          {f.enabled ? 'ON' : 'OFF'}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">{formatDate(f.updatedAt)}</td>
                      <td className="py-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={flagsSavingKey === f.key}
                          onClick={() => toggleFlag(f)}
                        >
                          {flagsSavingKey === f.key ? 'Сохраняем...' : f.enabled ? 'Выключить' : 'Включить'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Users */}
      <Card>
        <CardHeader>
          <CardTitle>Users / Roles</CardTitle>
          <CardDescription>
            RBAC. Сброс пароля: «Забыли пароль?» на экране входа (magic link на email). Нельзя убрать последнего активного
            ADMIN/OWNER.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {adminUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет пользователей.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">Email</th>
                    <th className="py-2 text-left font-medium">Name</th>
                    <th className="py-2 text-left font-medium">Role</th>
                    <th className="py-2 text-left font-medium">Status</th>
                    <th className="py-2 text-left font-medium">Last login</th>
                    <th className="py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((u) => (
                    <tr key={u.id} className="border-b last:border-b-0">
                      <td className="py-2 font-mono text-xs">{u.email}</td>
                      <td className="py-2">{u.name}</td>
                      <td className="py-2">
                        <select
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                          value={u.role}
                          disabled={userSavingId === u.id}
                          onChange={(e) => updateAdminUser(u, { role: e.target.value as AdminUserRow['role'] })}
                        >
                          <option value="OWNER">OWNER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="EDITOR">EDITOR</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      </td>
                      <td className="py-2">
                        <span className={u.isActive ? 'text-emerald-700' : 'text-slate-500'}>
                          {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">{formatDate(u.lastLoginAt)}</td>
                      <td className="py-2 text-right">
                        <Button
                          variant={u.isActive ? 'outline' : 'default'}
                          size="sm"
                          disabled={userSavingId === u.id}
                          onClick={() => updateAdminUser(u, { isActive: !u.isActive })}
                        >
                          {userSavingId === u.id ? 'Сохраняем...' : u.isActive ? 'Деактивировать' : 'Активировать'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
