/**
 * Сократить адрес до улицы и номера дома.
 * "Дворцовая наб., 18, Санкт-Петербург, Россия, 191186" → "Дворцовая наб., 18"
 */
export function shortenAddressToStreet(address: string | null | undefined): string {
  if (!address || typeof address !== 'string') return '';
  const parts = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 2) return address.trim();
  return parts.slice(0, 2).join(', ');
}
