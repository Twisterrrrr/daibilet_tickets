'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Gift, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { formatPrice } from '@daibilet/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function getUtmParams() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source') || undefined,
    medium: params.get('utm_medium') || undefined,
    campaign: params.get('utm_campaign') || undefined,
  };
}

interface GiftCertificateClientProps {
  denominations: number[];
}

export function GiftCertificateClient({ denominations }: GiftCertificateClientProps) {
  const [amount, setAmount] = useState(denominations[0] ?? 500000);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !senderName || !name || !email || !phone) return;

    setSubmitting(true);
    setError(null);
    try {
      const sessionRes = await fetch(`${API_BASE}/checkout/gift-certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          recipientEmail,
          senderName,
          message: message || undefined,
          customer: { name, email, phone },
          utm: getUtmParams(),
        }),
      });
      if (!sessionRes.ok) {
        const err = await sessionRes.json().catch(() => ({}));
        throw new Error(err.message || 'Ошибка оформления');
      }
      const session = await sessionRes.json();

      const payRes = await fetch(`${API_BASE}/checkout/${session.sessionId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      });
      if (!payRes.ok) {
        const err = await payRes.json().catch(() => ({}));
        throw new Error(err.message || 'Ошибка создания платежа');
      }
      const pay = await payRes.json();

      if (pay.paymentUrl) {
        window.location.href = pay.paymentUrl;
        return;
      }
      setDone(true);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-md text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Заявка отправлена</h1>
          <p className="mt-2 text-slate-600">
            Ссылка для оплаты будет отправлена на вашу почту.
          </p>
          <Link
            href="/events"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-medium text-white hover:bg-primary-700"
          >
            Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-xl">
        <Link
          href="/events"
          className="mb-6 inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
            <Gift className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Подарочный сертификат</h1>
            <p className="text-slate-600">Впечатление в подарок — выберите номинал и оформите заказ</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Номинал</label>
            <div className="flex flex-wrap gap-2">
              {denominations.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setAmount(d)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    amount === d
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {formatPrice(d)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="recipientEmail" className="block text-sm font-medium text-slate-700 mb-1">
              Email получателя *
            </label>
            <input
              id="recipientEmail"
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label htmlFor="senderName" className="block text-sm font-medium text-slate-700 mb-1">
              Имя отправителя *
            </label>
            <input
              id="senderName"
              type="text"
              required
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="Кто дарит"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
              Поздравительное сообщение
            </label>
            <textarea
              id="message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="С днём рождения! Приглашаю в приключение."
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Контактные данные покупателя</h3>
            <div className="space-y-3">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя *"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email *"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Телефон *"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
            <span className="font-medium text-slate-900">Итого</span>
            <span className="text-xl font-bold text-primary-600">{formatPrice(amount)}</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Оформление...
              </>
            ) : (
              'Перейти к оплате'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
