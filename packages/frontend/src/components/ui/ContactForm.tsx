'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Send, Loader2, CheckCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function ContactForm() {
  const [step, setStep] = useState<'form' | 'sending' | 'success'>('form');
  const [ticketCode, setTicketCode] = useState('');
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const payload = {
      name: data.get('name') as string,
      email: data.get('email') as string,
      category: data.get('category') as string,
      orderCode: data.get('orderCode') as string || undefined,
      message: data.get('message') as string,
    };

    setStep('sending');
    try {
      const res = await fetch(`${API_URL}/support/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        setTicketCode(result.ticketCode || '');
        setStep('success');
      } else {
        setError('Не удалось отправить. Попробуйте ещё раз.');
        setStep('form');
      }
    } catch {
      setError('Ошибка сети. Попробуйте позже.');
      setStep('form');
    }
  };

  if (step === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Обращение отправлено!</h3>
        {ticketCode && (
          <p className="text-sm text-slate-600 mb-2">
            Код обращения: <span className="font-mono font-semibold">{ticketCode}</span>
          </p>
        )}
        <p className="text-sm text-slate-500 mb-4">Мы ответим на ваш email в течение 24 часов.</p>
        <button
          onClick={() => { setStep('form'); formRef.current?.reset(); }}
          className="text-sm text-blue-600 hover:underline"
        >
          Отправить ещё одно обращение
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Имя</label>
          <input
            type="text"
            name="name"
            required
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Ваше имя"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            required
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="email@example.com"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Тема</label>
        <select
          name="category"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
        >
          <option value="ORDER">Вопрос по заказу</option>
          <option value="REFUND">Возврат билета</option>
          <option value="VENUE">Вопрос о месте / мероприятии</option>
          <option value="TECHNICAL">Техническая проблема</option>
          <option value="OTHER">Другое</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Код заказа (если есть)</label>
        <input
          type="text"
          name="orderCode"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="CS-XXXX"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Сообщение</label>
        <textarea
          name="message"
          required
          rows={4}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          placeholder="Опишите вашу проблему или вопрос..."
        />
      </div>
      <button
        type="submit"
        disabled={step === 'sending'}
        className="w-full px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {step === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {step === 'sending' ? 'Отправка...' : 'Отправить'}
      </button>
      <p className="text-xs text-slate-400 text-center">
        Отправляя форму, вы соглашаетесь с{' '}
        <Link href="/privacy" className="underline hover:text-slate-600">Политикой конфиденциальности</Link>
      </p>
    </form>
  );
}
