import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { NAV_ZONES } from '@/config/navigation';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const renderItem = (item: { title: string; path: string; icon: any; end?: boolean }) => (
    <SidebarMenuItem key={item.path}>
      <SidebarMenuButton asChild tooltip={item.title}>
        <NavLink
          to={item.path}
          end={item.end}
          className="flex items-center gap-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            D
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-sidebar-foreground">Daibilet</span>
              <span className="truncate text-[11px] text-muted-foreground">Imported Sales Admin</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_ZONES.map((zone) => (
          <SidebarGroup key={zone.id}>
            <SidebarGroupLabel>{zone.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{zone.items.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
