import { useEffect, useState } from 'react';
import { BarChart3, Bell, Calendar, CreditCard, FileText, LayoutDashboard, LogOut, MessageSquare, Settings } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { AppShell, PageContainer } from '@daibilet/shared-ui';

import { api, clearToken } from '../lib/api';
import { mockNotifications } from '../lib/notifications.mock';

interface SidebarSupplierInfo {
  name: string;
  companyName?: string | null;
  trustLevel?: number;
  verifiedAt?: string | null;
}

type NavBadgeKey = 'reviews' | 'notifications';

const NAV: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; badgeKey?: NavBadgeKey }[] =
  [
    { to: '/', icon: LayoutDashboard, label: 'Дашборд' },
    { to: '/events', icon: Calendar, label: 'Мои события' },
    { to: '/orders', icon: FileText, label: 'Заказы' },
    { to: '/reviews', icon: MessageSquare, label: 'Отзывы', badgeKey: 'reviews' },
    { to: '/notifications', icon: Bell, label: 'Уведомления', badgeKey: 'notifications' },
    { to: '/reports', icon: BarChart3, label: 'Отчёты' },
    { to: '/balance', icon: CreditCard, label: 'Баланс' },
    { to: '/settings', icon: Settings, label: 'Настройки' },
  ];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<SidebarSupplierInfo | null>(null);
  const [reviewsBadge, setReviewsBadge] = useState<number | null>(null);
  const [notificationsBadge, setNotificationsBadge] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<any>('/supplier/settings')
      .then((res) => {
        setSupplier({
          name: res.name || 'Поставщик',
          companyName: res.companyName ?? null,
          trustLevel: typeof res.trustLevel === 'number' ? res.trustLevel : undefined,
          verifiedAt: res.verifiedAt ?? null,
        });
      })
      .catch(() => {
        setSupplier(null);
      });

    // Бейдж для отзывов: количество отзывов, требующих ответа
    api
      .get<{ items: any[]; total: number; hasMore?: boolean }>('/supplier/reviews?tab=needs_response&page=1&limit=1')
      .then((res) => setReviewsBadge(res.total || 0))
      .catch(() => setReviewsBadge(null));

    // Бейдж для уведомлений: количество непрочитанных в мок-данных
    const unread = mockNotifications.filter((n) => !n.isRead).length;
    setNotificationsBadge(unread || null);
  }, []);

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  const trustLabel =
    supplier?.trustLevel === 3
      ? 'Надёжный'
      : supplier?.trustLevel === 2
        ? 'Проверенный'
        : supplier?.trustLevel === 1
          ? 'Базовый'
          : supplier?.trustLevel === 0
            ? 'Новый'
            : undefined;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
            D
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-slate-900">DAIBILET</p>
            <p className="text-[11px] text-slate-500">Кабинет поставщика</p>
          </div>
        </div>

        {/* Supplier card */}
        <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3">
          <p className="truncate text-sm font-semibold text-slate-900">{supplier?.name || 'Поставщик'}</p>
          {supplier?.companyName && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{supplier.companyName}</p>
          )}
          {trustLabel && (
            <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
              Проверен
            </span>
          )}
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-3 text-sm">
        {NAV.map((item) => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          let badge: number | null = null;
          if (item.badgeKey === 'reviews') badge = reviewsBadge ?? null;
          if (item.badgeKey === 'notifications') badge = notificationsBadge ?? null;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1 truncate">{item.label}</span>
              {badge !== null && badge > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-2 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Выход
        </button>
      </div>
    </div>
  );

  return (
    <AppShell sidebar={sidebar} sidebarAlwaysVisible>
      <PageContainer className="py-6">
        <Outlet />
      </PageContainer>
    </AppShell>
  );
}
