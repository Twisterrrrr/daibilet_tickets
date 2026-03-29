import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { PageContainer } from '@/shared/layout/page-container';
import { SupplierSidebar } from '@/widgets/supplier-sidebar/supplier-sidebar';
import { api, clearToken } from '@/shared/lib/api';

interface SidebarSupplierInfo {
  name: string;
  companyName?: string | null;
  trustLevel?: number;
}

export function SupplierPageShell() {
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<SidebarSupplierInfo | null>(null);
  const [reviewsBadge, setReviewsBadge] = useState<number | null>(null);
  const [notificationsBadge, setNotificationsBadge] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<{ name?: string; companyName?: string | null; trustLevel?: number }>('/supplier/settings')
      .then((res) => {
        setSupplier({
          name: res.name || 'Поставщик',
          companyName: res.companyName ?? null,
          trustLevel: typeof res.trustLevel === 'number' ? res.trustLevel : undefined,
        });
      })
      .catch(() => setSupplier(null));

    api
      .get<{ total: number }>('/supplier/reviews?tab=needs_response&page=1&limit=1')
      .then((res) => setReviewsBadge(res.total || 0))
      .catch(() => setReviewsBadge(null));

    api
      .get<{ isRead?: boolean }[]>('/supplier/notifications?limit=50')
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        const unread = arr.filter((n) => !n.isRead).length;
        setNotificationsBadge(unread || null);
      })
      .catch(() => setNotificationsBadge(null));
  }, []);

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-page sm:min-h-screen sm:flex-row sm:items-stretch">
      <SupplierSidebar
        supplier={supplier}
        reviewsBadge={reviewsBadge}
        notificationsBadge={notificationsBadge}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-11 shrink-0 items-center justify-end gap-3 border-b border-border-soft/80 bg-surface/85 px-4 backdrop-blur-md sm:px-6">
          <span className="hidden text-label text-text-muted sm:inline">Сеанс</span>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label="Выйти из кабинета"
          >
            <LogOut className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} />
          </button>
        </header>
        <main className="flex-1 overflow-auto bg-page">
          <PageContainer>
            <Outlet />
          </PageContainer>
        </main>
      </div>
    </div>
  );
}
