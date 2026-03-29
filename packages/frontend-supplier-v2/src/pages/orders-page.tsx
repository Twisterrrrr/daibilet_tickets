import { FileText } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useSupplierOrders } from '@/shared/hooks/use-supplier-orders';
import { PageGlyph } from '@/shared/ui/page-glyph';
import {
  EmptyState,
  ErrorPanel,
  FilterRow,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from '@/shared/ui/page-primitives';
import { api } from '@/shared/lib/api';

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrdersPage() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { orders, total, page, pages, loading, error, reload, goPage, confirmOrder, rejectOrder } =
    useSupplierOrders(status);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        (o.shortCode || '').toLowerCase().includes(q) ||
        (o.eventTitle || '').toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.customerEmail || '').toLowerCase().includes(q),
    );
  }, [orders, search]);

  const handleConfirm = async (id: string) => {
    setActionLoadingId(id);
    try {
      await confirmOrder(id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Причина отклонения?') || undefined;
    setActionLoadingId(id);
    try {
      await rejectOrder(id, reason);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setActionLoadingId(null);
    }
  };

  const showEmpty = !loading && !error && filtered.length === 0;
  const showTableBody = !error && filtered.length > 0;

  const supportRequest = (shortCode: string | null) => {
    const orderInfo = shortCode ? ` (заказ ${shortCode})` : '';
    const message = window.prompt('Опишите проблему:', `Обращение${orderInfo}:`);
    if (!message) return;
    void api
      .post('/support/request', {
        name: 'Поставщик',
        email: '',
        orderCode: shortCode,
        message,
      })
      .then(() => window.alert('Обращение отправлено.'))
      .catch(() => window.alert('Не удалось отправить обращение.'));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Заказы"
        subtitle={`Заявок: ${total}`}
        glyph={<PageGlyph icon={FileText} tone="slate" />}
      />

      {error ? <ErrorPanel title="Ошибка загрузки" description={error} onRetry={reload} /> : null}

      <FilterRow
        onReset={() => {
          setStatus('all');
          setSearch('');
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 min-w-[200px] rounded-control border border-border-soft px-3 text-small"
          placeholder="Поиск: код, событие, клиент"
        />
        <span className="text-small text-text-muted">Статус:</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-control border border-border-soft px-3 text-small"
        >
          <option value="all">Все</option>
          <option value="PENDING">В ожидании</option>
          <option value="CONFIRMED">Подтверждён</option>
          <option value="REJECTED">Отклонён</option>
          <option value="EXPIRED">Истёк</option>
        </select>
      </FilterRow>

      <SectionCard title="Заявки">
        {loading && filtered.length === 0 ? <LoadingBlock label="Загружаем заказы…" /> : null}

        {showEmpty ? (
          <div className="space-y-4">
            <EmptyState
              compact
              title="Заявок нет"
              description="Новые заявки появятся здесь."
            />
            <div className="rounded-card border border-dashed border-border-soft bg-surface-alt/40 p-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                Пример строки (демо)
              </p>
              <div className="-mx-1 overflow-x-auto">
                <table className="min-w-full text-small opacity-90">
                  <thead>
                    <tr className="border-b border-border-soft text-left text-label text-text-muted">
                      <th className="px-2 py-2">Код</th>
                      <th className="px-2 py-2">Событие</th>
                      <th className="px-2 py-2">Клиент</th>
                      <th className="px-2 py-2">Кол-во</th>
                      <th className="px-2 py-2">Статус</th>
                      <th className="px-2 py-2">Создана</th>
                      <th className="px-2 py-2">Срок ответа</th>
                      <th className="px-2 py-2 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border-soft/80 last:border-0">
                      <td className="px-2 py-2 font-mono text-[11px] text-text-secondary">DEMO-7X2K</td>
                      <td className="max-w-[240px] truncate px-2 py-2 text-text-primary">
                        Прогулка на теплоходе, выходной день
                      </td>
                      <td className="px-2 py-2 text-[11px] text-text-secondary">
                        <div>Иван П.</div>
                        <div className="text-text-muted">ivan@example.com</div>
                      </td>
                      <td className="px-2 py-2">2</td>
                      <td className="px-2 py-2">
                        <span className="w-fit rounded-full bg-warning-soft px-2 py-0.5 text-[11px] text-warning">
                          В ожидании
                        </span>
                      </td>
                      <td className="px-2 py-2 text-[11px] text-text-muted">29.03.26, 14:30</td>
                      <td className="px-2 py-2 text-[11px] text-text-muted">
                        45 мин
                        <div className="text-[10px]">до 29.03.26, 21:00</div>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className="text-[11px] text-text-muted">Ок / Нет</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-text-muted">
                Когда появятся реальные заявки, таблица заполнится данными из системы. Кнопки подтверждения
                будут активны только у настоящих заказов.
              </p>
            </div>
          </div>
        ) : null}

        {showTableBody ? (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="min-w-full text-small">
              <thead>
                <tr className="border-b border-border-soft text-left text-label text-text-muted">
                  <th className="px-2 py-2">Код</th>
                  <th className="px-2 py-2">Событие</th>
                  <th className="px-2 py-2">Клиент</th>
                  <th className="px-2 py-2">Кол-во</th>
                  <th className="px-2 py-2">Статус</th>
                  <th className="px-2 py-2">Создана</th>
                  <th className="px-2 py-2">Срок ответа</th>
                  <th className="px-2 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-border-soft last:border-0">
                    <td className="px-2 py-2 font-mono text-[11px] text-text-secondary">{o.shortCode || '—'}</td>
                    <td className="max-w-[240px] truncate px-2 py-2 text-text-primary">{o.eventTitle || '—'}</td>
                    <td className="px-2 py-2 text-[11px] text-text-secondary">
                      <div>{o.customerName || '—'}</div>
                      <div className="text-text-muted">{o.customerEmail || ''}</div>
                    </td>
                    <td className="px-2 py-2">{o.quantity}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col gap-1">
                        {o.status === 'PENDING' && (
                          <span className="w-fit rounded-full bg-warning-soft px-2 py-0.5 text-[11px] text-warning">
                            В ожидании
                          </span>
                        )}
                        {o.status === 'CONFIRMED' && (
                          <span className="w-fit rounded-full bg-success-soft px-2 py-0.5 text-[11px] text-success">
                            Подтверждён
                          </span>
                        )}
                        {o.status === 'REJECTED' && (
                          <span className="w-fit rounded-full bg-danger-soft px-2 py-0.5 text-[11px] text-danger-foreground">
                            Отклонён
                          </span>
                        )}
                        {o.status === 'EXPIRED' && (
                          <span className="w-fit rounded-full bg-surface-alt px-2 py-0.5 text-[11px] text-text-muted">
                            Истёк
                          </span>
                        )}
                        {o.hasActiveDispute ? (
                          <span className="w-fit rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-medium text-danger-foreground">
                            Спор
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-[11px] text-text-muted">{formatDate(o.createdAt)}</td>
                    <td className="px-2 py-2 text-[11px] text-text-muted">
                      {o.slaMinutes ? `${o.slaMinutes} мин` : '—'}
                      {o.expiresAt ? <div className="text-[10px]">до {formatDate(o.expiresAt)}</div> : null}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {o.status === 'PENDING' ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={actionLoadingId === o.id}
                              onClick={() => void handleConfirm(o.id)}
                              className="rounded-control bg-success px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                            >
                              Ок
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === o.id}
                              onClick={() => void handleReject(o.id)}
                              className="rounded-control bg-danger-soft px-2 py-1 text-[11px] font-medium text-danger-foreground disabled:opacity-50"
                            >
                              Нет
                            </button>
                          </div>
                          {o.shortCode ? (
                            <button
                              type="button"
                              onClick={() => supportRequest(o.shortCode)}
                              className="text-[11px] text-accent underline"
                            >
                              Поддержка
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {pages > 1 && showTableBody ? (
          <div className="mt-4 flex items-center justify-between border-t border-border-soft pt-4 text-[11px] text-text-muted">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
              className="rounded-control border border-border-soft px-2 py-1 disabled:opacity-50"
            >
              Назад
            </button>
            <span>
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => goPage(page + 1)}
              className="rounded-control border border-border-soft px-2 py-1 disabled:opacity-50"
            >
              Далее
            </button>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
