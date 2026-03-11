/**
 * Schema registry для category/subcategory и venueType.
 * Основа для генерации админ-форм и валидации полей.
 *
 * @see docs/PageTemplateSpecs.md §7
 */

// Avoid circular import - use string literals for category/venueType

export type StorageKind = 'COLUMN' | 'CONTENT_JSON';

export type InputType = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'richtext';

export interface TemplateFieldSpec {
  key: string;
  label: string;
  storage: StorageKind;
  required: boolean;
  inputType: InputType;
  categories?: string[];
  subcategories?: string[];
  venueTypes?: string[];
}

export interface TemplateSection {
  key: string;
  title: string;
  fields: TemplateFieldSpec[];
}

export interface TemplateSpec {
  entity: 'EVENT' | 'VENUE';
  type: string;
  sections: TemplateSection[];
}

// ─── Event category/subcategory specs ───────────────────────────────────

export const EVENT_EXCURSION_FIELDS: TemplateFieldSpec[] = [
  { key: 'routeSummary', label: 'Маршрут (коротко)', storage: 'COLUMN', required: false, inputType: 'text', categories: ['EXCURSION'] },
  { key: 'meetingPoint', label: 'Точка сбора', storage: 'COLUMN', required: false, inputType: 'text', categories: ['EXCURSION'] },
  { key: 'routeDescription', label: 'Описание маршрута', storage: 'CONTENT_JSON', required: false, inputType: 'richtext', subcategories: ['RIVER', 'BUS', 'WALKING', 'GASTRO'] },
  { key: 'menu', label: 'Меню', storage: 'CONTENT_JSON', required: false, inputType: 'textarea', subcategories: ['RIVER', 'GASTRO'] },
  { key: 'bookingRules', label: 'Условия бронирования', storage: 'CONTENT_JSON', required: false, inputType: 'richtext', categories: ['EXCURSION'] },
  { key: 'visitorTips', label: 'Советы посетителям', storage: 'CONTENT_JSON', required: false, inputType: 'textarea' },
];

export const EVENT_EVENT_FIELDS: TemplateFieldSpec[] = [
  { key: 'program', label: 'Программа / сет-лист', storage: 'CONTENT_JSON', required: false, inputType: 'richtext', categories: ['EVENT'] },
  { key: 'cast', label: 'Состав', storage: 'CONTENT_JSON', required: false, inputType: 'textarea', subcategories: ['CONCERT', 'SHOW', 'THEATER'] },
  { key: 'bookingRules', label: 'Условия бронирования', storage: 'CONTENT_JSON', required: false, inputType: 'richtext' },
  { key: 'visitorTips', label: 'Советы посетителям', storage: 'CONTENT_JSON', required: false, inputType: 'textarea' },
];

export const EVENT_MUSEUM_FIELDS: TemplateFieldSpec[] = [
  { key: 'visitRules', label: 'Правила посещения', storage: 'CONTENT_JSON', required: false, inputType: 'richtext', categories: ['MUSEUM'] },
  { key: 'bookingRules', label: 'Условия бронирования', storage: 'CONTENT_JSON', required: false, inputType: 'richtext' },
];

// ─── Venue type specs ───────────────────────────────────────────────────

export const VENUE_MUSEUM_FIELDS: TemplateFieldSpec[] = [
  { key: 'collections', label: 'Коллекции', storage: 'CONTENT_JSON', required: false, inputType: 'textarea', venueTypes: ['MUSEUM'] },
  { key: 'currentExhibitions', label: 'Текущие выставки', storage: 'CONTENT_JSON', required: false, inputType: 'richtext' },
  { key: 'permanentExhibitions', label: 'Постоянные экспозиции', storage: 'CONTENT_JSON', required: false, inputType: 'richtext' },
  { key: 'audioGuide', label: 'Аудиогид', storage: 'CONTENT_JSON', required: false, inputType: 'boolean' },
  { key: 'interactive', label: 'Интерактивные экспонаты', storage: 'CONTENT_JSON', required: false, inputType: 'boolean' },
];

export const VENUE_THEATER_FIELDS: TemplateFieldSpec[] = [
  { key: 'halls', label: 'Залы', storage: 'CONTENT_JSON', required: false, inputType: 'textarea', venueTypes: ['THEATER'] },
  { key: 'acoustics', label: 'Акустика', storage: 'CONTENT_JSON', required: false, inputType: 'text' },
  { key: 'cloakroom', label: 'Гардероб', storage: 'CONTENT_JSON', required: false, inputType: 'boolean' },
];

export const VENUE_PARK_FIELDS: TemplateFieldSpec[] = [
  { key: 'seasonality', label: 'Сезонность', storage: 'CONTENT_JSON', required: false, inputType: 'text', venueTypes: ['PARK', 'PALACE'] },
  { key: 'accessibilityNotes', label: 'Доступность', storage: 'CONTENT_JSON', required: false, inputType: 'textarea' },
];

/** Получить specs для события по category/subcategory */
export function getEventTemplateSpecs(category: string, subcategories?: string[]): TemplateFieldSpec[] {
  const all: TemplateFieldSpec[] = [];
  const add = (specs: TemplateFieldSpec[]) => {
    for (const s of specs) {
      if (!s.categories || s.categories.includes(category)) {
        if (!s.subcategories || !subcategories?.length || subcategories.some((sc) => s.subcategories?.includes(sc))) {
          all.push(s);
        }
      }
    }
  };
  add(EVENT_EXCURSION_FIELDS);
  add(EVENT_EVENT_FIELDS);
  add(EVENT_MUSEUM_FIELDS);
  return all;
}

/** Получить specs для площадки по venueType */
export function getVenueTemplateSpecs(venueType: string): TemplateFieldSpec[] {
  const all: TemplateFieldSpec[] = [];
  const add = (specs: TemplateFieldSpec[]) => {
    for (const s of specs) {
      if (!s.venueTypes || s.venueTypes.includes(venueType)) all.push(s);
    }
  };
  add(VENUE_MUSEUM_FIELDS);
  add(VENUE_THEATER_FIELDS);
  add(VENUE_PARK_FIELDS);
  return all;
}
