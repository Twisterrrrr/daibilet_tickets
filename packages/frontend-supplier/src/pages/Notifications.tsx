import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

import { CountBadge, EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatusBadge } from '@daibilet/shared-ui';

import { api } from '../lib/api';

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

const typeConfig: Record<
  NotificationType,
  {
    icon: React.ElementType;
    label: string;
    badgeClass: string;
  }
> = {
  order: { icon: ShoppingCart, label: 'Заказ', badgeClass: 'text-blue-700 bg-blue-50' },
  moderation: { icon: ShieldCheck, label: 'Модерация', badgeClass: 'text-amber-800 bg-amber-50' },
  limit: { icon: AlertTriangle, label: 'Лимит', badgeClass: 'text-red-700 bg-red-50' },
  system: { icon: Bell, label: 'Система', badgeClass: 'text-slate-600 bg-slate-100' },
};

type FilterValue = 'all' | NotificationType;

function formatRelative(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) return `${diffMinutes} мин назад`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ч назад`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Вчера';
  return `${diffDays} дн назад`;
}

interface NotificationsPageViewProps {
  notifications: SupplierNotification[];
  filter: FilterValue;
  onFilterChange: (value: FilterValue) => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationsPageView({
  notifications,
  filter,
  onFilterChange,
  onMarkAllRead,
  onMarkRead,
  onDelete,
}: NotificationsPageViewProps) {
  const filtered = notifications.filter((n) => (filter === 'all' ? true : n.type === filter));
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Уведомления"
        subtitle={unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Все уведомления прочитаны'}
        actions={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Check className="h-4 w-4" />
              Прочитать все
            </button>
          ) : undefined
        }
      />

      <SectionCard>
        <div className="flex flex-wrap items-center gap-2 border-b pb-3 text-sm">
          {[
            { value: 'all' as FilterValue, label: 'Все' },
            { value: 'order' as FilterValue, label: 'Заказы' },
            { value: 'moderation' as FilterValue, label: 'Модерация' },
            { value: 'limit' as FilterValue, label: 'Лимиты' },
            { value: 'system' as FilterValue, label: 'Система' },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onFilterChange(t.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === t.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
              {t.value === 'all' && unreadCount > 0 && <CountBadge count={unreadCount} className="ml-1" />}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? 'Нет уведомлений' : 'Нет в этой категории'}
            description={filter === 'all' ? 'Здесь появятся заказы, результаты модерации и предупреждения.' : undefined}
          />
        ) : (
          <div className="divide-y">
            {filtered.map((n) => {
              const cfg = typeConfig[n.type];
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 text-sm ${
                    !n.isRead ? 'bg-blue-50/40' : 'bg-white'
                  } hover:bg-blue-50/70`}
                >
                  <div
                    className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-xs ${cfg.badgeClass}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{n.title}</span>
                      {!n.isRead && (
                        <StatusBadge tone="success" label="Новое" />
                      )}
                    </div>
                    <p className="mt-1 text-slate-600">{n.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelative(n.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      {n.link && (
                        <Link
                          to={n.link}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          {n.linkLabel || 'Перейти'}
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => onMarkRead(n.id)}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Отметить прочитанным"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(n.id)}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                      title="Удалить"
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

export default function Notifications() {
  const [notifications, setNotifications] = useState<SupplierNotification[]>([]);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    api
      .get<SupplierNotification[]>('/supplier/notifications?limit=50')
      .then((data) => {
        setNotifications(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : 'Не удалось загрузить уведомления';
        setError(message);
        setNotifications([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleNotifications = notifications.filter((n) => !hiddenIds.has(n.id));
  const effectiveRead = (n: SupplierNotification) => readIds.has(n.id) || n.isRead;

  const handleMarkAllRead = () => {
    setReadIds((prev) => new Set([...prev, ...visibleNotifications.map((n) => n.id)]));
  };

  const handleMarkRead = (id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
  };

  const handleDelete = (id: string) => {
    setHiddenIds((prev) => new Set([...prev, id]));
  };

  if (loading) {
    return <LoadingState label="Загружаем уведомления..." />;
  }

  if (error) {
    return <ErrorState title="Ошибка загрузки уведомлений" description={error} />;
  }

  const withEffectiveRead = visibleNotifications.map((n) => ({
    ...n,
    isRead: effectiveRead(n),
  }));

  return (
    <NotificationsPageView
      notifications={withEffectiveRead}
      filter={filter}
      onFilterChange={setFilter}
      onMarkAllRead={handleMarkAllRead}
      onMarkRead={handleMarkRead}
      onDelete={handleDelete}
    />
  );
}

