import { Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '@/shared/lib/api';
import { PageGlyph } from '@/shared/ui/page-glyph';
import {
  EmptyState,
  ErrorPanel,
  LoadingBlock,
  PageHeader,
  SectionCard,
  StatTile,
} from '@/shared/ui/page-primitives';

interface SupplierBalance {
  currentBalance: number;
  pendingPayoutAmount: number;
  availableToRequest: number;
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  requestedAt: string;
  processedAt?: string | null;
  comment?: string | null;
}

const PAYOUT_STATUS_LABELS: Record<string, string> = {
  NEW: 'Новая',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
  PAID: 'Выплачена',
};

const PAYOUT_STATUS_HINTS: Record<string, string> = {
  NEW: 'Заявка создана. Обычно 1–3 рабочих дня.',
  APPROVED: 'Одобрена, ожидает перевода.',
  REJECTED: 'Отклонена — см. комментарий.',
  PAID: 'Средства переведены.',
};

function formatMoney(n: number) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function BalancePage() {
  const [balance, setBalance] = useState<SupplierBalance | null>(null);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<SupplierBalance>('/supplier/balance'),
      api.get<PayoutRequest[]>('/supplier/payout-requests'),
    ])
      .then(([b, r]) => {
        setBalance(b != null ? b : null);
        setRequests(Array.isArray(r) ? r : []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить баланс');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balance) return;
    const value = Number(amount.replace(',', '.'));
    if (!value || value <= 0) {
      window.alert('Введите корректную сумму');
      return;
    }
    if (value > balance.availableToRequest) {
      window.alert('Сумма превышает доступный баланс');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/supplier/payout-requests', { amount: value, comment: comment || undefined });
      setAmount('');
      setComment('');
      load();
      window.alert('Заявка отправлена.');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Не удалось создать заявку');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !balance) {
    return (
      <div className="space-y-6">
        <PageHeader title="Баланс и вывод средств" glyph={<PageGlyph icon={Wallet} tone="peach" />} />
        <LoadingBlock label="Загружаем баланс…" />
      </div>
    );
  }

  if (error && !balance) {
    return (
      <div className="space-y-6">
        <PageHeader title="Баланс и вывод средств" glyph={<PageGlyph icon={Wallet} tone="peach" />} />
        <ErrorPanel title="Не удалось загрузить баланс" description={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Баланс и вывод средств" glyph={<PageGlyph icon={Wallet} tone="peach" />} />

      {balance ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Текущий баланс" value={`${formatMoney(balance.currentBalance)} ₽`} />
          <StatTile label="В заявках на вывод" value={`${formatMoney(balance.pendingPayoutAmount)} ₽`} />
          <StatTile
            label="Доступно к запросу"
            value={`${formatMoney(balance.availableToRequest)} ₽`}
            className="border-success/20"
          />
        </div>
      ) : null}

      <SectionCard title="Создать заявку на вывод">
        <form onSubmit={handleSubmit} className="space-y-3 text-small">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-label text-text-muted">Сумма, ₽</label>
              <input
                className="w-full rounded-control border border-border-soft px-3 py-2 outline-none focus:border-accent"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Например, 15000"
              />
            </div>
            <div>
              <label className="mb-1 block text-label text-text-muted">Комментарий</label>
              <input
                className="w-full rounded-control border border-border-soft px-3 py-2 outline-none focus:border-accent"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Уточнения для бухгалтерии"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !balance || balance.availableToRequest <= 0}
              className="rounded-control bg-accent px-4 py-2 text-label font-medium text-accent-foreground disabled:opacity-50"
            >
              {submitting ? 'Отправка…' : 'Отправить заявку'}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="История заявок">
        {requests.length === 0 ? (
          <EmptyState title="Заявок пока нет" description="Созданные заявки появятся в этой таблице." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-small">
              <thead>
                <tr className="border-b border-border-soft text-label text-text-muted">
                  <th className="px-2 py-2">Дата</th>
                  <th className="px-2 py-2">Сумма</th>
                  <th className="px-2 py-2">Статус</th>
                  <th className="px-2 py-2">Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-border-soft last:border-0">
                    <td className="px-2 py-2 text-text-secondary">
                      {new Date(r.requestedAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-2 py-2 tabular-nums text-text-primary">
                      {formatMoney(r.amount)} ₽
                    </td>
                    <td className="px-2 py-2">
                      <span
                        title={PAYOUT_STATUS_HINTS[r.status] ?? r.status}
                        className="cursor-help text-[11px] font-medium uppercase text-text-secondary"
                      >
                        {PAYOUT_STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-text-muted">{r.comment ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
