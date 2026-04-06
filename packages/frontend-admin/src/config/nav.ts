import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarClock,
  LayoutTemplate,
  FolderOpen,
  HeadphonesIcon,
  LayoutDashboard,
  MapPin,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Users,
  MessageSquare,
  Search,
  FileCheck2,
  Gauge,
  type LucideIcon,
} from 'lucide-react';

import { flags } from './flags';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  section: string;
  badge?: number;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

function buildNavSections(): NavSection[] {
  const show = {
    events: flags.showEvents,
    catalog: flags.showCatalog,
    content: flags.showContent,
    orders: flags.showOrders,
  };

  return [
    {
      title: 'Главное',
      items: [{ to: '/', label: 'Дашборд', icon: LayoutDashboard, section: 'Главное' }],
    },
    {
      title: 'Каталог',
      items: [
        ...(show.events
          ? [
              { to: '/events', label: 'События', icon: CalendarDays, section: 'Каталог' },
              { to: '/events/sessions', label: 'Сеансы', icon: CalendarClock, section: 'Каталог' },
            ]
          : []),
        { to: '/moderation', label: 'Модерация', icon: ShieldCheck, section: 'Каталог' },
        ...(show.catalog ? [{ to: '/venues', label: 'Площадки', icon: Building2, section: 'Каталог' }] : []),
        ...(show.content ? [{ to: '/cities', label: 'Города', icon: MapPin, section: 'Каталог' }] : []),
        { to: '/suppliers', label: 'Поставщики', icon: Users, section: 'Каталог' },
        ...(show.content ? [{ to: '/tags', label: 'Теги', icon: Tags, section: 'Каталог' }] : []),
      ].filter(Boolean) as NavItem[],
    },
    {
      title: 'Контент',
      items: [
        ...(show.content ? [{ to: '/articles', label: 'Статьи', icon: BookOpen, section: 'Контент' }] : []),
        ...(show.content ? [{ to: '/collections', label: 'Подборки', icon: FolderOpen, section: 'Контент' }] : []),
        ...(show.content ? [{ to: '/landings', label: 'Лендинги', icon: LayoutTemplate, section: 'Контент' }] : []),
        { to: '/promo-blocks', label: 'Промо-блоки', icon: BarChart3, section: 'Контент' },
      ].filter(Boolean) as NavItem[],
    },
    {
      title: 'Операции',
      items: [
        ...(show.orders ? [{ to: '/orders', label: 'Заказы', icon: ShoppingCart, section: 'Операции' }] : []),
        { to: '/finance-documents', label: 'Фин. документы', icon: FileCheck2, section: 'Операции' },
        { to: '/reviews', label: 'Отзывы', icon: MessageSquare, section: 'Операции' },
        { to: '/reconciliation', label: 'Сверка', icon: Search, section: 'Операции' },
        { to: '/support', label: 'Поддержка', icon: HeadphonesIcon, section: 'Операции' },
        { to: '/chat', label: 'Чат', icon: MessageSquare, section: 'Операции' },
      ].filter(Boolean) as NavItem[],
    },
    {
      title: 'Система',
      items: [
        { to: '/catalog-consistency', label: 'Каталог: согласованность', icon: Gauge, section: 'Система' },
        ...(show.content ? [{ to: '/seo-audit', label: 'SEO-аудит', icon: BarChart3, section: 'Система' }] : []),
        { to: '/users', label: 'Пользователи', icon: Users, section: 'Система' },
        { to: '/settings', label: 'Настройки', icon: Settings, section: 'Система' },
      ].filter(Boolean) as NavItem[],
    },
  ].filter((s) => s.items.length > 0);
}

export const NAV_SECTIONS = buildNavSections();

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) =>
  s.items.map((i) => ({ ...i, section: s.title }))
);
