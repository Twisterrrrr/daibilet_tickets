import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { api, setToken } from '@/shared/lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ accessToken: string }>('/supplier/auth/login', { email, password });
      setToken(res.accessToken);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-md rounded-card border border-border-soft bg-surface p-8 shadow-soft">
        <h1 className="text-center text-h2 text-text-primary">Дайбилет</h1>
        <p className="mt-1 text-center text-small text-text-muted">Кабинет поставщика · V2</p>
        {error && (
          <p className="mt-4 rounded-control bg-danger-soft px-3 py-2 text-small text-danger" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-label text-text-secondary">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-control border border-border-soft bg-surface px-3 py-2 text-body text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-label text-text-secondary">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-control border border-border-soft bg-surface px-3 py-2 text-body text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-h-control w-full rounded-control bg-accent px-4 py-2 text-label font-medium text-accent-foreground hover:opacity-95 disabled:opacity-50"
          >
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
        <p className="mt-4 text-center text-small text-text-muted">
          Нет аккаунта? Используйте регистрацию в основном кабинете (frontend-supplier) или{' '}
          <Link to="/register" className="text-accent hover:underline">
            заглушка V2
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
