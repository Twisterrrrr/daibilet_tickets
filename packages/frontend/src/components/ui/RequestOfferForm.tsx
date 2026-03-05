"use client";

import React from 'react';

type Props = {
  eventId: string;
  offerId?: string;
};

export function RequestOfferForm({ eventId, offerId }: Props) {
  return (
    <div id="request-form" className="mt-5 space-y-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-medium text-amber-800">Оставьте заявку</p>
        <p className="mt-0.5 text-xs text-amber-600">Оператор свяжется с вами для подтверждения и оплаты</p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          try {
            const apiBase =
              typeof window === 'undefined'
                ? (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') + '/api/v1'
                : process.env.NEXT_PUBLIC_API_URL || '/api/v1';
            const response = await fetch(`${apiBase}/checkout/request`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventId,
                offerId,
                name: data.get('name'),
                email: data.get('email'),
                phone: data.get('phone'),
                comment: data.get('comment'),
              }),
            });
            if (!response.ok) {
              const err = await response.json().catch(() => ({}));
              throw new Error(err.message || 'Ошибка отправки');
            }
            form.reset();
            const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
            if (submitBtn) {
              submitBtn.textContent = 'Заявка отправлена!';
              submitBtn.disabled = true;
              submitBtn.className = submitBtn.className.replace(
                'bg-amber-500 hover:bg-amber-600',
                'bg-emerald-500 hover:bg-emerald-600',
              );
            }
          } catch (err: unknown) {
            alert((err instanceof Error ? err.message : String(err)) || 'Ошибка отправки заявки');
          }
        }}
        className="space-y-2.5"
      >
        <input
          name="name"
          required
          placeholder="Ваше имя"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
        <input
          name="phone"
          type="tel"
          required
          placeholder="Телефон"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
        <textarea
          name="comment"
          placeholder="Комментарий (необязательно)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          rows={3}
        />
        <button
          type="submit"
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-amber-600"
        >
          Отправить заявку
        </button>
      </form>
    </div>
  );
}

