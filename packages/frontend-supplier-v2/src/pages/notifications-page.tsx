import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle,
  Clock,
  ShoppingCart,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '@/shared/lib/api';
import { cn } from '@/shared/lib/cn';
import { PageGlyph } from '@/shared/ui/page-glyph';
import {
  EmptyState,
  ErrorPanel,
  FilterRow,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from '@/shared/ui/page-primitives';

export type NotificationType = 'order' | 'moderation' | 'limit' | 'system';

export interface SupplierNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  linkLabel?: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: typeof Bell; label: string; badgeClass: string }
> = {
  order: { icon: ShoppingCart, label: 'Заказ', badgeClass: 'text-accent bg-accent/10' },
  moderation: { icon: ShieldCheck, label: 'Модерация', badgeClass: 'text-warning bg-warning-soft' },
  limit: { icon: AlertTriangle, label: 'Лимит', badgeClass: 'text-danger bg-danger-soft' },
  system: { icon: Bell, label: 'Система', badgeClass: 'text-text-muted bg-surface-alt' },
};

type FilterValue = 'all' | NotificationType;

function normalizeType(t: string): NotificationType {
  if (t === 'order' || t === 'moderation' || t === 'limit' || t === 'system') return t;
  return 'system';
}

function formatRelative(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'только что';
  if (diffMinutes < 60) return `${diffMinutes} мин назад`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ч назад`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Вчера';
  return `${diffDays} дн назад`;
}

function NotificationLink({ link, label }: { link: string; label: string }) {
  const isAbs = /^https?:\/\//i.test(link);
  if (isAbs) {
    return (
      <a href={link} className="text-label font-medium text-accent hover:underline">
        {label}
      </a>
    );
  }
  return (
    <Link to={link} className="text-label font-medium text-accent hover:underline">
      {label}
    </Link>
  );
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<SupplierNotification[]>([]);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .get<unknown[]>('/supplier/notifications?limit=50')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const mapped: SupplierNotification[] = list.map((raw) => {
          const r = raw as Record<string, unknown>;
          return {
            id: String(r.id ?? ''),
            type: normalizeType(String(r.type ?? 'system')),
            title: String(r.title ?? ''),
            message: String(r.message ?? ''),
            link: r.link != null ? String(r.link) : undefined,
            linkLabel: r.linkLabel != null ? String(r.linkLabel) : undefined,
            isRead: Boolean(r.isRead),
            createdAt: String(r.createdAt ?? ''),
          };
        });
        setNotifications(mapped.filter((n) => n.id));
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить уведомления');
        setNotifications([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () => notifications.filter((n) => !hiddenIds.has(n.id)),
    [notifications, hiddenIds],
  );
  const filtered = useMemo(
    () => visible.filter((n) => (filter === 'all' ? true : n.type === filter)),
    [visible, filter],
  );
  const effectiveRead = (n: SupplierNotification) => readIds.has(n.id) || n.isRead;

  const handleMarkAllRead = () => {
    setReadIds((prev) => new Set([...prev, ...visible.map((n) => n.id)]));
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Уведомления" glyph={<PageGlyph icon={Bell} tone="violet" />} />
        <LoadingBlock label="Загружаем уведомления…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Уведомления"
        subtitle={
          visible.length > 0
            ? `Показано: ${filtered.length}${filter !== 'all' ? ` из ${visible.length}` : ''}`
            : undefined
        }
        glyph={<PageGlyph icon={Bell} tone="violet" />}
      />

      {error ? <ErrorPanel title="Ошибка" description={error} onRetry={load} /> : null}

      <FilterRow>
        <span className="text-small text-text-muted">Категория:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterValue)}
          className="h-9 rounded-control border border-border-soft px-3 text-small"
        >
          <option value="all">Все</option>
          <option value="order">Заказы</option>
          <option value="moderation">Модерация</option>
          <option value="limit">Лимиты</option>
          <option value="system">Система</option>
        </select>
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="rounded-control border border-border-soft px-3 py-1.5 text-label text-text-primary hover:bg-surface-alt"
        >
          Пометить все прочитанными
        </button>
      </FilterRow>

      <SectionCard>
        {filtered.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? 'Нет уведомлений' : 'Нет в этой категории'}
            description={
              filter === 'all'
                ? 'Здесь появятся заказы, результаты модерации и предупреждения.'
                : undefined
            }
          />
        ) : (
          <div className="divide-y divide-border-soft rounded-control border border-border-soft">
            {filtered.map((n) => {
              const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
              const Icon = cfg.icon;
              const read = effectiveRead(n);
              return (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-3 py-3 text-small transition-colors sm:px-4',
                    !read ? 'bg-accent/5 hover:bg-black/[0.06]' : 'bg-surface hover:bg-black/[0.05]',
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px]',
                      cfg.badgeClass,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-text-primary">{n.title}</span>
                      {!read ? (
                        <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success">
                          Новое
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-text-secondary">{n.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelative(n.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      {n.link ? (
                        <NotificationLink link={n.link} label={n.linkLabel || 'Перейти'} />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!read ? (
                      <button
                        type="button"
                        onClick={() => setReadIds((prev) => new Set([...prev, n.id]))}
                        className="rounded-full p-1.5 text-text-muted hover:bg-surface-alt hover:text-text-primary"
                        title="Отметить прочитанным"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setHiddenIds((prev) => new Set([...prev, n.id]))}
                      className="rounded-full p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger"
                      title="Скрыть"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
