import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { TableHorizontalScroll } from '@/components/shared/table/TableHorizontalScroll';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import {
  fetchAdminFeatureFlags,
  fetchAdminPricing,
  fetchAdminSeoSettings,
  fetchAdminSyncStatus,
  fetchAdminSystemSettings,
  fetchAdminUsers,
  fetchAuthMe,
  patchAdminFeatureFlag,
  patchAdminPricing,
  patchAdminSeoSettings,
  patchAdminSystemSettings,
  patchAdminUser,
  postAdminSettingsOp,
  type AdminUserRow,
  type FeatureFlagRow,
  type PricingConfig,
  type SeoSettingsValue,
  type SystemSettingsValue,
} from '@/modules/settings/api/settings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

type SettingsTab = 'sync' | 'flags' | 'seo' | 'system' | 'users';

/** Подписи операций (и для сравнения с состоянием загрузки). */
const OP_LABEL = {
  fullSync: 'Полная синхронизация',
  incrSync: 'Инкрементальная синхронизация',
  retag: 'Перетегирование',
  populateCombos: 'Заполнение комбинаций',
  flushCache: 'Сброс кэша',
} as const;

function formatDate(d: string | null) {
  return d ? new Date(d).toLocaleString('ru-RU') : 'никогда';
}

export function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<SettingsTab>('sync');

  const meQ = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => fetchAuthMe(),
    staleTime: 60_000,
    retry: false,
  });

  const syncQ = useQuery({
    queryKey: ['admin-settings-sync-status'],
    queryFn: () => fetchAdminSyncStatus(),
    staleTime: 15_000,
  });

  const pricingQ = useQuery({
    queryKey: ['admin-settings-pricing'],
    queryFn: () => fetchAdminPricing(),
    staleTime: 30_000,
  });

  const usersQ = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => fetchAdminUsers().then((r) => r.items ?? []),
    staleTime: 30_000,
  });

  const flagsQ = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: () => fetchAdminFeatureFlags().then((r) => r.items ?? []),
    staleTime: 30_000,
  });

  const seoQ = useQuery({
    queryKey: ['admin-app-settings', 'seo'],
    queryFn: () => fetchAdminSeoSettings(),
    staleTime: 30_000,
  });

  const systemQ = useQuery({
    queryKey: ['admin-app-settings', 'system'],
    queryFn: () => fetchAdminSystemSettings(),
    staleTime: 30_000,
  });

  const [pricingDraft, setPricingDraft] = React.useState<PricingConfig | null>(null);
  React.useEffect(() => {
    if (pricingQ.data) setPricingDraft(pricingQ.data);
  }, [pricingQ.data]);

  const [seoDraft, setSeoDraft] = React.useState<SeoSettingsValue>({});
  React.useEffect(() => {
    if (seoQ.data?.value) setSeoDraft(seoQ.data.value);
  }, [seoQ.data?.value]);

  const [systemDraft, setSystemDraft] = React.useState<SystemSettingsValue>({});
  React.useEffect(() => {
    if (systemQ.data?.value) setSystemDraft(systemQ.data.value);
  }, [systemQ.data?.value]);

  const role = meQ.data?.role;
  const canEditAppKv = role === 'ADMIN' || role === 'OWNER';

  const saveSeoM = useMutation({
    mutationFn: () => patchAdminSeoSettings(seoDraft),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-app-settings', 'seo'] });
    },
  });

  const saveSystemM = useMutation({
    mutationFn: () => patchAdminSystemSettings(systemDraft),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-app-settings', 'system'] });
    },
  });

  const savePricingM = useMutation({
    mutationFn: () => {
      if (!pricingDraft) throw new Error('Нет данных о ценах');
      const { id: _id, ...rest } = pricingDraft;
      return patchAdminPricing(rest);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-settings-pricing'] });
    },
  });

  const patchUserM = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { role?: AdminUserRow['role']; isActive?: boolean } }) =>
      patchAdminUser(id, patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const [opsLoading, setOpsLoading] = React.useState<string | null>(null);
  const [opsFeedback, setOpsFeedback] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [flushNamespace, setFlushNamespace] = React.useState('full');

  const runOp = async (
    path: string,
    label: string,
    opts?: { query?: Record<string, string>; confirm?: string },
  ) => {
    if (opts?.confirm && !window.confirm(opts.confirm)) return;
    setOpsFeedback(null);
    setOpsLoading(label);
    try {
      const r = await postAdminSettingsOp(path, opts?.query);
      setOpsFeedback({ ok: true, text: r.message ?? `${label}: выполнено` });
      await qc.invalidateQueries({ queryKey: ['admin-settings-sync-status'] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка операции';
      setOpsFeedback({ ok: false, text: msg });
    } finally {
      setOpsLoading(null);
    }
  };

  const refreshAll = () => {
    void meQ.refetch();
    void syncQ.refetch();
    void pricingQ.refetch();
    void usersQ.refetch();
    void flagsQ.refetch();
    void seoQ.refetch();
    void systemQ.refetch();
  };

  const errFlags = flagsQ.error ? getAdminErrorDisplay(flagsQ.error) : null;
  const errSeo = seoQ.error ? getAdminErrorDisplay(seoQ.error) : null;
  const errSystem = systemQ.error ? getAdminErrorDisplay(systemQ.error) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Настройки"
        subtitle="Инфраструктура, флаги, мета-теги и система, пользователи"
      />

      <div className="flex flex-wrap gap-1 border-b pb-2">
        <Button type="button" size="sm" variant={tab === 'sync' ? 'secondary' : 'ghost'} onClick={() => setTab('sync')}>
          Инфраструктура
        </Button>
        <Button type="button" size="sm" variant={tab === 'flags' ? 'secondary' : 'ghost'} onClick={() => setTab('flags')}>
          Флаги
        </Button>
        <Button type="button" size="sm" variant={tab === 'seo' ? 'secondary' : 'ghost'} onClick={() => setTab('seo')}>
          Мета и поиск
        </Button>
        <Button type="button" size="sm" variant={tab === 'system' ? 'secondary' : 'ghost'} onClick={() => setTab('system')}>
          Система
        </Button>
        <Button type="button" size="sm" variant={tab === 'users' ? 'secondary' : 'ghost'} onClick={() => setTab('users')}>
          Пользователи
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void refreshAll()}>
            Обновить
          </Button>
        </div>
      </div>

      {tab === 'sync' ? (
        <div className="space-y-6">
          {opsFeedback ? (
            <div
              className={
                opsFeedback.ok
                  ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100'
                  : 'rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'
              }
            >
              {opsFeedback.text}
            </div>
          ) : null}

          {syncQ.isLoading && !syncQ.data ? (
            <LoadingState label="Загрузка статуса синхронизации…" />
          ) : syncQ.isError ? (
            <ErrorState
              title="Не удалось загрузить статус"
              description={syncQ.error instanceof Error ? syncQ.error.message : 'Ошибка'}
              onRetry={() => syncQ.refetch()}
            />
          ) : (
            <>
            <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
              <div>
                <div className="text-sm font-medium">Статус синхронизации</div>
                <p className="text-xs text-muted-foreground">Состояние данных из внешних источников</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Последняя синхронизация</span>
                  <p className="font-medium">{formatDate(syncQ.data?.lastSyncAt ?? null)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">События</span>
                  <p className="font-medium">
                    {syncQ.data?.events.active ?? 0} / {syncQ.data?.events.total ?? 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Сессии</span>
                  <p className="font-medium">
                    {syncQ.data?.sessions.active ?? 0} / {syncQ.data?.sessions.total ?? 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Последний сброс кэша</span>
                  <p className="font-medium">{formatDate(syncQ.data?.ops?.lastCacheFlush ?? null)}</p>
                </div>
              </div>
              {syncQ.data?.ops ? (
                <div className="grid gap-2 border-t pt-3 text-xs text-muted-foreground sm:grid-cols-2 md:grid-cols-4">
                  <p>Полная синхронизация: {formatDate(syncQ.data.ops.lastFullSyncAt)}</p>
                  <p>Инкрементальная: {formatDate(syncQ.data.ops.lastIncrSyncAt)}</p>
                  <p>Перетегирование: {formatDate(syncQ.data.ops.lastRetagAt)}</p>
                  <p>Заполнение комбинаций: {formatDate(syncQ.data.ops.lastPopulateAt)}</p>
                </div>
              ) : null}
              {syncQ.data?.ops?.lastError ? (
                <p className="text-sm text-destructive">Последняя ошибка: {syncQ.data.ops.lastError}</p>
              ) : null}
            </section>

            <section className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-5 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="mb-3">
                <div className="text-sm font-medium">Операции</div>
                <p className="text-xs text-muted-foreground">Синхронизация и служебные задачи. Опасные действия требуют подтверждения.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(opsLoading)}
                  onClick={() =>
                    runOp('/admin/settings/ops/sync/full', OP_LABEL.fullSync, {
                      confirm: 'Запустить полную синхронизацию?',
                    })
                  }
                >
                  {opsLoading === OP_LABEL.fullSync ? '…' : OP_LABEL.fullSync}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(opsLoading)}
                  onClick={() => runOp('/admin/settings/ops/sync/incremental', OP_LABEL.incrSync)}
                >
                  {opsLoading === OP_LABEL.incrSync ? '…' : OP_LABEL.incrSync}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(opsLoading)}
                  onClick={() => runOp('/admin/settings/ops/retag', OP_LABEL.retag)}
                >
                  {opsLoading === OP_LABEL.retag ? '…' : OP_LABEL.retag}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(opsLoading)}
                  onClick={() => runOp('/admin/settings/ops/populate-combos', OP_LABEL.populateCombos)}
                >
                  {opsLoading === OP_LABEL.populateCombos ? '…' : OP_LABEL.populateCombos}
                </Button>
                <select
                  className="h-9 max-w-[11rem] rounded-md border border-input bg-background px-3 text-sm"
                  value={flushNamespace}
                  onChange={(e) => setFlushNamespace(e.target.value)}
                  aria-label="Область сброса кэша"
                >
                  <option value="full">Весь кэш</option>
                  <option value="cities">Города</option>
                  <option value="events">События</option>
                  <option value="catalog">Каталог</option>
                  <option value="tags">Теги</option>
                  <option value="regions">Регионы</option>
                  <option value="landings">Лендинги</option>
                  <option value="combos">Комбинации</option>
                  <option value="search">Поиск</option>
                </select>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={Boolean(opsLoading)}
                  onClick={() =>
                    runOp('/admin/settings/ops/cache/flush', OP_LABEL.flushCache, {
                      query: { namespace: flushNamespace },
                      confirm: 'Сбросить кэш для выбранной области?',
                    })
                  }
                >
                  {opsLoading === OP_LABEL.flushCache ? '…' : OP_LABEL.flushCache}
                </Button>
              </div>
            </section>
            </>
          )}

          {pricingQ.isLoading && !pricingQ.data ? (
            <LoadingState label="Загрузка параметров ценообразования…" />
          ) : pricingQ.isError ? (
            <ErrorState
              title="Не удалось загрузить параметры цен"
              description={pricingQ.error instanceof Error ? pricingQ.error.message : 'Ошибка'}
              onRetry={() => pricingQ.refetch()}
            />
          ) : pricingDraft ? (
            <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
              <div>
                <div className="text-sm font-medium">Ценообразование</div>
                <p className="text-xs text-muted-foreground">Проценты наценок и комиссий (системная конфигурация)</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Сервисный сбор (%)</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={pricingDraft.serviceFeePercent}
                    onChange={(e) =>
                      setPricingDraft((p) => (p ? { ...p, serviceFeePercent: Number(e.target.value) } : p))
                    }
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Пиковая наценка (%)</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={pricingDraft.peakMarkupPercent}
                    onChange={(e) =>
                      setPricingDraft((p) => (p ? { ...p, peakMarkupPercent: Number(e.target.value) } : p))
                    }
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Наценка «в последний момент» (%)</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={pricingDraft.lastMinutePercent}
                    onChange={(e) =>
                      setPricingDraft((p) => (p ? { ...p, lastMinutePercent: Number(e.target.value) } : p))
                    }
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Комиссия агрегатора (%)</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={pricingDraft.tcCommissionPercent}
                    onChange={(e) =>
                      setPricingDraft((p) => (p ? { ...p, tcCommissionPercent: Number(e.target.value) } : p))
                    }
                  />
                </label>
              </div>
              {savePricingM.isError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {savePricingM.error instanceof Error ? savePricingM.error.message : 'Ошибка сохранения'}
                </div>
              ) : null}
              <div className="flex justify-end">
                <Button type="button" onClick={() => savePricingM.mutate()} disabled={savePricingM.isPending}>
                  {savePricingM.isPending ? 'Сохранение…' : 'Сохранить'}
                </Button>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === 'flags' ? (
        flagsQ.isLoading && !flagsQ.data ? (
          <LoadingState label="Загрузка флагов…" />
        ) : flagsQ.isError ? (
          <ErrorState
            title={errFlags?.title ?? 'Не удалось загрузить флаги'}
            description={errFlags?.description ?? errFlags?.rawMessage}
            onRetry={() => flagsQ.refetch()}
          />
        ) : (
          <FeatureFlagsPanel items={flagsQ.data ?? []} />
        )
      ) : null}

      {tab === 'seo' ? (
        seoQ.isLoading && !seoQ.data ? (
          <LoadingState label="Загрузка мета-тегов…" />
        ) : seoQ.isError ? (
          <ErrorState
            title={errSeo?.title ?? 'Не удалось загрузить настройки для поиска'}
            description={errSeo?.description ?? errSeo?.rawMessage}
            onRetry={() => seoQ.refetch()}
          />
        ) : (
          <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-sm font-medium">Мета-теги и сниппеты</div>
              {seoQ.data?.updatedAt ? (
                <span className="text-xs text-muted-foreground">Обновлено: {formatDate(seoQ.data.updatedAt)}</span>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Название сайта</span>
                <Input
                  value={seoDraft.siteName ?? ''}
                  disabled={!canEditAppKv}
                  onChange={(e) => setSeoDraft((p) => ({ ...p, siteName: e.target.value || undefined }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Суффикс заголовка по умолчанию</span>
                <Input
                  value={seoDraft.defaultTitleSuffix ?? ''}
                  disabled={!canEditAppKv}
                  onChange={(e) => setSeoDraft((p) => ({ ...p, defaultTitleSuffix: e.target.value || undefined }))}
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-muted-foreground">Картинка превью по умолчанию (для соцсетей, URL)</span>
                <Input
                  value={seoDraft.defaultOgImageUrl ?? ''}
                  disabled={!canEditAppKv}
                  onChange={(e) => setSeoDraft((p) => ({ ...p, defaultOgImageUrl: e.target.value || undefined }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Аккаунт в соцсети X (например @сайт)</span>
                <Input
                  value={seoDraft.twitterSite ?? ''}
                  disabled={!canEditAppKv}
                  onChange={(e) => setSeoDraft((p) => ({ ...p, twitterSite: e.target.value || undefined }))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(seoDraft.indexableDefault)}
                  disabled={!canEditAppKv}
                  onChange={(e) => setSeoDraft((p) => ({ ...p, indexableDefault: e.target.checked }))}
                />
                Индексация страниц по умолчанию
              </label>
            </div>
            {!canEditAppKv ? (
              <p className="text-xs text-muted-foreground">Редактирование доступно ролям «Администратор» и «Владелец».</p>
            ) : null}
            {saveSeoM.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveSeoM.error instanceof Error ? saveSeoM.error.message : 'Ошибка сохранения'}
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSeoDraft(seoQ.data?.value ?? {})}
                disabled={saveSeoM.isPending || !canEditAppKv}
              >
                Сброс
              </Button>
              <Button type="button" onClick={() => saveSeoM.mutate()} disabled={saveSeoM.isPending || !canEditAppKv}>
                {saveSeoM.isPending ? 'Сохранение…' : 'Сохранить'}
              </Button>
            </div>
          </section>
        )
      ) : null}

      {tab === 'system' ? (
        systemQ.isLoading && !systemQ.data ? (
          <LoadingState label="Загрузка системных настроек…" />
        ) : systemQ.isError ? (
          <ErrorState
            title={errSystem?.title ?? 'Не удалось загрузить системные настройки'}
            description={errSystem?.description ?? errSystem?.rawMessage}
            onRetry={() => systemQ.refetch()}
          />
        ) : (
          <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-sm font-medium">Системные параметры</div>
              {systemQ.data?.updatedAt ? (
                <span className="text-xs text-muted-foreground">Обновлено: {formatDate(systemQ.data.updatedAt)}</span>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(systemDraft.maintenanceMode)}
                  disabled={!canEditAppKv}
                  onChange={(e) => setSystemDraft((p) => ({ ...p, maintenanceMode: e.target.checked }))}
                />
                Режим обслуживания
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(systemDraft.showAdminDebugBanner)}
                  disabled={!canEditAppKv}
                  onChange={(e) => setSystemDraft((p) => ({ ...p, showAdminDebugBanner: e.target.checked }))}
                />
                Отладочная плашка в админке
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-muted-foreground">Текст при режиме обслуживания</span>
                <textarea
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                  value={systemDraft.maintenanceMessage ?? ''}
                  disabled={!canEditAppKv}
                  onChange={(e) =>
                    setSystemDraft((p) => ({ ...p, maintenanceMessage: e.target.value || undefined }))
                  }
                />
              </label>
            </div>
            {!canEditAppKv ? (
              <p className="text-xs text-muted-foreground">Редактирование доступно ролям «Администратор» и «Владелец».</p>
            ) : null}
            {saveSystemM.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveSystemM.error instanceof Error ? saveSystemM.error.message : 'Ошибка сохранения'}
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSystemDraft(systemQ.data?.value ?? {})}
                disabled={saveSystemM.isPending || !canEditAppKv}
              >
                Сброс
              </Button>
              <Button type="button" onClick={() => saveSystemM.mutate()} disabled={saveSystemM.isPending || !canEditAppKv}>
                {saveSystemM.isPending ? 'Сохранение…' : 'Сохранить'}
              </Button>
            </div>
          </section>
        )
      ) : null}

      {tab === 'users' ? (
        usersQ.isLoading && !usersQ.data ? (
          <LoadingState variant="table" label="Загрузка пользователей…" />
        ) : usersQ.isError ? (
          <ErrorState
            title="Не удалось загрузить пользователей"
            description={usersQ.error instanceof Error ? usersQ.error.message : 'Ошибка'}
            onRetry={() => usersQ.refetch()}
          />
        ) : (
          <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
            <div>
              <div className="text-sm font-medium">Пользователи и роли</div>
              <p className="text-xs text-muted-foreground">
                Роли и доступ. Сброс пароля — через «Забыли пароль?» на экране входа.
              </p>
            </div>
            {patchUserM.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {patchUserM.error instanceof Error ? patchUserM.error.message : 'Ошибка сохранения'}
              </div>
            ) : null}
            <TableHorizontalScroll>
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Почта</th>
                    <th className="px-3 py-2">Имя</th>
                    <th className="px-3 py-2">Роль</th>
                    <th className="px-3 py-2">Статус</th>
                    <th className="px-3 py-2">Последний вход</th>
                    <th className="px-3 py-2 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {(usersQ.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                        Нет пользователей
                      </td>
                    </tr>
                  ) : (
                    (usersQ.data ?? []).map((u) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                        <td className="px-3 py-2">{u.name}</td>
                        <td className="px-3 py-2">
                          <select
                            className="h-9 max-w-[9rem] rounded-md border border-input bg-background px-2 text-xs"
                            value={u.role}
                            disabled={patchUserM.isPending}
                            onChange={(e) =>
                              patchUserM.mutate({
                                id: u.id,
                                patch: { role: e.target.value as AdminUserRow['role'] },
                              })
                            }
                          >
                            <option value="OWNER">Владелец</option>
                            <option value="ADMIN">Администратор</option>
                            <option value="EDITOR">Редактор</option>
                            <option value="VIEWER">Наблюдатель</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <span className={u.isActive ? 'text-emerald-700' : 'text-muted-foreground'}>
                            {u.isActive ? 'Активен' : 'Отключён'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{formatDate(u.lastLoginAt)}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant={u.isActive ? 'outline' : 'default'}
                            disabled={patchUserM.isPending}
                            onClick={() => patchUserM.mutate({ id: u.id, patch: { isActive: !u.isActive } })}
                          >
                            {u.isActive ? 'Деактивировать' : 'Активировать'}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableHorizontalScroll>
          </section>
        )
      ) : null}
    </div>
  );
}

function FeatureFlagsPanel({ items }: { items: FeatureFlagRow[] }) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = React.useState<Record<string, { enabled: boolean; description: string }>>({});

  React.useEffect(() => {
    const next: Record<string, { enabled: boolean; description: string }> = {};
    for (const f of items) {
      next[f.key] = { enabled: Boolean(f.enabled), description: f.description ?? '' };
    }
    setDrafts(next);
  }, [items]);

  const saveOneM = useMutation({
    mutationFn: async ({ key, enabled, description }: { key: string; enabled: boolean; description?: string }) => {
      return patchAdminFeatureFlag(key, { enabled, ...(description !== undefined ? { description } : {}) });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-feature-flags'] });
    },
  });

  if (items.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-5 space-y-2 text-sm text-muted-foreground">
        <p>
          В базе пока нет <strong className="text-foreground">глобальных</strong> флагов (зона в данных —{' '}
          <code className="rounded bg-muted px-1 text-xs">global</code>).
        </p>
        <p className="text-xs">
          Для локальной среды выполните сидирование БД или добавьте ключи через API админки. Изменение значений — у роли
          «Администратор».
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
      <div className="text-sm font-medium">Флаги возможностей</div>
      {saveOneM.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {saveOneM.error instanceof Error ? saveOneM.error.message : 'Ошибка сохранения'}
        </div>
      ) : null}
      <TableHorizontalScroll>
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Ключ</th>
              <th className="px-3 py-2">Вкл.</th>
              <th className="px-3 py-2">Описание</th>
              <th className="px-3 py-2 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((f) => {
              const d = drafts[f.key] ?? { enabled: Boolean(f.enabled), description: f.description ?? '' };
              const dirty = d.enabled !== Boolean(f.enabled) || d.description !== (f.description ?? '');
              return (
                <tr key={f.key} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{f.key}</td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(d.enabled)}
                        onChange={(e) =>
                          setDrafts((p) => ({ ...p, [f.key]: { ...d, enabled: e.target.checked } }))
                        }
                      />
                      {d.enabled ? 'да' : 'нет'}
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <label htmlFor={`ff-desc-${f.key}`} className="sr-only">
                      {`Описание для ${f.key}`}
                    </label>
                    <Input
                      id={`ff-desc-${f.key}`}
                      value={d.description}
                      onChange={(e) => setDrafts((p) => ({ ...p, [f.key]: { ...d, description: e.target.value } }))}
                      placeholder="Комментарий (необязательно)"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!dirty || saveOneM.isPending}
                        onClick={() =>
                          saveOneM.mutate({
                            key: f.key,
                            enabled: d.enabled,
                            description: d.description.trim() || undefined,
                          })
                        }
                      >
                        {saveOneM.isPending ? '…' : 'Сохранить'}
                      </Button>
                      {dirty ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={saveOneM.isPending}
                          onClick={() =>
                            setDrafts((p) => ({
                              ...p,
                              [f.key]: { enabled: Boolean(f.enabled), description: f.description ?? '' },
                            }))
                          }
                        >
                          Сброс
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableHorizontalScroll>
    </section>
  );
}
