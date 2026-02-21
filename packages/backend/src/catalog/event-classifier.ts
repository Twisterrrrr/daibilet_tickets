/**
 * Универсальный классификатор событий.
 * Используется в tc-sync, tep-sync и скрипте reclassify-events.
 */
import type { EventCategory, EventSubcategory, EventAudience } from '@prisma/client';

export interface ClassifyResult {
  category: EventCategory;
  subcategories: EventSubcategory[];
  audience: EventAudience;
}

function has(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

/**
 * Определяет category, subcategories и audience по title + description.
 */
export function classify(title: string, description: string, tags: string[] = []): ClassifyResult {
  const text = `${title} ${description} ${tags.join(' ')}`.toLowerCase();
  const subs: EventSubcategory[] = [];

  // --- Detect audience (kids/family) ---
  const kidsMarkers = ['для детей', 'детский', 'детское', 'детская', 'детям', 'ребёнк', 'ребенк', 'малыш', 'kids', 'children', '0+', '3+', '4+', '5+', '6+'];
  const familyMarkers = ['семейн', 'family', 'для всей семьи'];
  let audience: EventAudience = 'ALL';
  if (kidsMarkers.some((w) => text.includes(w))) {
    audience = 'KIDS';
  } else if (familyMarkers.some((w) => text.includes(w))) {
    audience = 'FAMILY';
  }

  const titleLower = title.toLowerCase();

  // --- 0. Явная автобусная экскурсия ---
  if (
    (titleLower.includes('экскурси') || titleLower.includes('обзорн')) &&
    (titleLower.includes('автобус') || titleLower.includes('bus') || titleLower.includes('автобусн'))
  ) {
    return { category: 'EXCURSION', subcategories: ['BUS'], audience };
  }

  // --- 1. EVENT ---
  const isStandup = has(text, ['стендап', 'stand-up', 'stand up', 'комедия', 'comedy', 'комик']);
  if (has(text, ['концерт', 'concert', 'выступлен', 'tribute', 'трибьют', 'джаз', 'jazz', 'рок ', 'rock ', 'битлов', 'beatles', 'песни майк', 'песни beatles'])) subs.push('CONCERT');
  if (isStandup) subs.push('STANDUP');
  if (has(text, ['театр', 'спектакл', 'theater', 'theatre', 'драм', 'опер', 'балет'])) subs.push('THEATER');
  if (!isStandup && has(text, ['шоу', 'show', 'представлен', 'цирк', 'иллюзион', 'магическ'])) subs.push('SHOW');
  if (has(text, ['фестиваль', 'festival', 'fest '])) subs.push('FESTIVAL');
  if (!isStandup && has(text, ['спорт', 'sport', 'матч', 'хоккей', 'футбол', 'баскетбол', 'бег', 'марафон'])) subs.push('SPORT');
  if (has(text, ['мастер-класс', 'мастер класс', 'masterclass', 'workshop', 'воркшоп', 'мастер-', 'лекция', 'лекцию', 'лектори', 'lecture'])) subs.push('MASTERCLASS');
  if (has(text, ['вечеринк', 'party', 'дискотек', 'клуб '])) subs.push('PARTY');
  if (subs.length > 0) return { category: 'EVENT', subcategories: subs, audience };

  // --- 2. EXCURSION ---
  const isExcursion = has(text, ['экскурси', 'excursion', 'тур ', ' тур', 'tour', 'прогулк', 'обзорн']);
  const isWaterTrip = has(text, ['с воды', 'теплоход', 'речн', 'катер', 'круиз', 'по неве', 'по реке', 'водн', 'корабл', 'яхт', 'canal', 'boat', 'развод мостов']);
  if (isExcursion || isWaterTrip || has(text, ['квест', 'quest'])) {
    if (has(text, ['танк', 'танке', 'квадроцикл', 'стрельб', 'экстрим', 'броневик'])) subs.push('EXTREME');
    const isBusTour = has(text, ['автобус', 'bus', 'hop-on', 'hop on']);
    if (!isBusTour && has(text, ['речн', 'теплоход', 'корабл', 'катер', 'яхт', 'водн', 'canal', 'boat', 'по неве', 'по реке', 'по каналам', 'развод мостов', 'разводные мосты', 'с воды', 'салют', 'круиз'])) subs.push('RIVER');
    if (has(text, ['автобус', 'bus'])) subs.push('BUS');
    if (has(text, ['пешеходн', 'пешком', 'walking', 'двор', 'улиц', 'район'])) subs.push('WALKING');
    const isCamp = has(text, ['лагерь', 'camp', 'выездной']);
    if (!isCamp && has(text, ['гастро', 'гастрономич', 'дегустац', 'food tour', 'gastro', 'culinary'])) subs.push('GASTRO');
    if (has(text, ['крыш', 'rooftop'])) subs.push('ROOFTOP');
    if (has(text, ['квест', 'quest'])) subs.push('QUEST');
    if (has(text, ['комбинирован', 'комбо'])) subs.push('COMBINED');
    if (subs.length === 0 && has(text, ['прогулк', 'обзорн'])) subs.push('WALKING');
    return { category: 'EXCURSION', subcategories: subs, audience };
  }

  // --- 3. MUSEUM ---
  if (has(text, ['музей', 'музеи', 'museum'])) subs.push('MUSEUM_CLASSIC');
  if (has(text, ['выставк', 'exhibition', 'экспозиц'])) subs.push('EXHIBITION');
  if (has(text, ['галерея', 'gallery'])) subs.push('GALLERY');
  if (has(text, ['дворец', 'дворц', 'усадьб', 'palace', 'manor'])) subs.push('PALACE');
  if (has(text, ['заповедник', 'ботаническ', 'парк-музей'])) subs.push('PARK');
  if (subs.length > 0) return { category: 'MUSEUM', subcategories: subs, audience };

  return { category: 'EVENT', subcategories: [], audience };
}
