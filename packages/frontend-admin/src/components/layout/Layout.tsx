import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { clearTokens } from '../../lib/auth';
import { adminApi } from '../../api/client';

export function Layout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await adminApi.post('/auth/logout');
    } catch {
      // Даже если запрос не прошёл — чистим локально
    }
    clearTokens();
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="pl-56">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end border-b border-gray-200 bg-white/80 px-6 backdrop-blur">
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            Выйти
          </button>
        </header>
        {/* Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
