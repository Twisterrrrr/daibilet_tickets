import { AlertTriangle, Calendar, FileText, LayoutDashboard, Ticket, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useSupplierDashboard } from '@/shared/hooks/use-supplier-dashboard';
import { PageGlyph } from '@/shared/ui/page-glyph';
import {
  EmptyState,
  ErrorPanel,
  LoadingBlock,
  PageHeader,
  SectionCard,
  StatTile,
} from '@/shared/ui/page-primitives';

const TRUST_LABELS: Record<number, string> = {
  0: 'Новый',
  1: 'Базовый',
  2: 'Проверенный',
  3: 'Надёжный',
};

function money(kop: number) {
  return (kop / 100).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
}

const attentionBadgeClass =
  'rounded-full bg-warning-soft px-2.5 py-1 text-[0.6875rem] font-semibold tabular-nums text-warning';

export function DashboardPage() {
  const { data, error, loading, reload } = useSupplierDashboard();

  if (loading && !data) {
    return <LoadingBlock label="Загружаем дашборд…" />;
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Дашборд" glyph={<PageGlyph icon={LayoutDashboard} tone="sky" />} />
        <ErrorPanel title="Не удалось загрузить" description={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) {
    return <EmptyState title="Нет данных" description="Попробуйте обновить страницу." />;
  }

  const { operator, events, offers, sales, trust, attention } = data;

  const attentionTotal =
    attention != null
      ? attention.eventsWithoutSchedule + attention.eventsWithoutPhoto + attention.reviewsWithoutResponse
      : 0;
  const showAttention =
    attention &&
    (attention.eventsWithoutSchedule > 0 ||
      attention.eventsWithoutPhoto > 0 ||
      attention.reviewsWithoutResponse > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Здравствуйте, ${operator.name}`}
        subtitle={`Уровень доверия: ${TRUST_LABELS[operator.trustLevel] ?? operator.trustLevel} · комиссия ${operator.commissionRate}`}
        glyph={<PageGlyph icon={LayoutDashboard} tone="sky" />}
      />

      {trust && trust.activeEventsLimit > 0 && (
        <div
          className={`flex gap-3 rounded-card border px-4 py-3 ${
            trust.activeEventsCount >= trust.activeEventsLimit
              ? 'border-danger/30 bg-danger-soft'
              : 'border-warning/30 bg-warning-soft'
          }`}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="text-small">
            <p className="font-medium text-text-primary">
              Активные события: {trust.activeEventsCount} из {trust.activeEventsLimit}
            </p>
            {trust.nextStepRecommendation ? (
              <p className="mt-1 text-text-muted">{trust.nextStepRecommendation}</p>
            ) : null}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="События"
          value={events.total}
          hint={`активных ${events.active}, на модерации ${events.pending}`}
          icon={<Calendar className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
        />
        <StatTile
          label="Офферы"
          value={offers.total}
          icon={<Ticket className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
        />
        <StatTile
          label="Заказы"
          value={sales.totalOrders}
          hint={`выручка ${money(sales.grossRevenue)}`}
          icon={<FileText className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
        />
        <StatTile
          label="На счёте (нетто)"
          value={money(sales.netRevenue)}
          hint={`комиссия платформы ${money(sales.platformFee)}`}
          icon={<Wallet className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
        />
      </div>

      {showAttention && (
        <SectionCard
          title="Требует внимания"
          action={
            <span
              className={attentionBadgeClass}
              aria-label="Всего пунктов, требующих внимания"
              title="Сумма напоминаний по расписанию, фото и отзывам без ответа"
            >
              {attentionTotal}
            </span>
          }
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {attention.eventsWithoutSchedule > 0 && (
              <Link
                to="/events"
                className="flex items-center justify-between gap-2 rounded-control border border-border-soft/70 bg-surface-alt/25 px-3 py-2.5 no-underline transition-colors hover:border-border-soft hover:bg-surface-alt/50"
              >
                <span className="text-small font-medium leading-tight text-text-primary">Расписание</span>
                <span className="shrink-0 tabular-nums text-small text-text-muted">
                  {attention.eventsWithoutSchedule}
                </span>
              </Link>
            )}
            {attention.eventsWithoutPhoto > 0 && (
              <Link
                to="/events"
                className="flex items-center justify-between gap-2 rounded-control border border-border-soft/70 bg-surface-alt/25 px-3 py-2.5 no-underline transition-colors hover:border-border-soft hover:bg-surface-alt/50"
              >
                <span className="text-small font-medium leading-tight text-text-primary">Без фото</span>
                <span className="shrink-0 tabular-nums text-small text-text-muted">
                  {attention.eventsWithoutPhoto}
                </span>
              </Link>
            )}
            {attention.reviewsWithoutResponse > 0 && (
              <Link
                to="/reviews"
                className="flex items-center justify-between gap-2 rounded-control border border-border-soft/70 bg-surface-alt/25 px-3 py-2.5 no-underline transition-colors hover:border-border-soft hover:bg-surface-alt/50"
              >
                <span className="text-small font-medium leading-tight text-text-primary">
                  Отзывы без ответа
                </span>
                <span className="shrink-0 tabular-nums text-small text-text-muted">
                  {attention.reviewsWithoutResponse}
                </span>
              </Link>
            )}
          </div>
        </SectionCard>
      )}

      <div className="flex justify-end">
        <Link to="/balance" className="text-label text-accent no-underline hover:underline">
          Баланс и документы
        </Link>
      </div>
    </div>
  );
}
