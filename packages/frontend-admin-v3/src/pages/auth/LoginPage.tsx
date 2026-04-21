import { publicApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { forgotPasswordPath } from '@/lib/auth-paths';
import { getToken, setToken } from '@/lib/auth';
import { Ticket } from 'lucide-react';
import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

type LoginResponse = { accessToken: string };

export function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  React.useEffect(() => {
    if (getToken()) {
      navigate(from && from.startsWith('/admin-v3') ? from : '/admin-v3/dashboard', { replace: true });
    }
  }, [from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await publicApi<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setToken(data.accessToken);
      navigate(from && from.startsWith('/admin-v3') ? from : '/admin-v3/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="w-full max-w-sm px-4">
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-soft">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl bg-[hsl(200_52%_93%)] text-[hsl(200_40%_38%)] shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.7)]">
              <Ticket className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <h1 className="text-h1 text-foreground">Дайбилет</h1>
            <p className="text-body text-muted-foreground">Вход в админ-панель</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none">
                Эл. почта
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@daibilet.ru"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none">
                Пароль
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error ? <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Вход…' : 'Войти'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link to={forgotPasswordPath()} className="text-primary underline-offset-4 hover:underline">
                Забыли пароль?
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
