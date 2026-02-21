/**
 * Сократить адрес до улицы и номера дома.
 * "Дворцовая наб., 18, Санкт-Петербург, Россия, 191186" → "Дворцовая наб., 18"
 */
export function shortenAddressToStreet(addr: string | null | undefined): string {
  if (!addr || typeof addr !== 'string') return '';
  const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length <= 2 ? addr.trim() : parts.slice(0, 2).join(', ');
}
