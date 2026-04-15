'use client';

import type { AccountFulfillmentLine, AccountOrderDetail } from '@/lib/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { getStoredToken } from '@/lib/user-auth';
import { useUserAuth } from '@/hooks/useUserAuth';

const STATUS_LABEL: Record<string, string> = {
  STARTED: 'Создан',
  VALIDATED: 'Проверен',
  CONFIRMED: 'Подтверждён',
  AWAITING_PAYMENT: 'Ожидает оплаты',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
  EXPIRED: 'Истёк',
};

const FULFILLMENT_LABEL: Record<string, string> = {
  PENDING: 'В обработке',
  RESERVING: 'Резервирование',
  RESERVED: 'Зарезервировано',
  CONFIRMED: 'Подтверждено',
  REFUND_PENDING: 'Возврат в обработке',
  FAILED: 'Ошибка',
  CANCELLED: 'Отменено',
  REFUNDED: 'Возврат выполнен',
};

const REFUND_REQUEST_LABEL: Record<string, string> = {
  CREATED: 'На рассмотрении',
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
  PROCESSING: 'Выполняется возврат',
  COMPLETED: 'Возврат завершён',
  FAILED: 'Ошибка возврата',
};

function formatPrice(kopecks: number | null) {
  if (kopecks == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function fulfillmentForLine(
  items: AccountOrderDetail['fulfillmentItems'],
  lineIndex: number,
): AccountFulfillmentLine | undefined {
  if (!items?.length) return undefined;
  return items.find((f) => f.lineItemIndex === lineIndex);
}

export default function AccountOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { token } = useUserAuth();
  const [data, setData] = useState<AccountOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftFiId, setDraftFiId] = useState<string | null>(null);
  const [reasonNote, setReasonNote] = useState('');
  const [submittingFiId, setSubmittingFiId] = useState<string | null>(null);
  const [lineMessage, setLineMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const t = token ?? getStoredToken();
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      const d = await api.accountOrderDetail(t, id);
      setData(d);
    } catch {
      setError('Заказ не найден или доступ запрещён');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitRefund(fi: AccountFulfillmentLine) {
    const t = token ?? getStoredToken();
    if (!t) return;
    setSubmittingFiId(fi.id);
    setLineMessage(null);
    try {
      await api.accountCreateRefundRequest(t, {
        fulfillmentItemId: fi.id,
        reasonNote: reasonNote.trim() || undefined,
      });
      setDraftFiId(null);
      setReasonNote('');
      await load();
    } catch (e) {
      setLineMessage(e instanceof Error ? e.message : 'Не удалось отправить заявку');
    } finally {
      setSubmittingFiId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-900">{error ?? 'Заказ не найден'}</p>
        <Link
          href="/account/orders"
          className="mt-4 inline-flex items-center gap-2 text-sm text-primary-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          К списку заказов
        </Link>
      </div>
    );
  }

  const statusLabel = STATUS_LABEL[data.status] ?? data.status;
  const canRequestRefundGlobally = data.status === 'COMPLETED';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/account/orders" className="rounded-lg p-2 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Заказ {data.shortCode}</h1>
          <p className="text-sm text-slate-500">{formatDate(data.createdAt)}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {statusLabel}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {data.totalPrice != null && (
            <div>
              <p className="text-slate-500">Сумма</p>
              <p className="font-medium text-slate-900">{formatPrice(data.totalPrice)}</p>
            </div>
          )}
          {data.customerName && (
            <div>
              <p className="text-slate-500">Получатель</p>
              <p className="font-medium text-slate-900">{data.customerName}</p>
            </div>
          )}
          <div>
            <p className="text-slate-500">Создан</p>
            <p className="font-medium text-slate-900">{formatDate(data.createdAt)}</p>
          </div>
          {data.completedAt && (
            <div>
              <p className="text-slate-500">Завершён</p>
              <p className="font-medium text-slate-900">{formatDate(data.completedAt)}</p>
            </div>
          )}
        </div>
      </div>

      {data.items && data.items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="font-semibold text-slate-900">Состав заказа</h2>
            <p className="mt-1 text-xs text-slate-500">
              По каждой позиции можно подать заявку на возврат после оплаты; ниже показан статус билета и заявки.
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.items.map((item, lineIndex) => {
              const fi = fulfillmentForLine(data.fulfillmentItems, lineIndex);
              const refund = fi?.refund;
              const refundLabel = refund ? REFUND_REQUEST_LABEL[refund.status] ?? refund.status : null;
              const fiLabel = fi ? FULFILLMENT_LABEL[fi.status] ?? fi.status : null;
              const showRefundForm =
                draftFiId === fi?.id && fi && !refund && canRequestRefundGlobally && fi.status !== 'REFUNDED';
              const canStartRefund =
                Boolean(fi) &&
                canRequestRefundGlobally &&
                !refund &&
                fi!.status !== 'REFUNDED' &&
                fi!.status !== 'REFUND_PENDING';

              return (
                <li key={`${item.id}-${lineIndex}`} className="p-4">
                  <div className="flex gap-4">
                    {item.event?.imageUrl && (
                      <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <Image
                          src={item.event.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="112px"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="font-medium text-slate-900">
                        {item.offerTitle ?? item.event?.title ?? 'Позиция'}
                      </p>
                      <p className="text-sm text-slate-500">
                        Кол-во: {item.quantity}
                        {item.priceSnapshot != null && ` · ${formatPrice(item.priceSnapshot)}`}
                      </p>
                      {item.sessionStartsAt && (
                        <p className="text-sm text-slate-500">Дата: {formatDate(item.sessionStartsAt)}</p>
                      )}
                      {fi && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                            Билет: {fiLabel}
                          </span>
                          {refund && (
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-900">
                              Возврат: {refundLabel}
                            </span>
                          )}
                        </div>
                      )}
                      {refund && (
                        <p className="text-xs text-slate-500">
                          Обновлено: {formatDate(refund.updatedAt)}
                        </p>
                      )}
                      {!fi && canRequestRefundGlobally && (
                        <p className="text-xs text-slate-500">
                          Позиция ещё не привязана к билету в системе — возврат станет доступен после подтверждения
                          заказа.
                        </p>
                      )}
                      {canStartRefund && (
                        <div className="pt-1">
                          {showRefundForm ? (
                            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                              <label className="block text-xs font-medium text-slate-700">
                                Комментарий к заявке (необязательно)
                                <textarea
                                  value={reasonNote}
                                  onChange={(e) => setReasonNote(e.target.value)}
                                  rows={2}
                                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
                                  placeholder="Кратко опишите причину"
                                />
                              </label>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={submittingFiId === fi!.id}
                                  onClick={() => void submitRefund(fi!)}
                                  className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                                >
                                  {submittingFiId === fi!.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Отправить заявку'
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={submittingFiId === fi!.id}
                                  onClick={() => {
                                    setDraftFiId(null);
                                    setReasonNote('');
                                    setLineMessage(null);
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDraftFiId(fi!.id);
                                setLineMessage(null);
                              }}
                              className="text-sm font-medium text-primary-600 hover:underline"
                            >
                              Запросить возврат по этой позиции
                            </button>
                          )}
                        </div>
                      )}
                      {lineMessage && draftFiId === fi?.id && (
                        <p className="text-xs text-red-600">{lineMessage}</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {data.voucherUrl && (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-5">
          <p className="font-medium text-primary-900">Билеты / трекинг</p>
          <a
            href={data.voucherUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Открыть трекинг заказа
          </a>
        </div>
      )}
    </div>
  );
}
