import { logoutAndRedirect } from '@/api/client';
import { Breadcrumbs } from '@/app/layout/Breadcrumbs';
import { cn } from '@/shared/lib/cn';
import { ChevronDown, ChevronUp, LogOut, Search } from 'lucide-react';

export function Topbar({
  collapsed: _collapsed,
  onToggleSidebar: _onToggleSidebar,
  topbarCollapsed,
  onToggleTopbar,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  topbarCollapsed: boolean;
  onToggleTopbar: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className={cn('mx-auto w-full max-w-content px-4 sm:px-8', topbarCollapsed ? 'py-1.5' : '')}>
        {topbarCollapsed ? (
          <button
            type="button"
            className="flex w-full min-h-11 items-center justify-end gap-2 rounded-md px-2 text-sm text-muted-foreground transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onToggleTopbar()}
            aria-expanded={false}
            aria-label="Развернуть шапку"
          >
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        ) : (
          <div className="flex h-14 items-center gap-3">
            <Breadcrumbs className="min-w-0 flex-1" />

            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground shadow-sm hover:bg-muted"
              aria-label="Глобальный поиск (заглушка)"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Поиск</span>
              <span className="ml-1 hidden rounded bg-muted px-1.5 py-0.5 text-xs text-foreground sm:inline">
                Ctrl K
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                void logoutAndRedirect();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-2.5 text-sm text-muted-foreground shadow-sm hover:bg-muted"
              title="Выйти"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleTopbar()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm hover:bg-muted"
              aria-expanded
              aria-label="Свернуть шапку"
              title="Свернуть шапку"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
