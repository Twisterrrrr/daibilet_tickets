/**
 * Нормализация заголовков событий для единообразного отображения.
 *
 * Правила:
 * - Убираем лишние пробелы, переносы, табуляцию
 * - ALL CAPS (ТРЕХЧАСОВАЯ ЭКСКУРСИЯ) → заголовочный регистр (Трёхчасовая экскурсия)
 * - Первая буква заглавная, если не приведено из ALL CAPS
 */
export function normalizeEventTitle(title: string): string {
  if (!title || typeof title !== 'string') return '';
  let s = title
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';

  const letters = s.replace(/[^а-яёa-z]/gi, '');
  if (letters.length === 0) return s;

  const upperCount = (letters.match(/[А-ЯЁA-Z]/g) || []).length;
  const isMostlyUppercase = upperCount / letters.length > 0.6;

  if (isMostlyUppercase) {
    // ALL CAPS → каждое слово с заглавной буквы (заголовочный регистр)
    s = s
      .toLowerCase()
      .replace(/(^|[\s\-–—])([а-яёa-z])/g, (_, sep, c) => sep + c.toUpperCase());
  } else if (s[0] && /[а-яёa-z]/i.test(s[0]) && s[0] === s[0].toLowerCase()) {
    // Первая буква строчная — делаем заглавной
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }

  return s;
}
