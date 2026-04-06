import { Outlet } from 'react-router-dom';

import { Sidebar } from '@/widgets/sidebar/sidebar';

export function AdminPageShell() {
  return (
    <div className="flex min-h-screen flex-col bg-page sm:flex-row sm:items-start">
      <Sidebar />
      <main className="min-h-screen min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
