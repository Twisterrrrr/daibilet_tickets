import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/client';

export function UpsellEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    title: '',
    description: '',
    priceKopecks: 0,
    category: 'food',
    citySlug: '',
    icon: '',
    isActive: true,
    sortOrder: 0,
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isNew) {
      adminApi.get(`/admin/upsells/${id}`).then((data: any) => {
        setForm({
          title: data.title || '',
          description: data.description || '',
          priceKopecks: data.priceKopecks || 0,
          category: data.category || 'food',
          citySlug: data.citySlug || '',
          icon: data.icon || '',
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder || 0,
        });
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, citySlug: form.citySlug || null };
      if (isNew) {
        await adminApi.post('/admin/upsells', payload);
      } else {
        await adminApi.patch(`/admin/upsells/${id}`, payload);
      }
      navigate('/upsells');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-400">Загрузка...</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-gray-900">
        {isNew ? 'Новый Upsell' : 'Редактировать Upsell'}
      </h1>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Название</label>
            <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Иконка</label>
            <input value={form.icon} onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="🍽️" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Описание</label>
          <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Цена (коп.)</label>
            <input type="number" value={form.priceKopecks}
              onChange={(e) => setForm(f => ({ ...f, priceKopecks: Number(e.target.value) }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <p className="mt-0.5 text-xs text-gray-400">{(form.priceKopecks / 100).toLocaleString('ru-RU')} ₽</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Категория</label>
            <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="food">food</option>
              <option value="transport">transport</option>
              <option value="vip">vip</option>
              <option value="photo">photo</option>
              <option value="souvenir">souvenir</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Город (slug)</label>
            <input value={form.citySlug} onChange={(e) => setForm(f => ({ ...f, citySlug: e.target.value }))}
              placeholder="Пусто = все" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Порядок сортировки</label>
            <input type="number" value={form.sortOrder}
              onChange={(e) => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive}
                onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="rounded" />
              Активен
            </label>
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button onClick={() => navigate('/upsells')}
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
