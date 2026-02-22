import { BarChart3, Calendar, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { clearToken } from '../lib/api';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/events', icon: Calendar, label: 'Мои события' },
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

  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-blue-600">Дайбилет</h1>
          <p className="text-xs text-gray-500">Кабинет поставщика</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((item) => {
            const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 w-full"
          >
            <LogOut className="h-4 w-4" />
            Выход
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
