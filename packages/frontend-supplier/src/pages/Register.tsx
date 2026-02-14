import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api, setToken } from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', companyName: '', inn: '', contactPhone: '', website: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Пароль минимум 8 символов'); return; }
    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string }>('/supplier/auth/register', form);
      setToken(res.accessToken);
      toast.success('Регистрация успешна!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="w-full max-w-lg p-8 bg-white rounded-xl shadow-sm border">
        <h1 className="text-2xl font-bold text-center mb-2">Регистрация поставщика</h1>
        <p className="text-center text-gray-500 mb-6">Размещайте события и зарабатывайте</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ваше имя *</label>
              <input value={form.name} onChange={set('name')} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input type="email" value={form.email} onChange={set('email')} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Пароль *</label>
            <input type="password" value={form.password} onChange={set('password')} className="w-full px-3 py-2 border rounded-lg" required minLength={8} />
          </div>
          <hr />
          <div>
            <label className="block text-sm font-medium mb-1">Название компании *</label>
            <input value={form.companyName} onChange={set('companyName')} className="w-full px-3 py-2 border rounded-lg" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ИНН</label>
              <input value={form.inn} onChange={set('inn')} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Телефон</label>
              <input value={form.contactPhone} onChange={set('contactPhone')} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Сайт</label>
            <input value={form.website} onChange={set('website')} className="w-full px-3 py-2 border rounded-lg" placeholder="https://" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">Войти</Link>
        </p>
      </div>
    </div>
  );
}
