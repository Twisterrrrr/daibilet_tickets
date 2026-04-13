function formatDateRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function EventNextSessionCell({
  nextDate,
  hasFutureSlots,
}: {
  nextDate?: string | null;
  hasFutureSlots?: boolean | null;
}) {
  if (nextDate) return <span className="text-muted-foreground">{formatDateRu(nextDate)}</span>;
  if (hasFutureSlots === false) return <span className="text-muted-foreground">Нет будущих сеансов</span>;
  return <span className="text-muted-foreground">—</span>;
}

