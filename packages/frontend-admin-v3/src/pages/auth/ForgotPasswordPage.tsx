import { publicApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginPath } from '@/lib/auth-paths';
import { Ticket } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

export function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await publicApi('/auth/admin/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка запроса');
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
            <h1 className="text-h1 text-foreground">Сброс пароля</h1>
            <p className="text-body text-muted-foreground">На эл. почту придёт ссылка для установки нового пароля</p>
          </div>
          {done ? (
            <p className="text-sm text-muted-foreground">
              Если адрес есть в системе, мы отправили письмо со ссылкой. Проверьте почту и папку «Спам».
            </p>
          ) : (
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
                />
              </div>
              {error ? <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Отправка…' : 'Отправить ссылку'}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to={loginPath()} className="text-primary underline-offset-4 hover:underline">
              ← Ко входу
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
