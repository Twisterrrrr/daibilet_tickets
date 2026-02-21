import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Merge,
  ShoppingCart,
  MapPin,
  Tag,
  FileText,
  Layers,
  BookOpen,
  MessageSquare,
  ExternalLink,
  DollarSign,
  ClipboardList,
  Settings,
  ChevronLeft,
  Ticket,
  Inbox,
  Users,
  ShieldCheck,
  Landmark,
  HeadphonesIcon,
  Scale,
  LayoutList,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Основное',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/events', label: 'События', icon: CalendarDays },
      { to: '/events/merge', label: 'Merge дублей', icon: Merge },
      { to: '/orders', label: 'Заказы', icon: ShoppingCart },
      { to: '/checkout', label: 'Заявки', icon: Inbox },
      { to: '/support', label: 'Поддержка', icon: HeadphonesIcon },
    ],
  },
  {
    title: 'Контент',
    items: [
      { to: '/cities', label: 'Города', icon: MapPin },
      { to: '/venues', label: 'Места', icon: Landmark },
      { to: '/tags', label: 'Теги', icon: Tag },
      { to: '/collections', label: 'Подборки', icon: LayoutList },
      { to: '/landings', label: 'Лендинги', icon: FileText },
      { to: '/combos', label: 'Combo', icon: Layers },
      { to: '/articles', label: 'Статьи', icon: BookOpen },
    ],
  },
  {
    title: 'Маркетплейс',
    items: [
      { to: '/suppliers', label: 'Поставщики', icon: Users },
      { to: '/moderation', label: 'Модерация', icon: ShieldCheck },
    ],
  },
  {
    title: 'Управление',
    items: [
      { to: '/reviews', label: 'Отзывы', icon: MessageSquare },
      { to: '/external-reviews', label: 'Внешние отзывы', icon: ExternalLink },
      { to: '/upsells', label: 'Upsells', icon: DollarSign },
      { to: '/jobs/failed', label: 'Failed Jobs', icon: AlertCircle },
      { to: '/reconciliation', label: 'Сверка', icon: Scale },
      { to: '/audit', label: 'Аудит', icon: ClipboardList },
      { to: '/settings', label: 'Настройки', icon: Settings },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed = false, onCollapse }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className={cn('flex h-14 items-center border-b border-sidebar-border', collapsed ? 'justify-center px-2' : 'gap-2 px-4')}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Ticket className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-sidebar-primary">DAIBILET</span>
            <span className="rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium text-sidebar-accent-foreground">
              admin
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <div className={cn('space-y-4', collapsed ? 'px-2' : 'px-3')}>
          {NAV_SECTIONS.map((section, i) => (
            <div key={section.title}>
              {i > 0 && <Separator className="mb-3" />}
              {!collapsed && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {section.title}
                </p>
              )}
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = item.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.to);

                  const link = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-primary'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        collapsed && 'justify-center px-0',
                      )}
                    >
                      <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-sidebar-primary')} />
                      {!collapsed && <span>{item.label}</span>}
                      {!collapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.to} delayDuration={0}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return link;
                })}
              </nav>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Collapse toggle */}
      {onCollapse && (
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCollapse(!collapsed)}
            className="w-full justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && <span className="ml-2 text-xs">Свернуть</span>}
          </Button>
        </div>
      )}
    </aside>
  );
}
