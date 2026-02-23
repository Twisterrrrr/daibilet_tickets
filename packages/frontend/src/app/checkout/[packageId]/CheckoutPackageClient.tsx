'use client';

import { formatPrice } from '@daibilet/shared';
import { AlertCircle, ArrowLeft, CheckCircle, CreditCard, Loader2, User, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = ['PAID', 'FULFILLED', 'FAILED', 'REFUNDED'];

interface PackageItem {
  id: string;
  event: { id: string; title: string; slug: string; imageUrl: string | null };
  sessionStartsAt: string | null;
  adultTickets: number;
  childTickets: number;
  subtotal: number;
}

interface PackageStatus {
  id: string;
  code: string;
  status: string;
  totalPrice: number;
  voucherUrl: string | null;
  paidAt: string | null;
  trackUrl?: string | null;
  items: PackageItem[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  DRAFT: { label: 'Черновик', color: 'bg-slate-100 text-slate-700', icon: Loader2 },
  PENDING_PAYMENT: { label: 'Ожидает оплаты', color: 'bg-amber-100 text-amber-800', icon: Loader2 },
  PAID: { label: 'Оплачено', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  FULFILLING: { label: 'Обработка', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
  FULFILLED: { label: 'Готово', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  FAILED: { label: 'Ошибка', color: 'bg-red-100 text-red-800', icon: XCircle },
  REFUNDED: { label: 'Возврат', color: 'bg-slate-100 text-slate-700', icon: XCircle },
};

const STEPS = [
  { key: 'review', label: 'Состав', icon: CheckCircle },
  { key: 'contact', label: 'Контакты', icon: User },
  { key: 'payment', label: 'Оплата', icon: CreditCard },
  { key: 'done', label: 'Готово', icon: CheckCircle },
];

interface Props {
  packageId: string;
}

export function CheckoutPackageClient({ packageId }: Props) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PackageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'review' | 'contact' | 'payment' | 'done'>('review');
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [submittingContact, setSubmittingContact] = useState(false);
  const [paying, setPaying] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = (await api.getCheckoutStatus(packageId)) as PackageStatus;
      setData(res);
      setError(null);
      return res.status;
    } catch (e) {
      setError((e as Error).message);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      const status = await fetchStatus();
      if (cancelled) return;
      if (status && !TERMINAL_STATUSES.includes(status)) {
        timer = setTimeout(run, POLL_INTERVAL_MS);
      }
    };
    run();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fetchStatus]);

  const returnStatus = searchParams.get('return');
  useEffect(() => {
    if (returnStatus && data && !loading) {
      const t = setTimeout(() => fetchStatus(), 1500);
      return () => clearTimeout(t);
    }
  }, [returnStatus, fetchStatus, data, loading]);

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.name || !contact.email || !contact.phone) return;
    setSubmittingContact(true);
    setContactError(null);
    try {
      await api.updatePackageContacts(packageId, contact);
      setStep('payment');
    } catch (e) {
      setContactError((e as Error).message);
    } finally {
      setSubmittingContact(false);
    }
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await api.createPackagePayment(packageId);
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
        return;
      }
    } catch (e) {
      setContactError((e as Error).message);
    } finally {
      setPaying(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        <p className="mt-4 text-slate-600">Загрузка заказа...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-600" />
            <div>
              <h2 className="text-lg font-semibold text-red-900">Заказ не найден</h2>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <Link
                href="/events"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red-800 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Вернуться в каталог
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statusInfo = STATUS_LABELS[data.status] || STATUS_LABELS.DRAFT;
  const StatusIcon = statusInfo.icon;
  const canProceed = data.status === 'DRAFT' || data.status === 'PENDING_PAYMENT';
  const isPaid = ['PAID', 'FULFILLED', 'PARTIALLY_FULFILLED'].includes(data.status);

  // T20: Progress bar
  const stepIndex = isPaid ? 4 : step === 'review' ? 1 : step === 'contact' ? 2 : step === 'payment' ? 3 : 1;

  return (
    <div className="container-page py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/events" className="rounded-lg p-2 transition hover:bg-slate-100" aria-label="Назад">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">Заказ {data.code}</h1>
            <div
              className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
            >
              {data.status === 'PENDING_PAYMENT' || data.status === 'FULFILLING' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <StatusIcon className="h-3.5 w-3.5" />
              )}
              {statusInfo.label}
            </div>
          </div>
        </div>

        {/* T20: Progress bar */}
        {canProceed && (
          <div className="mb-8 flex items-center gap-2">
            {STEPS.slice(0, -1).map((s, i) => {
              const idx = i + 1;
              const isActive = stepIndex >= idx;
              const StepIcon = s.icon;
              return (
                <div key={s.key} className="flex flex-1 items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isActive ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isActive ? <StepIcon className="h-4 w-4" /> : idx}
                  </div>
                  <span
                    className={`text-sm ${isActive ? 'font-medium text-slate-900' : 'text-slate-400'}`}
                  >
                    {s.label}
                  </span>
                  {idx < 4 && <div className="h-px flex-1 bg-slate-200" />}
                </div>
              );
            })}
          </div>
        )}

        {returnStatus === 'success' && data.status === 'PENDING_PAYMENT' && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Оплата обрабатывается. Обновим статус через несколько секунд.
          </div>
        )}
        {returnStatus === 'fail' && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Оплата не прошла. Попробуйте снова.
          </div>
        )}
        {returnStatus === 'cancel' && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Оплата отменена.
          </div>
        )}

        {/* Step: Review (composition) */}
        {data.items.length > 0 && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Состав заказа</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {data.items.map((item) => (
                <li key={item.id} className="flex gap-4 p-4">
                  {item.event.imageUrl ? (
                    <img
                      src={item.event.imageUrl}
                      alt=""
                      className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <span className="text-2xl opacity-40">🎫</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/events/${item.event.slug}`}
                      className="text-sm font-medium text-slate-900 line-clamp-1 hover:text-primary-600"
                    >
                      {item.event.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.adultTickets} взр. {item.childTickets > 0 ? `+ ${item.childTickets} дет.` : ''}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatPrice(item.subtotal)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Итого:</span>
                <span className="text-lg font-bold text-slate-900">{formatPrice(data.totalPrice)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step: Contact form */}
        {canProceed && step === 'contact' && (
          <form onSubmit={handleSubmitContact} className="mb-6 space-y-4">
            {contactError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {contactError}
              </div>
            )}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Контактные данные</h3>
              <div className="space-y-3">
                <input
                  value={contact.name}
                  onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                  placeholder="Имя *"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                  placeholder="Email *"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                  placeholder="Телефон *"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Назад
                </button>
                <button
                  type="submit"
                  disabled={submittingContact}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {submittingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Продолжить
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Step: Payment */}
        {canProceed && step === 'payment' && (
          <div className="mb-6">
            {contactError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {contactError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('contact')}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Назад
              </button>
              <button
                onClick={handlePay}
                disabled={paying}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                {paying ? 'Подготовка...' : `Оплатить ${formatPrice(data.totalPrice)}`}
              </button>
            </div>
          </div>
        )}

        {/* Initial step: show Continue to contacts */}
        {canProceed && step === 'review' && (
          <button
            onClick={() => setStep('contact')}
            className="mb-6 w-full rounded-xl bg-primary-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-primary-700"
          >
            Продолжить к оплате
          </button>
        )}

        {data.voucherUrl && isPaid && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
              <h3 className="font-semibold text-emerald-900">Заказ оплачен!</h3>
            </div>
            <a
              href={data.voucherUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Открыть ваучер
            </a>
          </div>
        )}

        {data.trackUrl && isPaid && !data.voucherUrl && (
          <a
            href={data.trackUrl}
            className="mb-6 inline-flex rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Отследить заказ
          </a>
        )}

        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться в каталог
        </Link>
      </div>
    </div>
  );
}
