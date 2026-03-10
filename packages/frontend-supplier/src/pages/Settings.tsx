import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { FormActions, FormGrid, FormSection, LoadingState, PageHeader, SectionCard } from '@daibilet/shared-ui';

import { api } from '../lib/api';

export default function Settings() {
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    api
      .get<any>('/supplier/settings')
      .then((res) => setForm(res))
      .finally(() => setInitialLoading(false));
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

  if (initialLoading) {
    return <LoadingState label="Загружаем настройки компании..." />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Настройки компании" />

      <SectionCard title="Ваш тариф">
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
                <span className="text-xs text-gray-400">
                  {' '}
                  до {new Date(form.promoUntil).toLocaleDateString('ru')}
                </span>
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
      </SectionCard>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSection title="Данные компании">
          <FormGrid>
            <div>
              <label className="mb-1 block text-sm font-medium">Название</label>
              <input
                value={form.name || ''}
                onChange={set('name')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Юр. название</label>
              <input
                value={form.companyName || ''}
                onChange={set('companyName')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </FormGrid>
          <FormGrid>
            <div>
              <label className="mb-1 block text-sm font-medium">ИНН</label>
              <input
                value={form.inn || ''}
                onChange={set('inn')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Телефон</label>
              <input
                value={form.contactPhone || ''}
                onChange={set('contactPhone')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </FormGrid>
          <FormGrid>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                value={form.contactEmail || ''}
                onChange={set('contactEmail')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Сайт</label>
              <input
                value={form.website || ''}
                onChange={set('website')}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </FormGrid>
          <FormActions
            primary={
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            }
          />
        </FormSection>
      </form>
    </div>
  );
}
