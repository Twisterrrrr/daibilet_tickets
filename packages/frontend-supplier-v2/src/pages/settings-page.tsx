import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '@/shared/lib/api';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { LoadingBlock, PageHeader, SectionCard } from '@/shared/ui/page-primitives';
import { SupplierSettingsNav } from '@/shared/ui/supplier-settings-nav';

type SettingsForm = Record<string, string | number | boolean | null | undefined>;

export function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    api
      .get<SettingsForm>('/supplier/settings')
      .then(setForm)
      .finally(() => setInitialLoading(false));
  }, []);

  const set =
    (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/supplier/settings', form);
      window.alert('Настройки сохранены');
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Настройки компании" glyph={<PageGlyph icon={SlidersHorizontal} tone="violet" />} />
        <SupplierSettingsNav />
        <LoadingBlock label="Загружаем настройки…" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Настройки компании" glyph={<PageGlyph icon={SlidersHorizontal} tone="violet" />} />
      <SupplierSettingsNav />

      <SectionCard title="Тариф и доверие">
        <div className="grid gap-3 sm:grid-cols-2 text-small">
          <div>
            <span className="text-text-muted">Комиссия:</span>{' '}
            <span className="font-medium text-text-primary">
              {form.commissionRate != null
                ? `${(Number(form.commissionRate) * 100).toFixed(0)}%`
                : '—'}
            </span>
          </div>
          <div>
            <span className="text-text-muted">Trust Level:</span>{' '}
            <span className="font-medium text-text-primary">{String(form.trustLevel ?? '—')}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-text-muted">Верификация:</span>{' '}
            <span className={form.verifiedAt ? 'font-medium text-success' : 'font-medium text-text-muted'}>
              {form.verifiedAt ? 'Пройдена' : 'Не пройдена'}
            </span>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Данные компании">
        <form onSubmit={handleSubmit} className="space-y-4 text-small">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-label text-text-muted">Название</label>
              <input
                value={String(form.name ?? '')}
                onChange={set('name')}
                className="w-full rounded-control border border-border-soft px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-label text-text-muted">Юр. название</label>
              <input
                value={String(form.companyName ?? '')}
                onChange={set('companyName')}
                className="w-full rounded-control border border-border-soft px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-label text-text-muted">ИНН</label>
              <input
                value={String(form.inn ?? '')}
                onChange={set('inn')}
                className="w-full rounded-control border border-border-soft px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-label text-text-muted">Телефон</label>
              <input
                value={String(form.contactPhone ?? '')}
                onChange={set('contactPhone')}
                className="w-full rounded-control border border-border-soft px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-label text-text-muted">Email</label>
              <input
                type="email"
                value={String(form.contactEmail ?? '')}
                onChange={set('contactEmail')}
                className="w-full rounded-control border border-border-soft px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-label text-text-muted">Сайт</label>
              <input
                value={String(form.website ?? '')}
                onChange={set('website')}
                className="w-full rounded-control border border-border-soft px-3 py-2 outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-control bg-accent px-4 py-2 text-label font-medium text-accent-foreground disabled:opacity-50"
            >
              {loading ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
