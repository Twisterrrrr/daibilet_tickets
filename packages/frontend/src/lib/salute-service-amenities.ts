import { EventSubcategory, type EventListItem } from '@daibilet/shared';

/** Те же пять услуг, что на карточке: еда, музыка/DJ, экскурсовод, аудиогид, открытая палуба */
export type SaluteToolbarFacetsKey = keyof SaluteServices;

export type SaluteToolbarFacets = Record<SaluteToolbarFacetsKey, boolean>;

export const DEFAULT_SALUTE_FACETS: SaluteToolbarFacets = {
  food: false,
  music: false,
  guide: false,
  audioguide: false,
  deck: false,
};

export type SaluteServices = {
  /** Питание в программе (борт, ресторан, фуршет) */
  food: boolean;
  /** Музыка / концертная программа */
  music: boolean;
  /** Гид / экскурсионное сопровождение */
  guide: boolean;
  /** Аудиогид */
  audioguide: boolean;
  /** Открытая палуба / уличная / крыша с обзором */
  deck: boolean;
};

/**
 * Наличие услуг по подкатегориям и тексту карточки (title + shortDescription).
 * Явные формулировки «без питания» отключают food даже при смежных признаках.
 */
export function deriveSaluteServices(e: EventListItem): SaluteServices {
  const text = `${e.title} ${e.shortDescription ?? ''}`;
  const lower = text.toLowerCase();
  const subs = new Set(e.subcategories ?? []);

  const explicitNoFood =
    /без\s*питан|без\s*обеда|не\s*включает\s*питан|питание\s+не\s+включ|ужин\s+не\s+включ/i.test(
      text,
    );

  let food =
    subs.has(EventSubcategory.GASTRO) ||
    /питан|ужин|банкет|фуршет|меню|ресторан|шведск|еда\s+на\s+борту|ковёр/i.test(lower);

  if (explicitNoFood) food = false;

  const music =
    subs.has(EventSubcategory.CONCERT) ||
    subs.has(EventSubcategory.JAZZ) ||
    subs.has(EventSubcategory.SHOW) ||
    subs.has(EventSubcategory.PARTY) ||
    subs.has(EventSubcategory.FESTIVAL) ||
    subs.has(EventSubcategory.GASTRO) ||
    /музык|концерт|dj|живой\s+звук|оркестр|вечеринк/i.test(lower);

  const guide =
    subs.has(EventSubcategory.BUS) ||
    subs.has(EventSubcategory.WALKING) ||
    subs.has(EventSubcategory.COMBINED) ||
    subs.has(EventSubcategory.QUEST) ||
    subs.has(EventSubcategory.EXTREME) ||
    subs.has(EventSubcategory.RIVER) ||
    /экскурс|гид\b|ведущ|рассказчик|программ/i.test(lower);

  const audioguide =
    subs.has(EventSubcategory.BUS) || /аудиогид|наушник|audio\s*guide/i.test(lower);

  const deck =
    subs.has(EventSubcategory.RIVER) ||
    subs.has(EventSubcategory.ROOFTOP) ||
    /палуб|открыт\w*\s+палуб|крыш/i.test(lower);

  return { food, music, guide, audioguide, deck };
}

/** Одна активная кнопка тулбара: у события есть эта услуга? */
export function eventMatchesToolbarFacet(e: EventListItem, facet: SaluteToolbarFacetsKey): boolean {
  return deriveSaluteServices(e)[facet];
}

/** Все включённые фасеты (AND). */
export function matchesSaluteToolbarFacets(
  e: EventListItem,
  facets: SaluteToolbarFacets | undefined,
): boolean {
  if (!facets) return true;
  const active = (Object.keys(facets) as SaluteToolbarFacetsKey[]).filter((k) => facets[k]);
  if (active.length === 0) return true;
  return active.every((k) => eventMatchesToolbarFacet(e, k));
}
