import type { EventSubcategory } from '@prisma/client';

function norm(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function pickBoatVsRiverFromText(text: string): 'BOAT_TOURS' | 'RIVER' | null {
  // Align with keyword classifier semantics but used as fallback when keyword matrix had no match.
  const t = norm(text);
  if (!t) return null;

  const has = (w: string) => t.includes(w);

  const boatSignals = [
    'экскурсия на теплоходе',
    'речная экскурсия с гидом',
    'водная экскурсия',
    'boat',
    'экскурсия по рекам',
    'экскурсия по каналам',
    'с гидом',
  ].some(has);
  if (boatSignals) return 'BOAT_TOURS';

  const riverSignals = ['прогулка на теплоходе', 'речная прогулка', 'прогулка по реке', 'прогулка по каналам'].some(has);
  if (riverSignals) return 'RIVER';

  // Generic water words without “excursion” are better treated as BOAT_TOURS.
  const genericWater = ['теплоход', 'катер', 'яхт', 'круиз', 'river', 'canal', 'канал', 'река'].some(has);
  if (genericWater) return 'BOAT_TOURS';

  return null;
}

/**
 * Преобразует legacy EventSubcategory (enum) в актуальные PRIMARY codes.
 * Нужен, потому что базовый classifier (`event-classifier.ts`) исторически возвращает старые коды
 * (например SPORT/QUEST), а канонический справочник PRIMARY уже переехал на новые коды
 * (SPORT_EVENTS/QUESTS и т.п.).
 */
export function mapTicketscloudLegacyPrimaryToCanonicalPrimaryCode(input: {
  category: string;
  legacy?: EventSubcategory[] | null;
  allowedPrimaryCodes: readonly string[];
  title?: string | null;
  description?: string | null;
}): string | null {
  const legacyArr = Array.isArray(input.legacy) ? input.legacy : [];
  if (legacyArr.length === 0) return null;

  const mapped = legacyArr.map((c) => {
    if (c === 'SPORT') return 'SPORT_EVENTS';
    if (c === 'QUEST') return 'QUESTS';
    if (c === 'COMBINED') return 'WALKING';
    if (c === 'RIVER') {
      const pick = pickBoatVsRiverFromText(`${input.title || ''}\n${input.description || ''}`);
      return pick ?? 'RIVER';
    }
    return c;
  });

  for (const code of mapped) {
    if (input.allowedPrimaryCodes.includes(code)) return code;
  }

  return null;
}

