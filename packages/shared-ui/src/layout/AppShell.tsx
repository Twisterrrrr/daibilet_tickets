import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface AppShellProps {
  sidebar?: ReactNode;
  topbar?: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * When true, sidebar is always visible (no responsive hiding).
   * Useful for layouts that need persistent navigation even on smaller screens.
   */
  sidebarAlwaysVisible?: boolean;
}

/**
 * Generic backoffice shell: sidebar + topbar + content area.
 * Purely presentational, no routing or role logic.
 */
export function AppShell({ sidebar, topbar, children, className, sidebarAlwaysVisible }: AppShellProps) {
  const sidebarClassName = sidebarAlwaysVisible
    ? 'w-64 shrink-0 border-r bg-white'
    : 'hidden w-64 shrink-0 border-r bg-white lg:block';

  return (
    <div className={clsx('min-h-screen bg-slate-50 text-slate-900', className)}>
      <div className="flex min-h-screen">
        {sidebar ? <aside className={sidebarClassName}>{sidebar}</aside> : null}
        <div className="flex min-h-screen flex-1 flex-col">
          {topbar ? <header className="border-b bg-white">{topbar}</header> : null}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

