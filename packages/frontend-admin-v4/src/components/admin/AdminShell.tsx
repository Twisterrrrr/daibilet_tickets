import * as React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';

import { AppSidebar } from '@/components/admin/AppSidebar';
import { Input } from '@/components/ui/input';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export function AdminShell() {
  const navigate = useNavigate();

  const onSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const q = String(data.get('q') ?? '').trim();
    const params = new URLSearchParams();
    params.set('source', 'IMPORTED');
    if (q) params.set('q', q);
    navigate(`/admin-v4/events?${params.toString()}`);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <form className="relative max-w-xl flex-1" onSubmit={onSearch}>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                placeholder="Поиск событий, площадок, заказов..."
                className="h-9 border-border bg-secondary/60 pl-8 text-sm focus-visible:bg-background"
              />
            </form>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Imported Sales MVP
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Уведомления"
              >
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </header>
          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-[1440px] px-5 py-5 md:px-6 md:py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
