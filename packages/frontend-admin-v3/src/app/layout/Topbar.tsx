import { Breadcrumbs } from '@/app/layout/Breadcrumbs';
import { cn } from '@/shared/lib/cn';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

export function Topbar({
  collapsed,
  onToggleSidebar,
  topbarCollapsed,
  onToggleTopbar,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  topbarCollapsed: boolean;
  onToggleTopbar: () => void;
}) {
  return (
    <header
      className={cn('sticky top-0 z-20 border-b bg-background/80 backdrop-blur', topbarCollapsed ? 'cursor-pointer' : '')}
      onClick={(e) => {
        // Сворачиваем/разворачиваем только по клику в "пустое место",
        // чтобы не ломать кнопки/ссылки/инпуты.
        const target = e.target as HTMLElement | null;
        const interactive = target?.closest?.('button,a,input,select,textarea,[role="button"]');
        if (interactive) return;
        onToggleTopbar();
      }}
      aria-label="Шапка админки"
    >
      <div className={cn('mx-auto w-full max-w-[1400px] px-4', topbarCollapsed ? 'py-1.5' : '')}>
        {topbarCollapsed ? (
          <div className="flex items-center justify-end">
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
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

            <div className="h-9 w-9 rounded-full border bg-card" aria-label="User menu (stub)" />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleTopbar();
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm hover:bg-muted"
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

