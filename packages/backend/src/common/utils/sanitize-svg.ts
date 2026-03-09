/**
 * Санитизация SVG для безопасного рендеринга из админки.
 * Удаляются: script, foreignObject, iframe, object, embed, style, link; on* handlers; javascript:/data: в href.
 * Node.js compatible (без DOMParser). Regex-based — для production рассмотреть DOMPurify+jsdom.
 */
export function sanitizeSvg(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw.trim();
  if (!s.startsWith('<svg') && !s.startsWith('<SVG')) return '';

  // Удаляем опасные теги и их содержимое
  const dangerousTags = ['script', 'foreignObject', 'iframe', 'object', 'embed', 'style', 'link'];
  for (const tag of dangerousTags) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    s = s.replace(re, '');
  }

  // Удаляем все on* атрибуты
  s = s.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  s = s.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');

  // Удаляем javascript: и data: в href, xlink:href
  s = s.replace(/\s(href|xlink:href)\s*=\s*["']\s*javascript:[^"']*["']/gi, '');
  s = s.replace(/\s(href|xlink:href)\s*=\s*["']\s*data:[^"']*["']/gi, '');

  return s;
}
