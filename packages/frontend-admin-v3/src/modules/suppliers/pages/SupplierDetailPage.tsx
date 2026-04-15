import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import { fetchAdminSupplier, patchAdminSupplier, type AdminSupplierDetail } from '@/modules/suppliers/api/suppliers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

type TabId =
  | 'main'
  | 'catalog'
  | 'users'
  | 'finance'
  | 'legal'
  | 'docs'
  | 'quality'
  | 'extra';

const TAB_LABEL: Record<TabId, string> = {
  main: 'Основное',
  catalog: 'Каталог',
  users: 'Пользователи и доступ',
  finance: 'Финансы',
  legal: 'Юрданные',
  docs: 'Документы и расчёты',
  quality: 'Качество и trust',
  extra: 'Дополнительно',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<TabId>('main');

  const detailQ = useQuery({
    queryKey: ['admin-supplier-detail', id],
    queryFn: () => fetchAdminSupplier(id!),
    enabled: Boolean(id),
  });

  const [draft, setDraft] = React.useState<AdminSupplierDetail | null>(null);
  React.useEffect(() => {
    if (detailQ.data) setDraft(detailQ.data);
  }, [detailQ.data]);

  const saveM = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Нет данных');
      return patchAdminSupplier(draft.id, {
        trustLevel: draft.trustLevel,
        commissionRate: draft.commissionRate != null ? Number(draft.commissionRate) : undefined,
        isActive: draft.isActive,
        isExchangeFrozen: draft.status === 'SUSPENDED',
        yookassaAccountId: draft.yookassaAccountId ?? undefined,
        defaultRefundPolicyText: draft.defaultRefundPolicyText ?? undefined,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-supplier-detail', id] });
      await qc.invalidateQueries({ queryKey: ['admin-suppliers-list'] });
    },
  });

  if (!id) {
    return <ErrorState title="Некорректный ID" description="Не указан идентификатор поставщика." />;
  }

  if (detailQ.isLoading) return <LoadingState label="Загрузка поставщика…" />;
  if (detailQ.isError || !draft) {
    const meta = detailQ.error ? getAdminErrorDisplay(detailQ.error) : null;
    return (
      <ErrorState
        title="Не удалось загрузить поставщика"
        description={meta?.title ?? 'Ошибка'}
        onRetry={() => detailQ.refetch()}
      />
    );
  }

  const v = draft;
  const readiness = v.readiness;
  const st = v.stats;
  const lhFull = v.listingHealth?.full;
  const errSave = saveM.error ? getAdminErrorDisplay(saveM.error) : null;
  const eventsHref = `/admin-v3/events?operator=${encodeURIComponent(v.slug)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={v.name}
        subtitle={`Поставщик (оператор) · ${v.slug}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => saveM.mutate()} disabled={saveM.isPending}>
              {saveM.isPending ? 'Сохранение…' : 'Сохранить'}
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link to={eventsHref}>События</Link>
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link to="/admin-v3/finance">Финансы</Link>
            </Button>
          </div>
        }
      />

      {errSave ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errSave.title}
        </div>
      ) : null}

      {readiness ? (
        <section className="rounded-lg border bg-card p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Готовность</span>
            <Badge variant="outline">{readiness.status}</Badge>
            <span className="text-muted-foreground">{readiness.score}/100</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-destructive">Блокеры</div>
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                {readiness.blockers.length ? readiness.blockers.map((x) => <li key={x}>{x}</li>) : <li>—</li>}
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium text-amber-800 dark:text-amber-200">Предупреждения</div>
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                {readiness.warnings.length ? readiness.warnings.map((x) => <li key={x}>{x}</li>) : <li>—</li>}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b pb-2">
        {(Object.keys(TAB_LABEL) as TabId[]).map((k) => (
          <Button key={k} type="button" size="sm" variant={tab === k ? 'secondary' : 'ghost'} onClick={() => setTab(k)}>
            {TAB_LABEL[k]}
          </Button>
        ))}
      </div>

      {tab === 'main' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Название">
              <span>{v.name}</span>
            </Field>
            <Field label="Slug">
              <span className="font-mono text-xs">{v.slug}</span>
            </Field>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Trust level (0–3)</span>
              <Input
                type="number"
                min={0}
                max={3}
                value={v.trustLevel}
                onChange={(e) => setDraft({ ...v, trustLevel: Number(e.target.value) })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Комиссия (доля, например 0.25 = 25%)</span>
              <Input
                type="number"
                step="0.0001"
                value={v.commissionRate != null ? String(v.commissionRate) : ''}
                onChange={(e) =>
                  setDraft({ ...v, commissionRate: e.target.value === '' ? undefined : Number(e.target.value) })
                }
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(v.isActive)}
                onChange={(e) => setDraft({ ...v, isActive: e.target.checked })}
              />
              Активен (isActive)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={v.status === 'SUSPENDED'}
                onChange={(e) =>
                  setDraft({
                    ...v,
                    status: e.target.checked ? 'SUSPENDED' : 'ACTIVE',
                  })
                }
              />
              Приостановить обмен (SUSPENDED)
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-muted-foreground">YooKassa sub-merchant ID</span>
              <Input
                value={v.yookassaAccountId ?? ''}
                onChange={(e) => setDraft({ ...v, yookassaAccountId: e.target.value || null })}
              />
            </label>
            <Field label="Контакты (справочно)">
              <div className="text-xs">
                Email: {v.contactEmail ?? '—'}
                <br />
                Тел.: {v.contactPhone ?? '—'}
                <br />
                Сайт: {v.website ?? '—'}
              </div>
            </Field>
            <Field label="ИНН (оператор)">
              <span>{v.inn ?? '—'}</span>
            </Field>
          </div>
        </section>
      ) : null}

      {tab === 'catalog' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
          {st ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="События всего">
                <span>{st.eventsCount}</span>
              </Field>
              <Field label="Активные / доступные к публикации">
                <span>{st.activeEventsCount}</span>
              </Field>
              <Field label="Отклонённые (модерация)">
                <span>{st.blockedEventsCount}</span>
              </Field>
              <Field label="Неактивные карточки">
                <span>{st.draftEventsCount}</span>
              </Field>
              <Field label="Площадки">
                <span>{st.venuesCount}</span>
              </Field>
              <Field label="Оферы">
                <span>{st.offersCount}</span>
              </Field>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Индекс качества каталога (proxy на списке): {v.listingHealth?.scoreProxy ?? v.trustCatalogScore ?? '—'}. Полный
            пересчёт: GET /admin/catalog/health?operatorId=
            {v.id}
          </p>
          {lhFull ? (
            <div className="rounded-md bg-muted/40 p-3 text-xs">
              <div>Listing health (полный): score {lhFull.score}</div>
              <div className="mt-1 text-muted-foreground">Проблем: {lhFull.issues.length} · событий в разборе: {lhFull.byEvent.length}</div>
            </div>
          ) : null}
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to={eventsHref}>События поставщика</Link>
          </Button>
        </section>
      ) : null}

      {tab === 'users' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
          <div className="text-xs text-muted-foreground">
            Владелец: {v.access?.ownerPresent ? 'да' : 'нет'} · активных OWNER: {v.access?.activeOwnersCount ?? 0}
          </div>
          {v.access?.rolesSummary ? (
            <ul className="list-inside list-disc text-sm">
              {Object.entries(v.access.rolesSummary).map(([role, n]) => (
                <li key={role}>
                  {role}: {n}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Имя</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Роль</th>
                  <th className="py-2">Статус</th>
                </tr>
              </thead>
              <tbody>
                {(v.supplierUsers ?? []).map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2">{u.name}</td>
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">{u.role}</td>
                    <td className="py-2">{u.isActive ? 'активен' : 'выкл.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'finance' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Заказов (оплачено)">
              <span>{v.financials?.totalOrders ?? '—'}</span>
            </Field>
            <Field label="Выручка (gross)">
              <span>{String(v.financials?.grossRevenue ?? '—')}</span>
            </Field>
            <Field label="Комиссия платформы">
              <span>{String(v.financials?.platformFee ?? '—')}</span>
            </Field>
            <Field label="К поставщику">
              <span>{String(v.financials?.supplierRevenue ?? '—')}</span>
            </Field>
            <Field label="Режим расчётов">
              <span>{v.settlementMode ?? '—'}</span>
            </Field>
            <Field label="Payment mode">
              <span>{v.paymentMode ?? '—'}</span>
            </Field>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/admin-v3/finance">Раздел финансов</Link>
          </Button>
        </section>
      ) : null}

      {tab === 'legal' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-3">
          {v.legalProfile ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Юр. название">
                <span>{v.legalProfile.legalName}</span>
              </Field>
              <Field label="Статус профиля">
                <Badge variant="outline">{v.legalProfile.status}</Badge>
              </Field>
              <Field label="ИНН">
                <span>{v.legalProfile.inn ?? '—'}</span>
              </Field>
              <Field label="Генерация счетов">
                <span>{v.legalProfile.generateInvoiceDocuments ? 'да' : 'нет'}</span>
              </Field>
              <Field label="Закрывающие документы">
                <span>{v.legalProfile.closingDocumentMode ?? '—'}</span>
              </Field>
              <Field label="Email финансов">
                <span>{v.legalProfile.financeEmail ?? '—'}</span>
              </Field>
            </div>
          ) : (
            <p className="text-muted-foreground">Юридический профиль не заведён.</p>
          )}
        </section>
      ) : null}

      {tab === 'docs' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Расчёты по статусам</div>
            <ul className="mt-1 list-inside list-disc">
              {(v.settlementsByStatus ?? []).map((s) => (
                <li key={s.status}>
                  {s.status}: {s.count}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Документы по статусам</div>
            <ul className="mt-1 list-inside list-disc">
              {(v.documentsByStatus ?? []).map((s) => (
                <li key={s.status}>
                  {s.status}: {s.count}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {tab === 'quality' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Trust score">
              <span>{v.trust?.score != null ? String(v.trust.score) : '—'}</span>
            </Field>
            <Field label="Эффективный score">
              <span>{v.trust?.effectiveScore != null ? String(v.trust.effectiveScore) : '—'}</span>
            </Field>
            <Field label="Trust level">
              <span>{v.trustLevel}</span>
            </Field>
            <Field label="Catalog (компонента)">
              <span>{v.trust?.catalog != null ? String(v.trust.catalog) : '—'}</span>
            </Field>
          </div>
          {lhFull ? (
            <div>
              <div className="text-xs font-medium">Топ проблем (до 8)</div>
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                {lhFull.issues.slice(0, 8).map((i) => (
                  <li key={`${i.code}-${i.message}`}>
                    {i.code}: {i.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'extra' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Дефолтный текст возврата (Venue/Event)</span>
            <textarea
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={v.defaultRefundPolicyText ?? ''}
              onChange={(e) => setDraft({ ...v, defaultRefundPolicyText: e.target.value })}
            />
          </label>
          <Field label="ЭДО профиль">
            {v.edoProfile ? (
              <span>
                {v.edoProfile.provider} · ИНН {v.edoProfile.inn} · {v.edoProfile.isActive ? 'активен' : 'выкл.'}
              </span>
            ) : (
              <span className="text-muted-foreground">Нет</span>
            )}
          </Field>
          <Field label="ID">
            <span className="font-mono text-xs">{v.id}</span>
          </Field>
        </section>
      ) : null}
    </div>
  );
}
