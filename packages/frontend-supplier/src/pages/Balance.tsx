import { useEffect, useState } from 'react';

import { ErrorState, LoadingState, PageHeader, SectionCard } from '@daibilet/shared-ui';
import { SupplierSettingsNav } from '@/components/layout/SupplierSettingsNav';

import { api } from '../lib/api';

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

const PAYOUT_STATUS_TOOLTIPS: Record<string, string> = {
  NEW: 'Заявка создана. Обработка обычно в течение 1–3 рабочих дней.',
  APPROVED: 'Заявка одобрена администратором. Ожидает перевода средств.',
  REJECTED: 'Заявка отклонена. Смотрите комментарий от администратора.',
  PAID: 'Средства переведены на указанные реквизиты.',
};

export default function BalancePage() {
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
        setBalance(b);
        setRequests(r);
      })
      .catch((err) => {
        console.error(err);
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
      alert('Введите корректную сумму');
      return;
    }
    if (value > balance.availableToRequest) {
      alert('Сумма превышает доступный баланс');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/supplier/payout-requests', { amount: value, comment: comment || undefined });
      setAmount('');
      setComment('');
      load();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Не удалось создать заявку на вывод');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !balance) {
    return <LoadingState label="Загружаем баланс..." />;
  }

  if (error && !balance) {
    return (
      <ErrorState
        title="Не удалось загрузить баланс"
        description={error}
        action={
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={load}
          >
            Повторить
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Баланс и вывод средств" />
      <SupplierSettingsNav />

      {balance && (
        <SectionCard>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-500">Текущий баланс</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {balance.currentBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">В заявках на вывод</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {balance.pendingPayoutAmount.toLocaleString('ru-RU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                ₽
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Доступно к запросу</p>
              <p className="mt-1 text-lg font-semibold text-emerald-700">
                {balance.availableToRequest.toLocaleString('ru-RU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                ₽
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Создать заявку на вывод</h2>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-[1fr,2fr]">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Сумма к выводу, ₽</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Например, 15000"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Комментарий (реквизиты, примечания)</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Например: перечислить на расчётный счёт ..."
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !balance || balance.availableToRequest <= 0}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Отправляем...' : 'Отправить заявку'}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">История заявок</h2>
        {requests.length === 0 ? (
          <p className="text-xs text-slate-500">У вас пока нет заявок на вывод.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Дата</th>
                  <th className="px-3 py-2 font-medium">Сумма</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
                  <th className="px-3 py-2 font-medium">Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      {new Date(r.requestedAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-3 py-2">
                      {r.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                    </td>
                    <td className="px-3 py-2">
                      <span
                        title={PAYOUT_STATUS_TOOLTIPS[r.status] ?? `Статус: ${r.status}`}
                        className="cursor-help uppercase text-[11px] text-slate-600"
                      >
                        {PAYOUT_STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{r.comment}</td>
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

