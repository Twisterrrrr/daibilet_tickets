'use client';

import Link from 'next/link';
import { useState } from 'react';

import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.userForgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      // Показываем обобщённую ошибку, чтобы не раскрывать детали
      setError(err instanceof Error ? err.message : 'Не удалось отправить ссылку для сброса пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900">Восстановление пароля</h1>
        <p className="mt-2 text-sm text-slate-500">
          Укажите email, который вы использовали при покупке или регистрации. Мы отправим ссылку для сброса пароля.
        </p>

        {submitted ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Если такой email есть в системе, мы отправили на него письмо со ссылкой для сброса пароля.
            </div>
            <p className="text-sm text-slate-500">
              Проверьте папку «Входящие», а также «Спам» и «Промоакции». Ссылка действует ограниченное время.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@example.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary-600 px-4 py-3 text-base font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Отправка...' : 'Отправить ссылку'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="hover:text-slate-700">
            ← Вернуться к входу
          </Link>
        </div>
      </div>
    </div>
  );
}

