import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { api } from '../lib/api';

export default function Settings() {
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<any>('/supplier/settings').then(setForm);
  }, []);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev: any) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/supplier/settings', form);
      toast.success('Настройки сохранены');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">Настройки компании</h1>

      <div className="bg-white rounded-xl border p-6 space-y-2">
        <h2 className="font-medium text-gray-700">Ваш тариф</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Комиссия:</span>{' '}
            <span className="font-medium">
              {form.commissionRate ? `${(Number(form.commissionRate) * 100).toFixed(0)}%` : '-'}
            </span>
          </div>
          {form.promoRate && (
            <div>
              <span className="text-gray-500">Промо-ставка:</span>{' '}
              <span className="font-medium text-green-600">{(Number(form.promoRate) * 100).toFixed(0)}%</span>
              {form.promoUntil && (
                <span className="text-xs text-gray-400"> до {new Date(form.promoUntil).toLocaleDateString('ru')}</span>
              )}
            </div>
          )}
          <div>
            <span className="text-gray-500">Trust Level:</span> <span className="font-medium">{form.trustLevel}</span>
          </div>
          <div>
            <span className="text-gray-500">Верификация:</span>{' '}
            <span className={`font-medium ${form.verifiedAt ? 'text-green-600' : 'text-gray-400'}`}>
              {form.verifiedAt ? 'Пройдена' : 'Не пройдена'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-medium text-gray-700">Данные компании</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название</label>
            <input value={form.name || ''} onChange={set('name')} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Юр. название</label>
            <input
              value={form.companyName || ''}
              onChange={set('companyName')}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">ИНН</label>
            <input value={form.inn || ''} onChange={set('inn')} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Телефон</label>
            <input
              value={form.contactPhone || ''}
              onChange={set('contactPhone')}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              value={form.contactEmail || ''}
              onChange={set('contactEmail')}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Сайт</label>
            <input
              value={form.website || ''}
              onChange={set('website')}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}
