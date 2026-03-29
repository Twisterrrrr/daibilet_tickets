import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, type NavLinkRenderProps, useLocation } from 'react-router-dom';

import {
  SUPPLIER_V2_NAV_SECTIONS,
  isSupplierSettingsHubPath,
  type SupplierNavItem,
} from '@/shared/config/supplier-navigation';
import { getSupplierRoleFromToken, supplierNavPathAllowedForRole } from '@/shared/lib/jwt-role';
import { cn } from '@/shared/lib/cn';

const STORAGE_KEY = 'daibilet-supplier-v2-sidebar-collapsed';

const trustColors: Record<number, string> = {
  0: 'bg-surface-alt text-text-muted',
  1: 'bg-surface-alt text-text-muted',
  2: 'bg-success-soft text-success',
  3: 'bg-accent/12 text-accent',
};

const trustLabels: Record<number, string> = {
  0: 'Новый',
  1: 'Базовый',
  2: 'Проверенный',
  3: 'Надёжный',
};

export interface SupplierSidebarProps {
  supplier: {
    name: string;
    companyName?: string | null;
    trustLevel?: number;
  } | null;
  reviewsBadge: number | null;
  notificationsBadge: number | null;
}

function NavCountBadge({ count }: { count: number }) {
  if (count < 1) return null;
  return (
    <span className="ml-2 inline-flex min-w-[1.125rem] justify-center rounded-full bg-accent px-1 py-0.5 text-[10px] font-semibold text-accent-foreground">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function badgeForItem(
  item: SupplierNavItem,
  reviewsBadge: number | null,
  notificationsBadge: number | null,
): number | null {
  if (item.badgeKey === 'reviews') return reviewsBadge;
  if (item.badgeKey === 'notifications') return notificationsBadge;
  return null;
}

export function SupplierSidebar({ supplier, reviewsBadge, notificationsBadge }: SupplierSidebarProps) {
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

  const supplierRole = getSupplierRoleFromToken();
  const trustLevel = supplier?.trustLevel;
  const showTrustBadge = supplier != null && typeof trustLevel === 'number';
  const trustClass = showTrustBadge ? (trustColors[trustLevel] ?? trustColors[0]) : '';
  const trustLabel = showTrustBadge ? (trustLabels[trustLevel] ?? trustLabels[0]) : '';

  const mobileItems = SUPPLIER_V2_NAV_SECTIONS.flatMap((s) => s.items).filter((item) =>
    supplierNavPathAllowedForRole(item.path, supplierRole),
  );

  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex w-full shrink-0 flex-col border-b border-border-soft bg-surface/95 backdrop-blur-sm',
        'sm:h-[100dvh] sm:max-h-[100dvh] sm:w-auto sm:min-h-0 sm:border-b-0 sm:bg-transparent sm:backdrop-blur-none',
      )}
    >
      <div className="flex flex-row items-center gap-1 overflow-x-auto px-3 py-3 sm:hidden">
        <span className="shrink-0 px-2 text-small font-medium text-text-secondary">Меню</span>
        <nav className="flex flex-row gap-1 pr-2" aria-label="Мобильное меню">
          {mobileItems.map((item) => (
            <MobileNavLink
              key={item.path}
              item={item}
              count={badgeForItem(item, reviewsBadge, notificationsBadge)}
            />
          ))}
        </nav>
      </div>

      <div className="relative hidden min-h-0 shrink-0 sm:flex sm:min-h-0 sm:flex-1 sm:flex-col">
        <div
          className={cn(
            'supplier-v2-sidebar-panel border-r',
            collapsed && 'supplier-v2-sidebar-panel--collapsed',
          )}
          aria-label="Меню поставщика"
        >
          <div
            className={cn(
              'supplier-v2-sidebar__header border-b border-border-soft/80 px-5 pb-4 pt-6',
              collapsed && 'flex justify-center px-2',
            )}
          >
            <div
              className={cn(
                'flex min-w-0 items-center gap-2',
                collapsed && 'w-full justify-center gap-0',
              )}
            >
              <div className="supplier-v2-sidebar__brand-mark shrink-0" aria-hidden>
                <svg
                  className="supplier-v2-sidebar__brand-ticket"
                  viewBox="0 0 24 24"
                  preserveAspectRatio="none"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                </svg>
              </div>
              <div className="supplier-v2-sidebar__brand-block">
                <div className="text-[1.05rem] font-bold uppercase tracking-tight text-text-primary">
                  DAIBILET
                </div>
                <p className="mt-0.5 text-small text-text-muted">Кабинет поставщика</p>
              </div>
            </div>
            {!collapsed && (
              <div className="mt-4 rounded-lg bg-surface-alt/80 p-2">
                <p className="text-sm font-medium text-text-primary">{supplier?.name || 'Поставщик'}</p>
                {supplier?.companyName && (
                  <p className="text-xs text-text-muted">{supplier.companyName}</p>
                )}
                {showTrustBadge && (
                  <span
                    className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium', trustClass)}
                  >
                    {trustLabel}
                  </span>
                )}
              </div>
            )}
          </div>

          <nav
            className={cn(
              'supplier-v2-sidebar__nav-scroll flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto py-6',
              collapsed && 'py-4',
            )}
          >
            {SUPPLIER_V2_NAV_SECTIONS.map((section, sectionIndex) => {
              const items = section.items.filter((item) =>
                supplierNavPathAllowedForRole(item.path, supplierRole),
              );
              if (items.length === 0) return null;
              return (
                <div key={section.title} className={cn(sectionIndex > 0 && (collapsed ? 'mt-3' : 'mt-6'))}>
                  <ul className={cn('flex flex-col', collapsed ? 'gap-1.5 px-2' : 'gap-1.5 px-4')}>
                    {items.map((item) => (
                      <li key={item.path}>
                        <DesktopNavLink
                          item={item}
                          collapsed={collapsed}
                          count={badgeForItem(item, reviewsBadge, notificationsBadge)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>

        </div>

        <button
          type="button"
          className="supplier-v2-sidebar__rail-toggle"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
          onClick={toggleCollapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          ) : (
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}

function MobileNavLink({ item, count }: { item: SupplierNavItem; count: number | null }) {
  const { pathname } = useLocation();
  const hubActive = item.activeMatcher === 'settings-hub' && isSupplierSettingsHubPath(pathname);

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      title={item.label}
      className={({ isActive }: NavLinkRenderProps) => {
        const active = hubActive || isActive;
        return cn(
          'relative flex shrink-0 items-center justify-center rounded-control p-2.5 text-text-secondary transition-colors',
          'hover:bg-surface-alt hover:text-text-primary',
          active && 'bg-surface-alt font-medium text-accent shadow-soft',
        );
      }}
    >
      <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      {count !== null && count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-0.5 text-[8px] font-bold text-accent-foreground">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </NavLink>
  );
}

function DesktopNavLink({
  item,
  collapsed,
  count,
}: {
  item: SupplierNavItem;
  collapsed: boolean;
  count: number | null;
}) {
  const { pathname } = useLocation();
  const hubActive = item.activeMatcher === 'settings-hub' && isSupplierSettingsHubPath(pathname);

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }: NavLinkRenderProps) => {
        const active = hubActive || isActive;
        return cn(
          'supplier-v2-sidebar__link no-underline hover:no-underline',
          active && 'supplier-v2-sidebar__link--active',
        );
      }}
    >
      <item.icon
        className="h-4 w-4 shrink-0 text-current transition-colors duration-150"
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="supplier-v2-sidebar__text">
        <span className="min-w-0 truncate">{item.label}</span>
        {count !== null && count > 0 ? <NavCountBadge count={count} /> : null}
      </span>
    </NavLink>
  );
}
