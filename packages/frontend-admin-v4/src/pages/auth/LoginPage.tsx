import { ApiError } from '@/shared/api/client';
import { login } from '@/shared/auth/auth-api';
import { getAccessToken } from '@/shared/auth/tokens';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  React.useEffect(() => {
    if (getAccessToken()) {
      navigate(from && from.startsWith('/admin-v4') ? from : '/admin-v4/dashboard', { replace: true });
    }
  }, [from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from && from.startsWith('/admin-v4') ? from : '/admin-v4/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>Вход в Admin v4</h1>
        <p style={{ marginTop: 8, opacity: 0.75 }}>Используется `/api/v1/auth/login` + refresh-cookie.</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@daibilet.ru"
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db' }}
            />
          </label>

          {error ? (
            <div style={{ padding: 10, borderRadius: 10, background: '#fee2e2', color: '#991b1b' }}>{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #111827',
              background: loading ? '#111827b3' : '#111827',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

