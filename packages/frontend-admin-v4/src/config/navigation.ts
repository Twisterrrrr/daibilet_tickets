import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  Download,
  FileText,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  MapPin,
  Receipt,
  Settings,
  Tags,
} from 'lucide-react';

export type NavZoneId = 'work' | 'hubs' | 'system';

export type NavItem = {
  id: string;
  title: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
};

export type NavZone = { id: NavZoneId; title: string; items: NavItem[] };

export const NAV_ZONES: NavZone[] = [
  {
    id: 'work',
    title: 'Операции',
    items: [
      { id: 'dashboard', title: 'Дашборд', path: 'dashboard', icon: LayoutDashboard, end: true },
      { id: 'events', title: 'События', path: 'events?source=IMPORTED', icon: CalendarDays },
      { id: 'externalOrders', title: 'Внешние заказы', path: 'orders', icon: Receipt },
    ],
  },
  {
    id: 'hubs',
    title: 'Каталог и рост',
    items: [
      { id: 'venues', title: 'Площадки', path: 'venues', icon: Building2 },
      { id: 'cities', title: 'Города', path: 'cities', icon: MapPin },
      { id: 'landings', title: 'Лендинги', path: 'landings', icon: LayoutTemplate },
    ],
  },
  {
    id: 'system',
    title: 'Импорт и система',
    items: [
      { id: 'importSources', title: 'Источники', path: 'sources', icon: Download },
      { id: 'mappingInbox', title: 'Маппинг', path: 'mapping-inbox', icon: Inbox },
      { id: 'syncHealth', title: 'Sync health', path: 'sync-health', icon: BarChart3 },
      { id: 'taxonomy', title: 'Категории и теги', path: 'taxonomy', icon: Tags },
      { id: 'auditLog', title: 'Журнал изменений', path: 'audit-log', icon: FileText },
      { id: 'settings', title: 'Настройки', path: 'settings', icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_ZONES.flatMap((zone) => zone.items);
