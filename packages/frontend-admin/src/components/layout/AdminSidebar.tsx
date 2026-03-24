import { NavLink, useLocation } from 'react-router-dom';

import { NAV_SECTIONS } from '@/config/nav';
import { adminNavItemAllowedForRole, getAdminRoleFromToken } from '@/lib/jwtRole';
import { Badge } from '@/components/ui/badge';
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

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const adminRole = getAdminRoleFromToken();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/80 bg-sidebar">
      <SidebarHeader className="p-4">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">D</span>
            </div>
            <div className="leading-tight">
              <span className="font-semibold text-lg">DAIBILET</span>
            </div>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-sm">D</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => adminNavItemAllowedForRole(item.to, adminRole));
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
                              {item.badge !== undefined && item.badge > 0 && (
                                <Badge variant="secondary" className="ml-2 h-5 min-w-5 justify-center px-1.5 text-[10px]">
                                  {item.badge}
                                </Badge>
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

      <SidebarFooter className="px-3 py-3">
        {!collapsed && <div className="text-xs text-muted-foreground">v0.1.0 · Staging</div>}
      </SidebarFooter>
    </Sidebar>
  );
}
