import { BarChart3, Calendar, LayoutDashboard, LogOut, MessageSquare, Settings } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { AppShell, PageContainer } from '@daibilet/shared-ui';

import { clearToken } from '../lib/api';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/events', icon: Calendar, label: 'Мои события' },
  { to: '/reviews', icon: MessageSquare, label: 'Отзывы' },
  { to: '/reports', icon: BarChart3, label: 'Отчёты' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-4">
        <h1 className="text-lg font-bold text-blue-600">Дайбилет</h1>
        <p className="text-xs text-gray-500">Кабинет поставщика</p>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-3 text-sm">
        {NAV.map((item) => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
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
    <AppShell sidebar={sidebar}>
      <PageContainer className="py-6">
        <Outlet />
      </PageContainer>
    </AppShell>
  );
}
