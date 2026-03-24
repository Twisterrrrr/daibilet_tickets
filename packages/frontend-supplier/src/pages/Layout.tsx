import { LogOut } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { PageContainer } from '@daibilet/shared-ui';

import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

import { SupplierSidebar } from '@/components/layout/SupplierSidebar';
import { api, clearToken } from '../lib/api';
import { SupplierNotification } from '../lib/notifications.mock';

interface SidebarSupplierInfo {
  name: string;
  companyName?: string | null;
  trustLevel?: number;
  verifiedAt?: string | null;
}

export default function Layout() {
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

    api
      .get<{ items: unknown[]; total: number; hasMore?: boolean }>(
        '/supplier/reviews?tab=needs_response&page=1&limit=1',
      )
      .then((res) => setReviewsBadge(res.total || 0))
      .catch(() => setReviewsBadge(null));

    api
      .get<SupplierNotification[]>('/supplier/notifications?limit=50')
      .then((data) => {
        const unread = Array.isArray(data) ? data.filter((n) => !n.isRead).length : 0;
        setNotificationsBadge(unread || null);
      })
      .catch(() => setNotificationsBadge(null));
  }, []);

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <SupplierSidebar
          supplier={supplier}
          reviewsBadge={reviewsBadge}
          notificationsBadge={notificationsBadge}
        />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-20 flex h-10 items-center gap-2.5 border-b border-border/80 bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-4 shrink-0">
            <SidebarTrigger className="shrink-0" />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                Поставщик
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Выход</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-[#e5e7eb]">
            <PageContainer className="animate-in-page max-w-none px-3 py-3.5 sm:px-4 xl:px-6 2xl:px-8 lg:py-4">
              <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Загрузка…</div>}>
                <Outlet />
              </Suspense>
            </PageContainer>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
