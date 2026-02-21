// ==============================================
// SEO: рендер шаблонов, сезон
// ==============================================

export type SeasonValue = 'лето' | 'зима' | 'сезон';

/**
 * Возвращает текущий сезон для SEO-текстов.
 * - лето: май, июнь, июль (5, 6, 7)
 * - зима: декабрь, январь, февраль (11, 0, 1)
 * - сезон: остальные месяцы
 */
export function getSeason(date?: Date): SeasonValue {
  const d = date ?? new Date();
  const m = d.getMonth();
  if ([5, 6, 7].includes(m)) return 'лето';
  if ([11, 0, 1].includes(m)) return 'зима';
  return 'сезон';
}

/**
 * Подставляет переменные {{key}} из context в template.
 * Неизвестные ключи остаются как {{key}}.
 */
export function renderTemplate(
  template: string,
  context: Record<string, string | number | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = context[key];
    return v !== undefined && v !== null ? String(v) : `{{${key}}}`;
  });
}
