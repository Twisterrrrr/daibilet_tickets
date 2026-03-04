'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { api } from '@/lib/api';

export function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Ссылка для сброса пароля недействительна.');
      return;
    }
    if (password.length < 6) {
      setError('Пароль минимум 6 символов.');
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают.');
      return;
    }

    setLoading(true);
    try {
      await api.userResetPassword({ token, password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось изменить пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900">Новый пароль</h1>
        <p className="mt-2 text-sm text-slate-500">
          Придумайте новый пароль для входа. После сохранения вы сможете авторизоваться с ним.
        </p>

        {success ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Пароль успешно изменён. Теперь вы можете войти с новым паролем.
            </div>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full rounded-xl bg-primary-600 px-4 py-3 text-base font-medium text-white transition hover:bg-primary-700"
            >
              Перейти к входу
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Новый пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Минимум 6 символов"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Повторите пароль</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary-600 px-4 py-3 text-base font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Сохранение...' : 'Сохранить новый пароль'}
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
