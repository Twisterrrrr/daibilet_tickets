'use client';

import { Loader2, Send } from 'lucide-react';
import { useRef, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

type Step = 'form' | 'sending' | 'success';

export function PartnerApplicationForm() {
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);

    const companyName = (data.get('companyName') as string) || '';
    const contactName = (data.get('contactName') as string) || '';
    const phone = (data.get('phone') as string) || '';
    const email = (data.get('email') as string) || '';
    const format = (data.get('format') as string) || '';
    const message = (data.get('message') as string) || '';

    if (!companyName || !contactName || !email || !format) {
      setError('Пожалуйста, заполните обязательные поля.');
      return;
    }

    const payload = {
      name: `${companyName} — ${contactName}`,
      email,
      phone,
      category: 'OTHER',
      message:
        `Формат сотрудничества: ${format || 'не указан'}\n` +
        (phone ? `Телефон: ${phone}\n` : '') +
        `\nСообщение:\n${message || '—'}`,
    };

    setStep('sending');

    try {
      const res = await fetch(`${API_URL}/support/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setError('Не удалось отправить заявку. Попробуйте ещё раз.');
        setStep('form');
        return;
      }

      setStep('success');
      form.reset();
    } catch {
      setError('Ошибка сети. Попробуйте позже.');
      setStep('form');
    }
  };

  if (step === 'success') {
    return (
      <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
          <span className="text-emerald-600 text-xl">✓</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Заявка отправлена</h3>
        <p className="text-sm text-slate-600 mb-4">
          Мы свяжемся с вами в течение 1–2 рабочих дней, чтобы обсудить детали сотрудничества.
        </p>
        <button
          type="button"
          onClick={() => setStep('form')}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Отправить ещё одну заявку
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Название компании<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="companyName"
              required
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder='ООО «Экскурсии»'
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Контактное лицо<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="contactName"
              required
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="Иван Иванов"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email<span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="info@company.ru"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Телефон</label>
            <input
              type="tel"
              name="phone"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="+7 (999) 123-45-67"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Формат сотрудничества<span className="text-red-500">*</span>
          </label>
          <select
            name="format"
            required
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            defaultValue=""
          >
            <option value="" disabled>
              Выберите формат
            </option>
            <option value="Оператор (собственная билетная система)">Оператор (собственная билетная система)</option>
            <option value="Поставщик (личный кабинет на Дайбилет)">
              Поставщик (личный кабинет на Дайбилет)
            </option>
            <option value="Площадка (билеты с открытой ценой)">Площадка (билеты с открытой ценой)</option>
            <option value="Другое">Другое</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Сообщение</label>
          <textarea
            name="message"
            rows={4}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
            placeholder="Расскажите о вашей компании, услугах и ожиданиях от сотрудничества..."
          />
        </div>

        <button
          type="submit"
          disabled={step === 'sending'}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg gradient-gold text-slate-900 font-semibold text-sm shadow-gold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {step === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {step === 'sending' ? 'Отправляем заявку...' : 'Отправить заявку'}
        </button>

        <p className="mt-2 text-xs text-slate-400 text-center">
          Отправляя заявку, вы соглашаетесь с обработкой персональных данных.
        </p>
      </form>
    </div>
  );
}

