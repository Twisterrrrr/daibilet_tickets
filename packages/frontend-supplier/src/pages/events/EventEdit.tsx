import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../lib/api';

export default function EventEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '', cityId: '', description: '', shortDescription: '',
    category: 'EXCURSION', audience: 'ALL', durationMinutes: '',
    address: '', imageUrl: '', priceFrom: '',
  });

  useEffect(() => {
    api.get<any>('/catalog/cities').then((res) => setCities(res.items || res || []));
    if (id) {
      api.get<any>(`/supplier/events/${id}`).then((event) => {
        setForm({
          title: event.title || '',
          cityId: event.cityId || '',
          description: event.description || '',
          shortDescription: event.shortDescription || '',
          category: event.category || 'EXCURSION',
          audience: event.audience || 'ALL',
          durationMinutes: event.durationMinutes?.toString() || '',
          address: event.address || '',
          imageUrl: event.imageUrl || '',
          priceFrom: event.priceFrom?.toString() || '',
        });
      });
    }
  }, [id]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...form,
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
      priceFrom: form.priceFrom ? Number(form.priceFrom) : null,
    };
    try {
      if (isNew) {
        await api.post('/supplier/events', payload);
        toast.success('Событие создано!');
      } else {
        await api.put(`/supplier/events/${id}`, payload);
        toast.success('Сохранено');
      }
      navigate('/events');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-6">{isNew ? 'Новое событие' : 'Редактирование'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border p-6">
        <div>
          <label className="block text-sm font-medium mb-1">Название *</label>
          <input value={form.title} onChange={set('title')} className="w-full px-3 py-2 border rounded-lg" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Город *</label>
          <select value={form.cityId} onChange={set('cityId')} className="w-full px-3 py-2 border rounded-lg" required>
            <option value="">Выберите город</option>
            {cities.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Описание</label>
          <textarea value={form.description} onChange={set('description')} rows={4} className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Категория</label>
            <select value={form.category} onChange={set('category')} className="w-full px-3 py-2 border rounded-lg">
              <option value="EXCURSION">Экскурсия</option>
              <option value="EVENT">Мероприятие</option>
              <option value="MUSEUM">Музей</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Аудитория</label>
            <select value={form.audience} onChange={set('audience')} className="w-full px-3 py-2 border rounded-lg">
              <option value="ALL">Все</option>
              <option value="KIDS">Дети</option>
              <option value="FAMILY">Семьи</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Длительность (мин)</label>
            <input type="number" value={form.durationMinutes} onChange={set('durationMinutes')} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Цена от (коп)</label>
            <input type="number" value={form.priceFrom} onChange={set('priceFrom')} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Адрес</label>
            <input value={form.address} onChange={set('address')} className="w-full px-3 py-2 border rounded-lg" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Изображение (URL)</label>
          <input value={form.imageUrl} onChange={set('imageUrl')} className="w-full px-3 py-2 border rounded-lg" placeholder="https://..." />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Сохранение...' : isNew ? 'Создать' : 'Сохранить'}
          </button>
          <button type="button" onClick={() => navigate('/events')}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50">Отмена</button>
        </div>
      </form>
    </div>
  );
}
