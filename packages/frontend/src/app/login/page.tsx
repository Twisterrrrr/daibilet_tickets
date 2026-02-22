'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useUserAuth } from '@/hooks/useUserAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useUserAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      router.push('/favorites');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900">{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
        <p className="mt-2 text-slate-500">
          {mode === 'login'
            ? 'Войдите, чтобы сохранить избранное в учётной записи'
            : 'Создайте аккаунт для сохранения избранного'}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Имя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={mode === 'register'}
                placeholder="Ваше имя"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
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
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary-600 px-4 py-3 text-base font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === 'login' ? (
            <>
              Нет аккаунта?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Зарегистрироваться
              </button>
            </>
          ) : (
            <>
              Уже есть аккаунт?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Войти
              </button>
            </>
          )}
        </p>

        <Link href="/" className="mt-6 block text-center text-sm text-slate-500 hover:text-slate-700">
          ← На главную
        </Link>
      </div>
    </div>
  );
}
