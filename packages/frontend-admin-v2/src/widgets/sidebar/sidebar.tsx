import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, type NavLinkRenderProps } from 'react-router-dom';

import { ADMIN_NAV_SECTIONS, type NavItem } from '@/shared/config/navigation';
import { cn } from '@/shared/lib/cn';
const STORAGE_KEY = 'daibilet-admin-v2-sidebar-collapsed';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex w-full flex-shrink-0 flex-col border-b border-border-soft bg-surface/95 backdrop-blur-sm',
        'sm:h-screen sm:w-auto sm:flex-shrink-0 sm:flex-col sm:border-b-0 sm:bg-transparent sm:backdrop-blur-none',
      )}
    >
      {/* Mobile */}
      <div className="flex flex-row items-center gap-1 overflow-x-auto px-3 py-3 sm:hidden">
        <span className="shrink-0 px-2 text-small font-medium text-text-secondary">Меню</span>
        <nav className="flex flex-row gap-1 pr-2">
          {ADMIN_NAV_SECTIONS.flatMap((s) => s.items).map((item) => (
            <MobileNavLink key={item.path} item={item} />
          ))}
        </nav>
      </div>

      {/* Desktop: панель + круглая кнопка на стыке с контентом */}
      <div className="relative hidden h-screen shrink-0 sm:block">
        <div
          className={cn(
            'admin-sidebar-panel border-r',
            collapsed && 'admin-sidebar-panel--collapsed',
          )}
          aria-label="Основное меню"
        >
          <div
            className={cn(
              'admin-sidebar__header border-b border-border-soft/80 px-5 pb-4 pt-6',
              collapsed && 'flex justify-center px-2',
            )}
          >
            <div
              className={cn(
                'flex min-w-0 items-center gap-2',
                collapsed && 'w-full justify-center gap-0',
              )}
            >
              <div className="admin-sidebar__brand-mark shrink-0" aria-hidden>
                <svg
                  className="admin-sidebar__brand-ticket"
                  viewBox="0 0 24 24"
                  preserveAspectRatio="none"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                </svg>
              </div>
              <div className="admin-sidebar__brand-block">
                <div className="text-[1.05rem] font-bold uppercase tracking-tight text-text-primary">DAIBILET</div>
                <p className="mt-0.5 text-small text-text-muted">Админ-панель</p>
              </div>
            </div>
          </div>

          <nav
            className={cn(
              'admin-sidebar__nav-scroll flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto py-5',
              collapsed && 'py-4',
            )}
          >
            {ADMIN_NAV_SECTIONS.map((section, sectionIndex) => (
              <div key={section.title} className={cn(sectionIndex > 0 && (collapsed ? 'mt-2' : 'mt-4'))}>
                <ul className={cn('flex flex-col', collapsed ? 'gap-1 px-2' : 'gap-0.5 px-4')}>
                  {section.items.map((item) => (
                    <li key={item.path}>
                      <DesktopNavLink item={item} collapsed={collapsed} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <button
          type="button"
          className="admin-sidebar__rail-toggle"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
          onClick={toggleCollapsed}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" strokeWidth={2} /> : <ChevronLeft className="h-4 w-4" strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}

function MobileNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/dashboard'}
      title={item.label}
      className={({ isActive }: NavLinkRenderProps) =>
        cn(
          'flex shrink-0 items-center justify-center rounded-control p-2.5 text-text-secondary transition-colors',
          'hover:bg-surface-alt hover:text-text-primary',
          isActive && 'bg-surface-alt text-accent shadow-soft',
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
    </NavLink>
  );
}

function DesktopNavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/dashboard'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }: NavLinkRenderProps) =>
        cn(
          'admin-sidebar__link no-underline hover:no-underline',
          isActive && 'admin-sidebar__link--active',
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0 text-current transition-colors duration-150" aria-hidden />
      <span className="admin-sidebar__text">{item.label}</span>
    </NavLink>
  );
}
