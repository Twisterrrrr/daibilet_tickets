import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';

import { publicApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Ticket className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl">Сброс пароля</CardTitle>
            <CardDescription>На email придёт ссылка для установки нового пароля</CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <p className="text-sm text-muted-foreground">
                Если адрес есть в системе, мы отправили письмо со ссылкой. Проверьте почту и папку «Спам».
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
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
                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
                )}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Отправка...' : 'Отправить ссылку'}
                </Button>
              </form>
            )}
            <p className="mt-4 text-center text-sm">
              <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                Назад к входу
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
