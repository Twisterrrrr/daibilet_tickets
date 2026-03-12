import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { FormActions, FormGrid, FormSection } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupplierEventsTab } from './SupplierEventsTab';

export function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [supplier, setSupplier] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const SUPPLIER_ROLES = ['OWNER', 'MANAGER', 'CONTENT', 'ACCOUNTANT'] as const;

  const load = () => {
    adminApi.get(`/admin/suppliers/${id}`).then((data: any) => {
      setSupplier(data);
      setForm({
        trustLevel: data.trustLevel,
        commissionRate: data.commissionRate,
        promoRate: data.promoRate || '',
        promoUntil: data.promoUntil ? new Date(data.promoUntil).toISOString().split('T')[0] : '',
        isActive: data.isActive,
        yookassaAccountId: data.yookassaAccountId || '',
      });
      setWebhookUrl(data.webhookUrl || '');
    });
    adminApi
      .get(`/admin/suppliers/${id}/api-keys`)
      .then((keys: any) => {
        setApiKeys(keys || []);
      })
      .catch((e) => console.error('Load API keys failed:', e));
  };

  useEffect(() => {
    load();
  }, [id]);

  const save = async () => {
    try {
      await adminApi.patch(`/admin/suppliers/${id}`, {
        ...form,
        promoRate: form.promoRate ? Number(form.promoRate) : null,
        promoUntil: form.promoUntil || null,
      });
      toast.success('Сохранено');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      await adminApi.patch(`/admin/suppliers/${id}/users/${userId}/role`, { role });
      toast.success('Роль обновлена');
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  };

  const currentTab = (searchParams.get('tab') as 'general' | 'events' | 'api') || 'general';

  if (!supplier) return <div className="animate-pulse">Загрузка...</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{supplier.companyName || supplier.name}</h1>
          <p className="text-sm text-muted-foreground">
            {supplier.contactEmail} | ИНН: {supplier.inn || '—'}
          </p>
        </div>
        <button onClick={() => navigate('/suppliers')} className="text-sm text-muted-foreground hover:underline">
          ← Назад
        </button>
      </div>

      <Card>
        <CardContent className="grid gap-4 border-0 bg-transparent p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Заказов', value: supplier.financials?.totalOrders || 0 },
            {
              label: 'Оборот',
              value: `${((supplier.financials?.grossRevenue || 0) / 100).toLocaleString('ru')} руб`,
            },
            {
              label: 'Комиссия',
              value: `${((supplier.financials?.platformFee || 0) / 100).toLocaleString('ru')} руб`,
            },
            {
              label: 'Доход поставщика',
              value: `${((supplier.financials?.supplierRevenue || 0) / 100).toLocaleString('ru')} руб`,
            },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-lg font-bold">{c.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {supplier.trust && (
        <Card>
          <CardContent className="grid gap-4 border-0 bg-transparent p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Уровень доверия</p>
              <p className="text-2xl font-bold">
                {supplier.trust.level} уровень{' '}
                <span className="text-sm font-medium text-muted-foreground">
                  ({supplier.trust.score}/100)
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Последний пересчёт:{' '}
                {supplier.trust.lastCalculatedAt
                  ? new Date(supplier.trust.lastCalculatedAt).toLocaleString('ru')
                  : 'нет данных'}
              </p>
              {supplier.trust.manualOverrideLevel != null && (
                <p className="text-xs text-amber-700">
                  Ручной override до уровня {supplier.trust.manualOverrideLevel}
                  {supplier.trust.manualOverrideExpiresAt && (
                    <> до {new Date(supplier.trust.manualOverrideExpiresAt).toLocaleDateString('ru')}</>
                  )}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Разложение по блокам</p>
              <ul className="space-y-0.5 text-sm text-muted-foreground">
                <li>Профиль: {supplier.trust.profile}</li>
                <li>Каталог: {supplier.trust.catalog}</li>
                <li>Операции: {supplier.trust.operations}</li>
                <li>Репутация: {supplier.trust.reputation}</li>
                <li>Стабильность: {supplier.trust.stability}</li>
                <li>Штрафы: {supplier.trust.penalties}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs
        value={currentTab}
        onValueChange={(value) => {
          const p = new URLSearchParams(searchParams);
          if (value === 'general') {
            p.delete('tab');
          } else {
            p.set('tab', value);
          }
          setSearchParams(p);
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="general">Общее</TabsTrigger>
          <TabsTrigger value="events">События</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <FormSection
            title="Настройки поставщика"
            description="Комиссия, trust-уровень и статус поставщика"
          >
            <FormGrid>
              <div>
                <label className="mb-1 block text-sm font-medium">Trust Level</label>
                <select
                  value={form.trustLevel}
                  onChange={(e) => setForm({ ...form, trustLevel: Number(e.target.value) })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value={0}>0 — Новый</option>
                  <option value={1}>1 — Базовый</option>
                  <option value={2}>2 — Проверенный</option>
                  <option value={3}>3 — Надёжный</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Комиссия (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={(Number(form.commissionRate) * 100).toFixed(0)}
                  onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) / 100 })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Промо ставка (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.promoRate ? (Number(form.promoRate) * 100).toFixed(0) : ''}
                  onChange={(e) => setForm({ ...form, promoRate: e.target.value ? Number(e.target.value) / 100 : '' })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Пусто = нет промо"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Промо до</label>
                <input
                  type="date"
                  value={form.promoUntil}
                  onChange={(e) => setForm({ ...form, promoUntil: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">YooKassa Account ID</label>
                <input
                  value={form.yookassaAccountId}
                  onChange={(e) => setForm({ ...form, yookassaAccountId: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Для split-платежей"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <span className="text-sm">Активен</span>
                </label>
              </div>
            </FormGrid>
            <FormActions
              primary={
                <button
                  type="button"
                  onClick={save}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
                >
                  Сохранить
                </button>
              }
            />
          </FormSection>

          <FormSection
            title="Пользователи"
            description="Доступы сотрудников поставщика к личному кабинету"
          >
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2">Имя</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-center py-2">Роль</th>
                  <th className="text-center py-2">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {supplier.supplierUsers?.map((u: any) => (
                  <tr key={u.id}>
                    <td className="py-2">{u.name}</td>
                    <td className="py-2 text-muted-foreground">{u.email}</td>
                    <td className="py-2 text-center">
                      <select
                        className="border rounded px-2 py-1 text-xs bg-background"
                        value={u.role}
                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                      >
                        {SUPPLIER_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 text-center">{u.isActive ? '✓' : '✗'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </TabsContent>

        <TabsContent value="events">
          <SupplierEventsTab supplierId={id!} />
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="font-semibold">API Интеграция</h2>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">API-ключи</h3>

              {apiKeys.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2">Префикс</th>
                      <th className="text-left py-2">Имя</th>
                      <th className="text-center py-2">Активен</th>
                      <th className="text-left py-2">Последнее использование</th>
                      <th className="text-center py-2">Лимит/мин</th>
                      <th className="text-right py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {apiKeys.map((k: any) => (
                      <tr key={k.id}>
                        <td className="py-2 font-mono text-xs">{k.prefix}...</td>
                        <td className="py-2">{k.name}</td>
                        <td className="py-2 text-center">{k.isActive ? '✓' : '✗'}</td>
                        <td className="py-2 text-muted-foreground text-xs">
                          {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('ru') : 'никогда'}
                        </td>
                        <td className="py-2 text-center">{k.rateLimit}</td>
                        <td className="py-2 text-right">
                          {k.isActive && (
                            <button
                              onClick={async () => {
                                try {
                                  await adminApi.delete(`/admin/suppliers/${id}/api-keys/${k.id}`);
                                  toast.success('Ключ деактивирован');
                                  load();
                                } catch (err: unknown) {
                                  toast.error(err instanceof Error ? err.message : String(err));
                                }
                              }}
                              className="text-xs text-destructive hover:underline"
                            >
                              Отозвать
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {apiKeys.length === 0 && <p className="text-sm text-muted-foreground">Нет API-ключей</p>}

              <div className="flex items-end gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Имя ключа</label>
                  <input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm w-48"
                    placeholder="production"
                  />
                </div>
                <button
                  onClick={async () => {
                    try {
                      const result = await adminApi.post(`/admin/suppliers/${id}/api-keys`, {
                        name: newKeyName || 'default',
                      });
                      setNewKeyResult((result as any).key);
                      setNewKeyName('');
                      toast.success('API-ключ создан');
                      load();
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : String(err));
                    }
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90"
                >
                  Сгенерировать ключ
                </button>
              </div>

              {newKeyResult && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Сохраните ключ — он не будет показан повторно:
                  </p>
                  <code className="block bg-white dark:bg-gray-900 p-2 rounded text-xs font-mono break-all select-all">
                    {newKeyResult}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newKeyResult);
                      toast.success('Скопировано');
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Копировать
                  </button>
                  <button
                    onClick={() => setNewKeyResult(null)}
                    className="text-xs text-muted-foreground hover:underline ml-4"
                  >
                    Скрыть
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground">Webhook</h3>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">Webhook URL</label>
                  <input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="https://partner.example.com/webhook"
                  />
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await adminApi.patch(`/admin/suppliers/${id}/webhook`, { webhookUrl });
                      toast.success('Webhook сохранён');
                      if ((res as any).webhookSecret) {
                        toast.info(`Secret: ${(res as any).webhookSecret.slice(0, 12)}...`);
                      }
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : String(err));
                    }
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90"
                >
                  Сохранить
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await adminApi.patch(`/admin/suppliers/${id}/webhook`, { regenerateSecret: true });
                      toast.success('Секрет обновлён: ' + (res as any).webhookSecret?.slice(0, 12) + '...');
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : String(err));
                    }
                  }}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-muted"
                >
                  Обновить секрет
                </button>
              </div>
              {supplier.webhookUrl && (
                <p className="text-xs text-muted-foreground">
                  Текущий URL: <span className="font-mono">{supplier.webhookUrl}</span>
                </p>
              )}
              {supplier.webhookSecret && (
                <p className="text-xs text-muted-foreground">
                  Секрет: <span className="font-mono">{supplier.webhookSecret?.slice(0, 12)}...</span>
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
