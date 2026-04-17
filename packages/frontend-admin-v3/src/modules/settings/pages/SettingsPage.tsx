import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import {
  fetchAdminFeatureFlags,
  fetchAdminSeoSettings,
  fetchAdminSystemSettings,
  patchAdminFeatureFlag,
  patchAdminSeoSettings,
  patchAdminSystemSettings,
  type FeatureFlagRow,
  type SeoSettingsValue,
  type SystemSettingsValue,
} from '@/modules/settings/api/settings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

export function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<'flags' | 'seo' | 'system'>('flags');

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

  const [seoDraft, setSeoDraft] = React.useState<SeoSettingsValue>({});
  React.useEffect(() => {
    if (seoQ.data?.value) setSeoDraft(seoQ.data.value);
  }, [seoQ.data?.value]);

  const [systemDraft, setSystemDraft] = React.useState<SystemSettingsValue>({});
  React.useEffect(() => {
    if (systemQ.data?.value) setSystemDraft(systemQ.data.value);
  }, [systemQ.data?.value]);

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

  if (flagsQ.isLoading && !flagsQ.data) return <LoadingState label="Загрузка настроек…" />;

  const errFlags = flagsQ.error ? getAdminErrorDisplay(flagsQ.error) : null;
  const errSeo = seoQ.error ? getAdminErrorDisplay(seoQ.error) : null;
  const errSystem = systemQ.error ? getAdminErrorDisplay(systemQ.error) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Настройки" subtitle="Feature flags и системные параметры приложения" />

      <div className="flex flex-wrap gap-1 border-b pb-2">
        <Button type="button" size="sm" variant={tab === 'flags' ? 'secondary' : 'ghost'} onClick={() => setTab('flags')}>
          Feature flags
        </Button>
        <Button type="button" size="sm" variant={tab === 'seo' ? 'secondary' : 'ghost'} onClick={() => setTab('seo')}>
          SEO
        </Button>
        <Button type="button" size="sm" variant={tab === 'system' ? 'secondary' : 'ghost'} onClick={() => setTab('system')}>
          System
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => { void flagsQ.refetch(); void seoQ.refetch(); void systemQ.refetch(); }}>
            Обновить
          </Button>
        </div>
      </div>

      {tab === 'flags' ? (
        flagsQ.isError ? (
          <ErrorState title={errFlags?.title ?? 'Не удалось загрузить feature flags'} description={errFlags?.description ?? errFlags?.rawMessage} onRetry={() => flagsQ.refetch()} />
        ) : (
          <FeatureFlagsPanel items={flagsQ.data ?? []} />
        )
      ) : null}

      {tab === 'seo' ? (
        seoQ.isLoading && !seoQ.data ? (
          <LoadingState label="Загрузка SEO настроек…" />
        ) : seoQ.isError ? (
          <ErrorState title={errSeo?.title ?? 'Не удалось загрузить SEO'} description={errSeo?.description ?? errSeo?.rawMessage} onRetry={() => seoQ.refetch()} />
        ) : (
          <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
            <div className="text-sm font-medium">SEO настройки</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">siteName</span>
                <Input value={seoDraft.siteName ?? ''} onChange={(e) => setSeoDraft((p) => ({ ...p, siteName: e.target.value || undefined }))} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">defaultTitleSuffix</span>
                <Input value={seoDraft.defaultTitleSuffix ?? ''} onChange={(e) => setSeoDraft((p) => ({ ...p, defaultTitleSuffix: e.target.value || undefined }))} />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-muted-foreground">defaultOgImageUrl</span>
                <Input value={seoDraft.defaultOgImageUrl ?? ''} onChange={(e) => setSeoDraft((p) => ({ ...p, defaultOgImageUrl: e.target.value || undefined }))} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">twitterSite</span>
                <Input value={seoDraft.twitterSite ?? ''} onChange={(e) => setSeoDraft((p) => ({ ...p, twitterSite: e.target.value || undefined }))} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(seoDraft.indexableDefault)}
                  onChange={(e) => setSeoDraft((p) => ({ ...p, indexableDefault: e.target.checked }))}
                />
                indexableDefault
              </label>
            </div>

            {saveSeoM.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveSeoM.error instanceof Error ? saveSeoM.error.message : 'Ошибка сохранения'}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSeoDraft(seoQ.data?.value ?? {})} disabled={saveSeoM.isPending}>
                Сброс
              </Button>
              <Button type="button" onClick={() => saveSeoM.mutate()} disabled={saveSeoM.isPending}>
                {saveSeoM.isPending ? 'Сохранение…' : 'Сохранить'}
              </Button>
            </div>
          </section>
        )
      ) : null}

      {tab === 'system' ? (
        systemQ.isLoading && !systemQ.data ? (
          <LoadingState label="Загрузка System настроек…" />
        ) : systemQ.isError ? (
          <ErrorState title={errSystem?.title ?? 'Не удалось загрузить System'} description={errSystem?.description ?? errSystem?.rawMessage} onRetry={() => systemQ.refetch()} />
        ) : (
          <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
            <div className="text-sm font-medium">System настройки</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(systemDraft.maintenanceMode)}
                  onChange={(e) => setSystemDraft((p) => ({ ...p, maintenanceMode: e.target.checked }))}
                />
                maintenanceMode
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(systemDraft.showAdminDebugBanner)}
                  onChange={(e) => setSystemDraft((p) => ({ ...p, showAdminDebugBanner: e.target.checked }))}
                />
                showAdminDebugBanner
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-muted-foreground">maintenanceMessage</span>
                <textarea
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={systemDraft.maintenanceMessage ?? ''}
                  onChange={(e) =>
                    setSystemDraft((p) => ({ ...p, maintenanceMessage: e.target.value || undefined }))
                  }
                />
              </label>
            </div>

            {saveSystemM.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveSystemM.error instanceof Error ? saveSystemM.error.message : 'Ошибка сохранения'}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSystemDraft(systemQ.data?.value ?? {})} disabled={saveSystemM.isPending}>
                Сброс
              </Button>
              <Button type="button" onClick={() => saveSystemM.mutate()} disabled={saveSystemM.isPending}>
                {saveSystemM.isPending ? 'Сохранение…' : 'Сохранить'}
              </Button>
            </div>
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
      <section className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
        Нет feature flags (или нет прав на просмотр).
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
      <div className="text-sm font-medium">Feature flags</div>
      {saveOneM.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {saveOneM.error instanceof Error ? saveOneM.error.message : 'Ошибка сохранения'}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Key</th>
              <th className="px-3 py-2">Enabled</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right">Actions</th>
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
                      {d.enabled ? 'on' : 'off'}
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={d.description}
                      onChange={(e) => setDrafts((p) => ({ ...p, [f.key]: { ...d, description: e.target.value } }))}
                      placeholder="Опционально: комментарий/описание"
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
      </div>
    </section>
  );
}

