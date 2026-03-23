import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { PageHeader } from '@daibilet/shared-ui';

import { api, setToken } from '../lib/api';

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setError('Ссылка приглашения недействительна');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || form.password.length < 8) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ accessToken: string; operatorId: string }>(
        `/supplier/invitations/${token}/accept`,
        { name: form.name, password: form.password },
      );
      setToken(res.accessToken);
      toast.success('Вы присоединились к команде!');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Ошибка активации');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
          <p className="text-center text-gray-600">Ссылка приглашения недействительна.</p>
          <Link to="/login" className="mt-4 block text-center text-blue-600 hover:underline">
            Войти
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        <PageHeader
          title={<span className="block text-center">Присоединиться к команде</span>}
          subtitle={<span className="block text-center">Заполните данные для доступа в кабинет поставщика</span>}
          className="mb-6"
        />
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Ваше имя *</label>
            <input
              value={form.name}
              onChange={set('name')}
              className="w-full rounded-lg border px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Пароль (мин. 8 символов) *</label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              className="w-full rounded-lg border px-3 py-2"
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Создание аккаунта...' : 'Присоединиться'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
