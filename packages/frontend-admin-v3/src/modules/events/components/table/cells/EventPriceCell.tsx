export function EventPriceCell({ priceFrom }: { priceFrom?: number | null }) {
  if (priceFrom === null || priceFrom === undefined) return <span className="text-muted-foreground">—</span>;
  const rub = Math.round(priceFrom);
  return <span className="tabular-nums text-muted-foreground">{rub.toLocaleString('ru-RU')} ₽</span>;
}

