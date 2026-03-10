import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { FormActions, FormGrid, FormSection, PageHeader } from '@daibilet/shared-ui';

import { api } from '../../lib/api';

export default function EventEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '',
    cityId: '',
    description: '',
    shortDescription: '',
    category: 'EXCURSION',
    audience: 'ALL',
    durationMinutes: '',
    address: '',
    imageUrl: '',
    priceFrom: '',
  });

  useEffect(() => {
    api.get<any>('/cities').then((res) => setCities(res.items || res || []));
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
    <div className="max-w-2xl space-y-6">
      <PageHeader title={isNew ? 'Новое событие' : 'Редактирование события'} />
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Основная информация">
          <FormGrid>
            <div>
              <label className="mb-1 block text-sm font-medium">Название *</label>
              <input
                value={form.title}
                onChange={set('title')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Город *</label>
              <select
                value={form.cityId}
                onChange={set('cityId')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              >
                <option value="">Выберите город</option>
                {cities.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </FormGrid>
          <div>
            <label className="mb-1 block text-sm font-medium">Описание</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={4}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </FormSection>

        <FormSection title="Категория и аудитория">
          <FormGrid>
            <div>
              <label className="mb-1 block text-sm font-medium">Категория</label>
              <select
                value={form.category}
                onChange={set('category')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="EXCURSION">Экскурсия</option>
                <option value="EVENT">Мероприятие</option>
                <option value="MUSEUM">Музей</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Аудитория</label>
              <select
                value={form.audience}
                onChange={set('audience')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="ALL">Все</option>
                <option value="KIDS">Дети</option>
                <option value="FAMILY">Семьи</option>
              </select>
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title="Цена и логистика">
          <FormGrid columns={3}>
            <div>
              <label className="mb-1 block text-sm font-medium">Длительность (мин)</label>
              <input
                type="number"
                value={form.durationMinutes}
                onChange={set('durationMinutes')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Цена от (коп)</label>
              <input
                type="number"
                value={form.priceFrom}
                onChange={set('priceFrom')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Адрес</label>
              <input
                value={form.address}
                onChange={set('address')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title="Изображение">
          <div>
            <label className="mb-1 block text-sm font-medium">Изображение (URL)</label>
            <input
              value={form.imageUrl}
              onChange={set('imageUrl')}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>
        </FormSection>

        <FormActions
          primary={
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Сохранение...' : isNew ? 'Создать' : 'Сохранить'}
            </button>
          }
          secondary={
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="rounded-lg border px-6 py-2 text-sm hover:bg-gray-50"
            >
              Отмена
            </button>
          }
        />
      </form>
    </div>
  );
}
