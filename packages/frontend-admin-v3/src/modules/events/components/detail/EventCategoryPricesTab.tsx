import { Badge } from '@/components/ui/badge';
import type { AdminEventDetail } from '@/modules/events/api/detail';

function formatRubFromKopecks(k: number | null | undefined): string {
  if (k == null || k <= 0) return '—';
  return `${Math.round(k / 100).toLocaleString('ru-RU')} ₽`;
}

/** Подписи для purchaseType / legacy-кодов категории (см. Prisma PurchaseType + импорты/внешние словари). */
const PT_LABEL: Record<string, string> = {
  // Prisma PurchaseType (актуальная схема)
  WIDGET: 'Виджет / прямая покупка',
  REDIRECT: 'Внешняя покупка',
  REQUEST: 'Заявка',
  // Распространённые коды тарифов (данные с витрин / исторические)
  ADULT: 'Взрослый',
  CHILD: 'Детский',
  FAMILY: 'Семейный',
  GROUP: 'Групповой',
  SENIOR: 'Льготный',
};

function categoryDisplayName(row: { name: string; purchaseType: string }): string {
  const raw = row.name?.trim();
  if (raw && raw !== row.purchaseType) {
    return raw;
  }
  return PT_LABEL[row.purchaseType] ?? row.purchaseType;
}

export function EventCategoryPricesTab({ detail }: { detail: AdminEventDetail }) {
  const rows = detail.categoryPrices ?? [];

  if (!rows.length) {
    return (
      <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
        Нет активных категорий с ценой. Данные синхронизируются из источника или задаются в бэкенде (модель{' '}
        <span className="font-mono text-xs">EventOffer</span>).
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Категория</th>
            <th className="px-4 py-3 text-left">Цена от</th>
            <th className="px-4 py-3 text-center">Статус</th>
            <th className="px-4 py-3 text-center">Связь с сеансами</th>
            <th className="px-4 py-3 text-center">Доступность</th>
            <th className="px-4 py-3 text-center">Продажа</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="px-4 py-3">
                <div className="font-medium">{categoryDisplayName(row)}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{row.id.slice(0, 8)}…</div>
              </td>
              <td className="px-4 py-3 tabular-nums">{formatRubFromKopecks(row.priceFromKopecks)}</td>
              <td className="px-4 py-3 text-center">
                <Badge variant="outline">{row.status}</Badge>
              </td>
              <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{row.sessionsLinkedCount}</td>
              <td className="px-4 py-3 text-center text-muted-foreground">{row.availabilityMode ?? '—'}</td>
              <td className="px-4 py-3 text-center">
                {row.isSellableHint ? (
                  <Badge variant="success">да</Badge>
                ) : (
                  <Badge variant="outline">нет</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        Редактирование строк выполняется через API события (legacy <span className="font-mono">EventOffer</span>), здесь —
        обзор для контента.
      </div>
    </div>
  );
}
