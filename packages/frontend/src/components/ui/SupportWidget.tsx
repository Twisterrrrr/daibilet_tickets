'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, CheckCircle, HelpCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

type Step = 'form' | 'sending' | 'success';

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [ticketCode, setTicketCode] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const payload = {
      name: data.get('name') as string,
      email: data.get('email') as string,
      category: data.get('category') as string,
      message: data.get('message') as string,
    };

    if (!payload.name || !payload.email || !payload.message) return;

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
        form.reset();
      } else {
        setStep('form');
      }
    } catch {
      setStep('form');
    }
  };

  const resetAndClose = () => {
    setStep('form');
    setOpen(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300 hover:scale-105
          ${open ? 'bg-slate-700 rotate-0' : 'bg-blue-600 hover:bg-blue-700'}
          text-white
          print:hidden
        `}
        aria-label={open ? 'Закрыть форму' : 'Написать нам'}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Modal panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] w-[340px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col print:hidden">
          {/* Header */}
          <div className="bg-blue-600 px-4 py-3 text-white">
            <p className="font-semibold text-sm">Нужна помощь?</p>
            <p className="text-xs text-blue-100">Мы ответим в течение 24 часов</p>
          </div>

          {step === 'form' && (
            <form ref={formRef} onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1">
              <div>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Ваше имя"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="Email"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <select
                  name="category"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-slate-700"
                >
                  <option value="ORDER">Вопрос по заказу</option>
                  <option value="REFUND">Возврат билета</option>
                  <option value="VENUE">Вопрос о месте</option>
                  <option value="TECHNICAL">Техническая проблема</option>
                  <option value="OTHER">Другое</option>
                </select>
              </div>
              <div>
                <textarea
                  name="message"
                  required
                  rows={3}
                  placeholder="Опишите проблему..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                Отправить
              </button>
              <a
                href="/help"
                className="block text-center text-xs text-slate-500 hover:text-blue-600 transition-colors"
              >
                <HelpCircle className="h-3 w-3 inline mr-1" />
                Частые вопросы
              </a>
            </form>
          )}

          {step === 'sending' && (
            <div className="p-8 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
              <p className="text-sm text-slate-600">Отправляем...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="font-semibold text-sm text-slate-900 mb-1">Обращение отправлено!</p>
              {ticketCode && (
                <p className="text-xs text-slate-500 mb-3">
                  Код обращения: <span className="font-mono font-semibold">{ticketCode}</span>
                </p>
              )}
              <p className="text-xs text-slate-500 mb-4">
                Мы ответим на ваш email в течение 24 часов.
              </p>
              <button
                onClick={resetAndClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Закрыть
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
