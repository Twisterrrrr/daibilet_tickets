type Keyword = string | RegExp;

function normalizeText(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text: string, keys: Keyword[]): boolean {
  for (const k of keys) {
    if (typeof k === 'string') {
      if (k.length > 0 && text.includes(k)) return true;
      continue;
    }
    if (k.test(text)) return true;
  }
  return false;
}

/**
 * Ticketscloud часто не даёт нормальную классификацию, поэтому используем keyword matrix
 * по title + description + organizer wording.
 *
 * Возвращает PRIMARY code (Subcategory.code) или null если сигналов нет.
 */
export function pickTicketscloudPrimaryCode(input: {
  title?: string | null;
  description?: string | null;
  organizer?: string | null;
}): string | null {
  const text = normalizeText(`${input.title || ''}\n${input.description || ''}\n${input.organizer || ''}`);

  // EVENTS
  if (
    hasAny(text, [
      'стендап',
      'стенд ап',
      'open mic',
      /(?:\bstandup\b|\bstand-up\b|\bstand up\b)/i,
      'комик',
    ])
  )
    return 'STANDUP';

  if (
    hasAny(text, [
      'иммерсивный',
      'погружение',
      'site-specific',
      /(?:\bimmersive\b)/i,
    ])
  )
    return 'IMMERSIVE_SHOWS';

  if (
    hasAny(text, [
      'детский спектакль',
      'утренник',
      'елка',
      'ёлка',
      'сказка',
      'для детей',
      'семейное шоу',
    ])
  )
    return 'KIDS_SHOWS';

  if (
    hasAny(text, [
      'мастер-класс',
      'мастер класс',
      'воркшоп',
      'практикум',
      /(?:\bworkshop\b)/i,
    ])
  )
    return 'MASTERCLASS';

  if (
    hasAny(text, [
      'вечеринка',
      'afterparty',
      'dj set',
      'рейв',
      'клубная ночь',
      /(?:\bparty\b)/i,
    ])
  )
    return 'PARTY';

  if (
    hasAny(text, [
      'оркестр',
      'симфонический',
      'jazz',
      'джаз',
      'рок-концерт',
      'рок концерт',
      'tribute',
      'трибьют',
      'музыкальный вечер',
      'живая музыка',
      /(?:\blive\b)/i,
      'концерт',
      /(?:\borchestra\b)/i,
    ])
  )
    return 'CONCERT';

  if (
    hasAny(text, [
      'балет',
      'опера',
      'театр',
      'спектакль',
      'постановка',
      'драма',
      'комедия',
      'сцена',
      'мюзикл',
      /(?:\btheater\b|\btheatre\b)/i,
      /(?:\bperformance\b|\bacting\b)/i,
    ])
  )
    return 'THEATER';

  if (
    hasAny(text, [
      'шоу-программа',
      'шоу программа',
      'шоу',
      'представление',
      'цирк',
      'иллюзия',
      'фокусник',
      'ледовое шоу',
      /(?:\bshow\b)/i,
    ])
  )
    return 'SHOW';

  if (
    hasAny(text, [
      'фестиваль',
      'open air',
      'open-air',
      /(?:\bfest\b|\bfestival\b|\bopen\s*air\b)/i,
    ])
  )
    return 'FESTIVAL';

  if (
    hasAny(text, [
      'лекция',
      'лекторий',
      'public talk',
      'дискуссия',
      'обсуждение',
      'конференция',
      'форум',
      'семинар',
      'встреча с',
    ])
  )
    return 'LECTURES';

  // EXCURSIONS
  if (
    hasAny(text, [
      'индивидуальная экскурсия',
      'персональный гид',
      /(?:\bprivate tour\b|\bprivate\b)/i,
    ])
  )
    return 'PRIVATE_TOURS';

  if (hasAny(text, ['ночная экскурсия', 'развод мостов', 'вечерняя экскурсия', 'ночью'])) return 'NIGHT_TOURS';

  if (hasAny(text, ['обзорная экскурсия', 'обзорный тур', 'городская экскурсия', 'обзорн', 'city tour']))
    return 'CITY_TOURS';

  if (
    hasAny(text, [
      'автобусная экскурсия',
      'на автобусе',
      'автобусный тур',
      /(?:\bbus\b)/i,
    ])
  )
    return 'BUS';

  if (
    hasAny(text, [
      'пешая экскурсия',
      'walking tour',
      'пешком',
      'прогулка с гидом',
      /(?:\bwalking\b)/i,
    ])
  )
    return 'WALKING';

  // Boat vs river market: сохраняем оба сигнала
  if (
    hasAny(text, [
      'экскурсия на теплоходе',
      'речная экскурсия с гидом',
      'водная экскурсия',
      /(?:\bboat\b)/i,
    ])
  )
    return 'BOAT_TOURS';

  if (
    hasAny(text, [
      'прогулка на теплоходе',
      'речная прогулка',
      'прогулка по реке',
      'прогулка по каналам',
    ])
  )
    return 'RIVER';

  if (
    hasAny(text, [
      'гастроэкскурсия',
      'гастрономическая экскурсия',
      'дегустация по городу',
      /(?:\bfood tour\b)/i,
    ])
  )
    return 'GASTRO';

  // MUSEUMS
  if (
    hasAny(text, [
      'планетарий',
      'звездное небо',
      'космос и звезды',
      'astronomy dome',
    ])
  )
    return 'PLANETARIUMS';

  if (hasAny(text, ['выставка', 'арт-выставка', 'exhibition', 'экспонаты'])) return 'EXHIBITION';

  if (hasAny(text, ['арт-пространство', 'art space', 'культурное пространство', 'центр современного искусства']))
    return 'ART_SPACE';

  if (hasAny(text, ['галерея', 'gallery', 'посещение галереи'])) return 'GALLERY';
  if (hasAny(text, ['дворец', 'palace', 'усадьба', 'резиденция'])) return 'PALACE';
  if (hasAny(text, ['ботанический сад', 'ландшафтный парк', 'парк', 'сад'])) return 'PARK';
  if (hasAny(text, ['музей', 'музейный', 'экспозиция', 'постоянная экспозиция', 'museums'])) return 'MUSEUM_CLASSIC';

  // ACTIVITIES
  if (
    hasAny(text, [
      'сап',
      'sup-board',
      'sup board',
      'сапборд',
      'каяк',
      'байдарка',
      'каноэ',
      'рафтинг',
      /\bsup\b/i,
    ])
  )
    return 'WATER_SPORTS';

  if (hasAny(text, ['зиплайн', 'роупджампинг', 'прыжок', 'экстрим', 'экстрим-парк'])) return 'EXTREME';

  if (hasAny(text, ['bike tour', 'bike ride', 'велопрогулка', 'велосипед', 'вело'])) return 'CYCLING';

  if (
    hasAny(text, [
      'trekking',
      'треккинг',
      'хайкинг',
      'поход',
      'outdoor',
      'прогулка на природе',
    ])
  )
    return 'OUTDOOR_ACTIVITIES';

  if (
    hasAny(text, [
      'марафон',
      'забег',
      'турнир',
      'матч',
      'соревнования',
      'чемпионат',
      'спортивное событие',
    ])
  )
    return 'SPORT_EVENTS';

  if (hasAny(text, ['картинг', /\bkarting\b/i])) return 'KARTING';
  if (hasAny(text, ['скалодром', 'альпинизм', 'боулдеринг', /\bclimbing\b/i])) return 'CLIMBING';

  // ENTERTAINMENT
  if (hasAny(text, ['escape room', 'эскейп рум', 'выбраться из комнаты'])) return 'ESCAPE_ROOMS';

  if (hasAny(text, ['квест', 'квиз-квест', /\bquest\b/i])) return 'QUESTS';

  if (hasAny(text, ['колесо обозрения', 'парк аттракционов', 'аттракцион'])) return 'ATTRACTIONS';

  if (hasAny(text, ['vr', 'ar', 'интерактивное шоу', 'интерактивная программа', 'интерактив'])) return 'INTERACTIVE_ENT';

  if (
    hasAny(text, [
      'детская комната',
      'детская активность',
      'детское развлечение',
      'для детей с участием',
    ])
  )
    return 'KIDS_ACTIVITIES';

  if (hasAny(text, ['настольные игры', 'игровая зона', 'game zone', 'игровое пространство'])) return 'GAME_ZONES';

  if (hasAny(text, ['смотровая площадка на крыше', 'на крыше', 'крыша', /\brooftop\b/i])) return 'ROOFTOP';

  return null;
}

