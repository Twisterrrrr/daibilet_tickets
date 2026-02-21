/**
 * Склонение названий городов в предложный падеж для «в {город}».
 * Москва → Москве, Санкт-Петербург → Санкт-Петербурге
 */

const CITY_PREPOSITIONAL: Record<string, string> = {
  Москва: 'Москве',
  'Санкт-Петербург': 'Санкт-Петербурге',
  Казань: 'Казани',
  'Нижний Новгород': 'Нижнем Новгороде',
  Новосибирск: 'Новосибирске',
  Екатеринбург: 'Екатеринбурге',
  Самара: 'Самаре',
  'Ростов-на-Дону': 'Ростове-на-Дону',
  Краснодар: 'Краснодаре',
  Воронеж: 'Воронеже',
  Пермь: 'Перми',
  Уфа: 'Уфе',
  Волгоград: 'Волгограде',
  Саратов: 'Саратове',
  Тюмень: 'Тюмени',
  Ярославль: 'Ярославле',
  Владивосток: 'Владивостоке',
  Тверь: 'Твери',
  Омск: 'Омске',
  Калининград: 'Калининграде',
  Челябинск: 'Челябинске',
  Тула: 'Туле',
  Сочи: 'Сочи',
  'Великий Новгород': 'Великом Новгороде',
};

/** Склоняет город в предложный падеж (в Москве, в Санкт-Петербурге). */
export function cityToPrepositional(name: string): string {
  if (!name || typeof name !== 'string') return name;
  const t = name.trim();
  if (!t) return name;

  const exact = CITY_PREPOSITIONAL[t];
  if (exact) return exact;

  const lower = t.toLowerCase();
  if (lower.endsWith('ск')) return t.slice(0, -2) + 'ске';
  if (lower.endsWith('бург')) return t.slice(0, -4) + 'бурге';
  if (lower.endsWith('град')) return t.slice(0, -4) + 'граде';
  if (lower.endsWith('а')) return t.slice(0, -1) + 'е';
  if (lower.endsWith('ь')) return t.slice(0, -1) + 'и';
  if (lower.endsWith('я')) return t.slice(0, -1) + 'е';
  if (lower.endsWith('о')) return t.slice(0, -1) + 'е';
  if (lower.endsWith('ов') || lower.endsWith('ев')) return t + 'е';

  return t;
}
