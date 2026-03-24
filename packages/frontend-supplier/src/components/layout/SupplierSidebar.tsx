import { NavLink, useLocation } from 'react-router-dom';

import { CountBadge } from '@daibilet/shared-ui';

import { Badge } from '@/components/ui/badge';
import { SUPPLIER_NAV_SECTIONS } from '@/config/nav';
import { getSupplierRoleFromToken, supplierNavPathAllowedForRole } from '@/lib/jwtRole';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

interface SupplierSidebarProps {
  supplier: {
    name: string;
    companyName?: string | null;
    trustLevel?: number;
  } | null;
  reviewsBadge: number | null;
  notificationsBadge: number | null;
}

const trustColors: Record<number, string> = {
  0: 'bg-muted text-muted-foreground',
  1: 'bg-muted text-muted-foreground',
  2: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  3: 'bg-primary/10 text-primary',
};

const trustLabels: Record<number, string> = {
  0: 'Новый',
  1: 'Базовый',
  2: 'Проверенный',
  3: 'Надёжный',
};

export function SupplierSidebar({ supplier, reviewsBadge, notificationsBadge }: SupplierSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  const supplierRole = getSupplierRoleFromToken();

  const trustLevel = supplier?.trustLevel;
  const showTrustBadge = supplier != null && typeof trustLevel === 'number';
  const trustClass = showTrustBadge ? (trustColors[trustLevel] ?? trustColors[0]) : '';
  const trustLabel = showTrustBadge ? (trustLabels[trustLevel] ?? trustLabels[0]) : '';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">D</span>
              </div>
              <div>
                <span className="font-semibold text-sm">DAIBILET</span>
                <p className="text-[10px] text-muted-foreground">Кабинет поставщика</p>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">{supplier?.name || 'Поставщик'}</p>
              {supplier?.companyName && (
                <p className="text-xs text-muted-foreground">{supplier.companyName}</p>
              )}
              {showTrustBadge && (
                <Badge className={`mt-1 text-[10px] ${trustClass}`} variant="secondary">
                  {trustLabel}
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-sm">D</span>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {SUPPLIER_NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => supplierNavPathAllowedForRole(item.to, supplierRole));
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={section.title}>
            {section.title !== 'Главное' && (
              <SidebarGroupLabel className="px-2 text-xs font-medium text-[rgba(3,7,17,0.7)]">
                {section.title}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const isActive =
                    item.to === '/'
                      ? location.pathname === '/'
                      : location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                  let badge: number | null = null;
                  if (item.badgeKey === 'reviews') badge = reviewsBadge;
                  if (item.badgeKey === 'notifications') badge = notificationsBadge;

                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className="h-8 text-sm text-[#030711] hover:bg-sidebar-accent hover:text-[#030711] data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-[#030711]"
                      >
                        <NavLink to={item.to} end={item.to === '/'}>
                          <item.icon className="h-4 w-4 shrink-0 text-[#030711]" />
                          {!collapsed && (
                            <span className="flex flex-1 items-center justify-between text-sm">
                              {item.label}
                              {badge !== null && badge > 0 && (
                                <CountBadge count={badge} className="ml-2" />
                              )}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="p-4">
        {!collapsed && <div className="text-xs text-muted-foreground">Кабинет поставщика</div>}
      </SidebarFooter>
    </Sidebar>
  );
}
