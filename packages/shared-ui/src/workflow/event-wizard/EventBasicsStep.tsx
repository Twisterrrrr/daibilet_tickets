import type { ChangeEvent } from 'react';

import type { MediaUploadAdapter } from '@daibilet/shared';
import { galleryItemsToUrls, legacyUrlToItem } from '@daibilet/shared';

import { ImageGalleryManager } from '../../media/ImageGalleryManager';
import { SingleImageUploader } from '../../media/SingleImageUploader';
import type {
  EventWizardBasicsDraft,
  EventWizardLocationOption,
  EventWizardSourceMetaDraft,
} from './EventWizard.types';

export interface EventBasicsStepProps {
  value: EventWizardBasicsDraft;
  onChange: (next: EventWizardBasicsDraft) => void;
  sourceMeta: EventWizardSourceMetaDraft;
  cities?: { id: string; name: string }[];
  /** Локации выбранного города (после cityId); для экскурсий — точка старта. */
  locationsForCity?: EventWizardLocationOption[];
  locationsLoading?: boolean;
  /** Если задан — обложка/галерея через Cloudinary upload pipeline. */
  mediaUpload?: MediaUploadAdapter;
}

export function EventBasicsStep({
  value,
  onChange,
  sourceMeta,
  cities,
  locationsForCity,
  locationsLoading,
  mediaUpload,
}: EventBasicsStepProps) {
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
        locationsForCity={locationsForCity}
        locationsLoading={locationsLoading}
      />
      <MediaEditor value={value} onChange={onChange} mediaUpload={mediaUpload} />
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
  locationsForCity?: EventWizardLocationOption[];
  locationsLoading?: boolean;
}

const LOCATION_TYPE_LABELS: Record<string, string> = {
  PIER: 'Причал',
  VENUE: 'Площадка',
  MEETING_POINT: 'Точка встречи',
  OTHER: 'Другое',
};

export function BasicsForm({
  value,
  onChange,
  handleChange,
  lockedFields,
  cities: _cities,
  locationsForCity = [],
  locationsLoading = false,
}: BasicsFormProps) {
  const locked = new Set(lockedFields ?? []);

  const handleCityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const cityId = e.target.value;
    onChange({
      ...value,
      cityId,
      startLocationId: '',
      locationProposalTitle: '',
      locationProposalAddress: '',
    });
  };

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value;
    if (category !== 'EXCURSION') {
      onChange({
        ...value,
        category,
        locationChoice: 'existing',
        startLocationId: '',
        locationProposalTitle: '',
        locationProposalAddress: '',
        locationProposalType: '',
      });
    } else {
      onChange({ ...value, category });
    }
  };

  return (
    <div className="rounded-xl border bg-white px-4 py-4 sm:px-6 sm:py-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Основная информация</h2>
        <p className="mt-1 text-xs text-slate-500">
          Название, город, категория; для экскурсий — точка старта маршрута после выбора города.
        </p>
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
            <label className="mb-1 block text-sm font-medium text-slate-800">Адрес страницы (URL)</label>
            <input
              value={value.slug}
              onChange={handleChange('slug')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-slate-400 focus:ring-0"
              placeholder="progulka-po-neve"
              disabled={locked.has('slug')}
            />
            <p className="mt-1 text-xs text-slate-500">
              Фрагмент ссылки на сайте (после /events/), латиницей и без пробелов.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">Город *</label>
            <select
              value={value.cityId}
              onChange={handleCityChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
              disabled={locked.has('cityId')}
            >
              <option value="">Выберите город</option>
              {_cities?.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">Категория *</label>
            <select
              value={value.category}
              onChange={handleCategoryChange}
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

        <ExcursionStartLocationBlock
          value={value}
          onChange={onChange}
          locations={locationsForCity}
          loading={locationsLoading}
          typeLabels={LOCATION_TYPE_LABELS}
        />

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
  mediaUpload?: MediaUploadAdapter;
}

export function MediaEditor({ value, onChange, mediaUpload }: MediaEditorProps) {
  if (mediaUpload) {
    const uploadOne = async (file: File) => {
      const r = await mediaUpload.uploadFiles([file]);
      if (!r[0]) throw new Error('Пустой ответ загрузки');
      return r[0];
    };
    const galleryItems = value.gallery.map((url, i) => legacyUrlToItem(url, i));

    return (
      <div className="rounded-xl border bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Медиа</h2>
          <p className="mt-1 text-xs text-slate-500">Обложка и галерея (загрузка в облако).</p>
        </div>
        <div className="space-y-6">
          <SingleImageUploader
            label="Обложка"
            value={value.coverImageUrl}
            onChange={(url) => onChange({ ...value, coverImageUrl: url })}
            uploadOne={uploadOne}
            hint="Перетащите файл или выберите с диска."
          />
          <ImageGalleryManager
            title="Галерея"
            description="Дополнительные фото. Можно менять порядок перетаскиванием."
            items={galleryItems}
            onChange={(next) => onChange({ ...value, gallery: galleryItemsToUrls(next) })}
            uploadFiles={mediaUpload.uploadFiles}
            deleteByPublicIds={mediaUpload.deleteByPublicIds}
            maxImages={30}
          />
        </div>
      </div>
    );
  }

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

interface ExcursionStartLocationBlockProps {
  value: EventWizardBasicsDraft;
  onChange: (next: EventWizardBasicsDraft) => void;
  locations: EventWizardLocationOption[];
  loading: boolean;
  typeLabels: Record<string, string>;
}

function ExcursionStartLocationBlock({
  value,
  onChange,
  locations,
  loading,
  typeLabels,
}: ExcursionStartLocationBlockProps) {
  if (value.category !== 'EXCURSION' || !value.cityId) {
    return null;
  }

  const labelForType = (t: string) => typeLabels[t] ?? t;

  return (
    <div className="space-y-3 rounded-lg border border-sky-100 bg-sky-50/40 px-4 py-4">
      <div>
        <div className="text-sm font-medium text-slate-900">Старт маршрута</div>
        <p className="mt-1 text-xs text-slate-600">
          Выберите точку из справочника для этого города или отправьте новую локацию на рассмотрение.
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name="excursion-location-mode"
            checked={value.locationChoice === 'existing'}
            onChange={() => onChange({ ...value, locationChoice: 'existing' })}
            className="border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          Из справочника
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name="excursion-location-mode"
            checked={value.locationChoice === 'propose'}
            onChange={() =>
              onChange({
                ...value,
                locationChoice: 'propose',
                startLocationId: '',
              })
            }
            className="border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          Предложить новую
        </label>
      </div>

      {value.locationChoice === 'existing' && (
        <div className="space-y-1">
          <label className="mb-1 block text-sm font-medium text-slate-800">Локация</label>
          <select
            value={value.startLocationId}
            onChange={(e) => onChange({ ...value, startLocationId: e.target.value })}
            disabled={loading}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0 disabled:opacity-60"
          >
            <option value="">{loading ? 'Загрузка…' : 'Выберите локацию'}</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.shortTitle || loc.title}
                {loc.type ? ` (${labelForType(loc.type)})` : ''}
              </option>
            ))}
          </select>
          {!loading && locations.length === 0 && (
            <p className="text-xs text-amber-800">
              В этом городе пока нет локаций в справочнике — переключитесь на «Предложить новую».
            </p>
          )}
        </div>
      )}

      {value.locationChoice === 'propose' && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">Название точки *</label>
            <input
              value={value.locationProposalTitle}
              onChange={(e) => onChange({ ...value, locationProposalTitle: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
              placeholder="Например: причал у Аничкова моста"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">Адрес / ориентир</label>
            <input
              value={value.locationProposalAddress}
              onChange={(e) => onChange({ ...value, locationProposalAddress: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
              placeholder="Необязательно"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">Тип</label>
            <select
              value={value.locationProposalType}
              onChange={(e) => onChange({ ...value, locationProposalType: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
            >
              <option value="">По умолчанию (другое)</option>
              <option value="PIER">Причал</option>
              <option value="VENUE">Площадка</option>
              <option value="MEETING_POINT">Точка встречи</option>
              <option value="OTHER">Другое</option>
            </select>
          </div>
        </div>
      )}
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

