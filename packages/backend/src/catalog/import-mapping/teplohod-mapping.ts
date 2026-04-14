import type { EventCategory } from '@/prisma-client';

function norm(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Best-effort маппинг teplohod.info category → PRIMARY code.
 * Не заменяет keyword-классификацию; это быстрый сигнал на случай шумного текста.
 */
export function mapTeplohodExternalCategoryToPrimaryCode(input: {
  category: EventCategory;
  externalCategoryRaw?: string | null;
}): string | null {
  const s = norm(input.externalCategoryRaw);
  if (!s) return null;

  if (input.category === 'EXCURSION') {
    if (s.includes('ноч') || s.includes('мост')) return 'NIGHT_TOURS';
    if (s.includes('рек') || s.includes('канал') || s.includes('нева')) return 'RIVER';
    if (s.includes('теплоход') || s.includes('катер') || s.includes('яхт') || s.includes('круиз')) return 'BOAT_TOURS';
    if (s.includes('автоб')) return 'BUS';
    if (s.includes('индив') || s.includes('private')) return 'PRIVATE_TOURS';
    if (s.includes('обзор') || s.includes('город')) return 'CITY_TOURS';
    if (s.includes('гастро') || s.includes('дегуст') || s.includes('food')) return 'GASTRO';
    if (s.includes('крыш')) return 'ROOFTOP';
    if (s.includes('экстрим') || s.includes('зип') || s.includes('роуп')) return 'EXTREME';
    if (s.includes('пеш') || s.includes('walking')) return 'WALKING';
  }

  if (input.category === 'MUSEUM') {
    if (s.includes('планетар')) return 'PLANETARIUMS';
    if (s.includes('выстав')) return 'EXHIBITION';
    if (s.includes('галере')) return 'GALLERY';
    if (s.includes('дворц') || s.includes('усад')) return 'PALACE';
    if (s.includes('парк') || s.includes('сад')) return 'PARK';
    if (s.includes('арт') || s.includes('простран')) return 'ART_SPACE';
    if (s.includes('музей') || s.includes('экспозиц')) return 'MUSEUM_CLASSIC';
  }

  if (input.category === 'EVENT') {
    if (s.includes('стендап') || s.includes('stand')) return 'STANDUP';
    if (s.includes('театр') || s.includes('спектак')) return 'THEATER';
    if (s.includes('концерт') || s.includes('jazz') || s.includes('рок')) return 'CONCERT';
    if (s.includes('фестив')) return 'FESTIVAL';
    if (s.includes('лекц') || s.includes('лектор')) return 'LECTURES';
    if (s.includes('дет') || s.includes('ёлк') || s.includes('утрен')) return 'KIDS_SHOWS';
    if (s.includes('иммерсив') || s.includes('immersive')) return 'IMMERSIVE_SHOWS';
    if (s.includes('мастер') || s.includes('workshop')) return 'MASTERCLASS';
    if (s.includes('вечерин') || s.includes('party') || s.includes('dj')) return 'PARTY';
    if (s.includes('спорт') || s.includes('матч') || s.includes('турнир')) return 'SPORT_EVENTS';
    if (s.includes('шоу') || s.includes('мюзикл') || s.includes('цирк')) return 'SHOW';
  }

  return null;
}

