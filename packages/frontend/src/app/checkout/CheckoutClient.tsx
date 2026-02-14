'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShoppingCart,
  ExternalLink,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Minus,
  Plus,
} from 'lucide-react';
import { useCart, type CartItem } from '@/lib/cart';
import { formatPrice } from '@daibilet/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

type CheckoutStep = 'review' | 'contact' | 'processing' | 'done';

interface ValidatedItem extends CartItem {
  valid: boolean;
  currentPrice: number | null;
  reason?: string;
}

interface ContactForm {
  name: string;
  email: string;
  phone: string;
}

export function CheckoutClient() {
  const { items, itemCount, totalPrice, removeItem, updateQuantity, clearCart } = useCart();
  const [step, setStep] = useState<CheckoutStep>('review');
  const [validating, setValidating] = useState(false);
  const [validatedItems, setValidatedItems] = useState<ValidatedItem[] | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactForm>({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Separate items by type (3 типа: WIDGET, REDIRECT, REQUEST)
  const redirectItems = items.filter((i) => i.purchaseType === 'REDIRECT');
  const requestItems = items.filter((i) => i.purchaseType === 'REQUEST');
  const widgetItems = items.filter((i) => i.purchaseType === 'WIDGET');

  // Validate cart
  const handleValidate = async () => {
    setValidating(true);
    setValidationError(null);
    try {
      const res = await fetch(`${API_BASE}/checkout/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Ошибка валидации');
      }
      const data = await res.json();
      setValidatedItems(data.items);
      if (data.allValid) {
        setStep('contact');
      }
    } catch (e: unknown) {
      console.error('Checkout error:', e);
      setValidationError((e as Error).message);
    } finally {
      setValidating(false);
    }
  };

  // Submit checkout
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.name || !contact.email || !contact.phone) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customer: contact,
          utm: getUtmParams(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Ошибка оформления');
      }
      const data = await res.json();
      setResult(data);
      setStep('done');
      clearCart();
    } catch (e: unknown) {
      console.error('Checkout error:', e);
      setValidationError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Empty cart state
  if (items.length === 0 && step !== 'done') {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20">
        <ShoppingCart className="h-16 w-16 text-slate-300" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Корзина пуста</h1>
        <p className="mt-2 text-slate-500">Добавьте события, которые хотите посетить</p>
        <Link
          href="/events"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700"
        >
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/events" className="rounded-lg p-2 hover:bg-slate-100 transition">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Оформление заказа</h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {['Проверка', 'Контакты', 'Готово'].map((label, idx) => {
            const stepIdx = idx === 0 ? 'review' : idx === 1 ? 'contact' : 'done';
            const isActive = step === stepIdx || step === 'processing';
            const isDone = (idx === 0 && (step === 'contact' || step === 'processing' || step === 'done')) ||
                           (idx === 1 && (step === 'processing' || step === 'done')) ||
                           (idx === 2 && step === 'done');
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  isDone ? 'bg-emerald-500 text-white' :
                  isActive ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {isDone ? <CheckCircle className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={`text-sm ${isActive || isDone ? 'font-medium text-slate-900' : 'text-slate-400'}`}>
                  {label}
                </span>
                {idx < 2 && <div className="flex-1 h-px bg-slate-200" />}
              </div>
            );
          })}
        </div>

        {/* Step: Review */}
        {step === 'review' && (
          <div className="space-y-6">
            {/* Validation errors */}
            {validationError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{validationError}</p>
              </div>
            )}

            {/* Items list */}
            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
              {items.map((item) => {
                const validation = validatedItems?.find((v) => v.offerId === item.offerId);
                return (
                  <div key={item.offerId} className="flex gap-4 p-4">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 flex-shrink-0">
                        <span className="text-2xl opacity-40">🎫</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link href={`/events/${item.eventSlug}`} className="text-sm font-medium text-slate-900 line-clamp-1 hover:text-primary-600">
                        {item.eventTitle}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">
                          {item.purchaseType === 'REQUEST' ? 'Заявка' :
                           item.purchaseType === 'REDIRECT' ? 'Партнёр' : 'Билет'}
                        </span>
                        {item.badge && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            {item.badge}
                          </span>
                        )}
                        {validation && !validation.valid && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
                            {validation.reason}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatPrice(item.priceFrom * item.quantity)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.offerId, item.quantity - 1)}
                            className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.offerId, item.quantity + 1)}
                            className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeItem(item.offerId)}
                            className="ml-1 flex h-6 w-6 items-center justify-center text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Итого:</span>
                <span className="text-xl font-bold text-slate-900">{formatPrice(totalPrice)}</span>
              </div>
              {redirectItems.length > 0 && requestItems.length > 0 && (
                <p className="mt-2 text-xs text-slate-400">
                  В заказе есть билеты для оплаты на сайте партнёра и заявки на подтверждение
                </p>
              )}
            </div>

            <button
              onClick={handleValidate}
              disabled={validating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {validating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Продолжить'
              )}
            </button>
          </div>
        )}

        {/* Step: Contact Info */}
        {step === 'contact' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {validationError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{validationError}</p>
              </div>
            )}

            {/* Redirect items block */}
            {redirectItems.length > 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-blue-600" />
                  <h3 className="text-sm font-semibold text-blue-800">Оплата на сайте партнёра</h3>
                </div>
                <p className="text-xs text-blue-600">
                  После оформления вы будете перенаправлены для оплаты
                </p>
                {redirectItems.map((item) => (
                  <div key={item.offerId} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                    <span className="text-sm text-slate-700 line-clamp-1">{item.eventTitle}</span>
                    <span className="text-sm font-medium text-slate-900">{formatPrice(item.priceFrom * item.quantity)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Request items block */}
            {requestItems.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-amber-600" />
                  <h3 className="text-sm font-semibold text-amber-800">Заявка на подтверждение</h3>
                </div>
                <p className="text-xs text-amber-600">
                  Оператор свяжется с вами для подтверждения и оплаты
                </p>
                {requestItems.map((item) => (
                  <div key={item.offerId} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                    <span className="text-sm text-slate-700 line-clamp-1">{item.eventTitle}</span>
                    <span className="text-sm font-medium text-slate-900">{formatPrice(item.priceFrom * item.quantity)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Contact form */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <h3 className="text-base font-semibold text-slate-900">Контактные данные</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Имя *</label>
                  <input
                    value={contact.name}
                    onChange={(e) => setContact((f) => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="Ваше имя"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                  <input
                    value={contact.email}
                    onChange={(e) => setContact((f) => ({ ...f, email: e.target.value }))}
                    type="email"
                    required
                    placeholder="email@example.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Телефон *</label>
                  <input
                    value={contact.phone}
                    onChange={(e) => setContact((f) => ({ ...f, phone: e.target.value }))}
                    type="tel"
                    required
                    placeholder="+7 (999) 123-45-67"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('review')}
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Назад
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-base font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Оформить заказ
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step: Done */}
        {step === 'done' && result && (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-slate-900">Заказ оформлен!</h2>
              <p className="mt-2 text-slate-500">
                Номер заказа: <span className="font-mono font-bold">{result.shortCode}</span>
              </p>
            </div>

            {/* Redirect links */}
            {result.redirectItems && result.redirectItems.length > 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-left space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                  <ExternalLink className="h-4 w-4" />
                  Оплатите на сайте партнёра
                </h3>
                {result.redirectItems.map((item: any) => (
                  <a
                    key={item.offerId}
                    href={item.deeplink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg bg-white px-4 py-3 transition hover:shadow-sm"
                  >
                    <span className="text-sm font-medium text-slate-900">{item.eventTitle}</span>
                    <span className="flex items-center gap-1 text-sm font-medium text-blue-600">
                      Перейти <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                  </a>
                ))}
              </div>
            )}

            {/* Request items info */}
            {result.requestItems > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-left">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <Send className="h-4 w-4" />
                  Заявки на подтверждение: {result.requestItems}
                </h3>
                <p className="mt-1 text-xs text-amber-600">
                  Оператор свяжется с вами в ближайшее время для подтверждения мест и оплаты.
                  Заявка действительна 30 минут.
                </p>
              </div>
            )}

            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-base font-medium text-white transition hover:bg-primary-700"
            >
              Вернуться в каталог
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/** Extract UTM params from URL */
function getUtmParams() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source') || undefined,
    medium: params.get('utm_medium') || undefined,
    campaign: params.get('utm_campaign') || undefined,
  };
}
