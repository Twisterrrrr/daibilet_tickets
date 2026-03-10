import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface AppSidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  active?: boolean;
}

export interface AppSidebarProps {
  header?: ReactNode;
  footer?: ReactNode;
  items: AppSidebarItem[];
  onItemClick?: (id: string) => void;
  className?: string;
}

/**
 * Generic vertical sidebar: list of nav items with optional header/footer.
 * Consumer is responsible for routing and active state.
 */
export function AppSidebar({ header, footer, items, onItemClick, className }: AppSidebarProps) {
  return (
    <div className={clsx('flex h-full flex-col', className)}>
      {header ? <div className="border-b px-4 py-3">{header}</div> : null}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3 text-sm">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick?.(item.id)}
            className={clsx(
              'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
              item.active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
            )}
          >
            {item.icon ? <span className="h-4 w-4">{item.icon}</span> : null}
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>
      {footer ? <div className="border-t px-4 py-3 text-xs text-slate-500">{footer}</div> : null}
    </div>
  );
}

