import { Sidebar } from '@/app/layout/Sidebar';
import { Topbar } from '@/app/layout/Topbar';
import { cn } from '@/shared/lib/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { readSidebarState, writeSidebarState } from './sidebar-state';

export function AdminShell() {
  const initial = useMemo(() => readSidebarState(), []);
  const [collapsed, setCollapsed] = useState<boolean>(initial.collapsed);
  const [topbarCollapsed, setTopbarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('admin-v3-topbar-collapsed') === '1';
    } catch {
      return false;
    }
  });

  return (
    <div className="min-h-svh bg-page">
      <div className="flex min-h-svh">
        <aside className="relative sticky top-0 hidden h-svh shrink-0 md:block">
          <div
            className={cn('h-svh border-r bg-sidebar text-sidebar-foreground', collapsed ? 'w-16' : 'w-64')}
            aria-label="Основное меню"
          >
            <Sidebar collapsed={collapsed} />
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              writeSidebarState({ collapsed: next });
            }}
            className={cn(
              'absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border bg-card text-foreground shadow-sm',
              'right-0 hover:bg-muted',
            )}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'}
            title={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </aside>

        <div className="min-w-0 flex-1">
          <Topbar
            collapsed={collapsed}
            onToggleSidebar={() => {
              const next = !collapsed;
              setCollapsed(next);
              writeSidebarState({ collapsed: next });
            }}
            topbarCollapsed={topbarCollapsed}
            onToggleTopbar={() => {
              const next = !topbarCollapsed;
              setTopbarCollapsed(next);
              try {
                localStorage.setItem('admin-v3-topbar-collapsed', next ? '1' : '0');
              } catch {
                // ignore
              }
            }}
          />
          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-content px-6 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-10">
              <div className="animate-in-page">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

