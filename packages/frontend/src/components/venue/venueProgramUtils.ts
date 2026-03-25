import type { VenueProgramItemDto } from '@daibilet/shared';

export function formatExhibitionPeriod(item: VenueProgramItemDto): string {
  if (item.isPermanent) return 'Постоянная экспозиция';
  const s = new Date(item.startsAt);
  const e = new Date(item.endsAt);
  const y = s.getFullYear() !== e.getFullYear();
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', ...(y ? { year: 'numeric' as const } : {}) };
  const sStr = s.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  const eStr = e.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  if (sStr === eStr) return sStr;
  return `${s.toLocaleDateString('ru-RU', opts)} — ${e.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function programBadgeLabel(state: VenueProgramItemDto['programState']): string {
  switch (state) {
    case 'CURRENT':
      return 'Сейчас проходит';
    case 'UPCOMING':
      return 'Скоро';
    case 'PAST':
      return 'Завершена';
    default:
      return '';
  }
}
