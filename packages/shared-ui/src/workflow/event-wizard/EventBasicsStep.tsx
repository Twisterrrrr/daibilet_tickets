import type { ChangeEvent } from 'react';

import type { EventWizardBasicsDraft, EventWizardSourceMetaDraft } from './EventWizard.types';

export interface EventBasicsStepProps {
  value: EventWizardBasicsDraft;
  onChange: (next: EventWizardBasicsDraft) => void;
  sourceMeta: EventWizardSourceMetaDraft;
  cities?: { id: string; name: string }[];
}

export function EventBasicsStep({ value, onChange, sourceMeta, cities }: EventBasicsStepProps) {
  const handleChange =
    (key: keyof EventWizardBasicsDraft) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      onChange({ ...value, [key]: e.target.value });
    };

  return (
    <div className="space-y-6">
      {sourceMeta.sourceType === 'imported' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 sm:px-5">
          <div className="font-semibold">Импортированное событие</div>
          <p className="mt-1">
            Основные данные пришли из внешнего источника. Часть полей (город, поставщик, категория) может быть
            заблокирована для редактирования в Daibilet и управляется синхронизацией.
          </p>
        </div>
      )}
      <BasicsForm
        value={value}
        onChange={onChange}
        handleChange={handleChange}
        lockedFields={sourceMeta.lockedFields}
        cities={cities}
      />
      <MediaEditor value={value} onChange={onChange} />
    </div>
  );
}

interface BasicsFormProps {
  value: EventWizardBasicsDraft;
  onChange: (next: EventWizardBasicsDraft) => void;
  handleChange: (
    key: keyof EventWizardBasicsDraft,
  ) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  lockedFields?: string[];
  cities?: { id: string; name: string }[];
}

export function BasicsForm({ value, handleChange, lockedFields, cities }: BasicsFormProps) {
  const locked = new Set(lockedFields ?? []);

  return (
    <div className="rounded-xl border bg-white px-4 py-4 sm:px-6 sm:py-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Основная информация</h2>
        <p className="mt-1 text-xs text-slate-500">Название, категория, город и площадка события.</p>
      </div>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">Название *</label>
            <input
              value={value.title}
              onChange={handleChange('title')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
              placeholder="Прогулка по Неве..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">Slug</label>
            <input
              value={value.slug}
              onChange={handleChange('slug')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-slate-400 focus:ring-0"
              placeholder="progulka-po-neve"
              disabled={locked.has('slug')}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">Категория *</label>
            <select
              value={value.category}
              onChange={handleChange('category')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
              disabled={locked.has('category')}
            >
              <option value="">Выберите категорию</option>
              <option value="EXCURSION">Экскурсии</option>
              <option value="MUSEUM">Музеи</option>
              <option value="EVENT">Мероприятия</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">Город *</label>
            <select
              value={value.cityId}
              onChange={handleChange('cityId')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
              disabled={locked.has('cityId')}
            >
              <option value="">Выберите город</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">Поставщик</label>
            <select
              value={value.supplierId ?? ''}
              onChange={handleChange('supplierId')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
              disabled={locked.has('supplierId')}
            >
              <option value="">Не выбран</option>
            </select>
          </div>
        </div>

        <VenueSelector value={value} onChange={onChange} />

        <div className="space-y-2">
          <label className="mb-1 block text-sm font-medium text-slate-800">Короткое описание</label>
          <textarea
            value={value.shortDescription}
            onChange={handleChange('shortDescription')}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
            placeholder="Короткое описание для карточки события."
          />
        </div>

        <div className="space-y-2">
          <label className="mb-1 block text-sm font-medium text-slate-800">Полное описание</label>
          <textarea
            value={value.fullDescription}
            onChange={handleChange('fullDescription')}
            rows={5}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
            placeholder="Полное описание события для лендинга и SEO."
          />
        </div>
      </div>
    </div>
  );
}

export interface MediaEditorProps {
  value: EventWizardBasicsDraft;
  onChange: (next: EventWizardBasicsDraft) => void;
}

export function MediaEditor({ value, onChange }: MediaEditorProps) {
  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, coverImageUrl: e.target.value });
  };

  const handleGalleryChange = (index: number, url: string) => {
    const nextGallery = [...value.gallery];
    nextGallery[index] = url;
    onChange({ ...value, gallery: nextGallery });
  };

  const handleAddGalleryItem = () => {
    onChange({ ...value, gallery: [...value.gallery, ''] });
  };

  const handleRemoveGalleryItem = (index: number) => {
    const nextGallery = value.gallery.filter((_, i) => i !== index);
    onChange({ ...value, gallery: nextGallery });
  };

  return (
    <div className="rounded-xl border bg-white px-4 py-4 sm:px-6 sm:py-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Медиа</h2>
        <p className="mt-1 text-xs text-slate-500">Обложка и галерея события.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="mb-1 block text-sm font-medium text-slate-800">Обложка (URL)</label>
          <input
            value={value.coverImageUrl}
            onChange={handleCoverChange}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-sm font-medium text-slate-800">Галерея (URL)</label>
            <button
              type="button"
              onClick={handleAddGalleryItem}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            >
              Добавить
            </button>
          </div>
          <div className="space-y-2">
            {value.gallery.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={url}
                  onChange={(e) => handleGalleryChange(index, e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() => handleRemoveGalleryItem(index)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>
            ))}
            {value.gallery.length === 0 && (
              <p className="text-xs text-slate-500">Пока нет дополнительных изображений.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface VenueSelectorProps {
  value: EventWizardBasicsDraft;
  onChange: (next: EventWizardBasicsDraft) => void;
}

export function VenueSelector({ value, onChange }: VenueSelectorProps) {
  const handleVenueChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value || null;
    onChange({ ...value, venueId: v });
  };

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-sm font-medium text-slate-800">Площадка</label>
      <select
        value={value.venueId ?? ''}
        onChange={handleVenueChange}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
      >
        <option value="">Не выбрана</option>
      </select>
      <p className="text-xs text-slate-500">
        Свяжите событие с площадкой (музеем, залом и т.п.), чтобы использовать её в других разделах.
      </p>
    </div>
  );
}

