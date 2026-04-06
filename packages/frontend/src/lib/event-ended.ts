/** Завершённая временная выставка / OPEN_DATE с истёкшим endDate (каталог уже не показывает). */
export function isPastOpenDateExhibition(event: { dateMode?: string; endDate?: string | null }): boolean {
  if (event.dateMode !== 'OPEN_DATE' || event.endDate == null || event.endDate === '') return false;
  const end = new Date(event.endDate);
  return !Number.isNaN(end.getTime()) && end < new Date();
}
