import {
  BarChart3,
  Building2,
  CalendarDays,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  Settings,
  MapPin,
  MessageSquare,
  Sparkles,
  Ticket,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { FeatureFlag } from '@/config/features';

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  feature: FeatureFlag | null;
  /** Для вложенных маршрутов (например venues vs venues/candidates) */
  end?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navigation: NavSection[] = [
  {
    title: 'Витрина',
    items: [{ label: 'Дашборд', to: 'dashboard', icon: LayoutDashboard, feature: null }],
  },
  {
    title: 'Каталог',
    items: [
      { label: 'События', to: 'events', icon: CalendarDays, feature: null },
      { label: 'Площадки', to: 'venues', icon: Building2, feature: null },
      { label: 'Города', to: 'cities', icon: MapPin, feature: null },
      { label: 'Поставщики', to: 'suppliers', icon: Users, feature: null },
    ],
  },
  {
    title: 'Рост',
    items: [
      { label: 'Подборки', to: 'collections', icon: FolderOpen, feature: null },
      { label: 'Лендинги', to: 'landings', icon: LayoutTemplate, feature: null },
      { label: 'Промо-блоки', to: 'promo-blocks', icon: BarChart3, feature: null },
    ],
  },
  {
    title: 'Клиенты',
    items: [
      { label: 'Отзывы', to: 'reviews', icon: MessageSquare, feature: null },
      { label: 'Чат', to: 'chat', icon: Inbox, feature: null },
      { label: 'Тикеты', to: 'tickets', icon: Ticket, feature: null },
    ],
  },
  {
    title: 'Система',
    items: [
      { label: 'SEO-аудит', to: 'seo-audit', icon: Sparkles, feature: null },
      { label: 'Теги', to: 'tags', icon: Tags, feature: null },
      { label: 'Настройки', to: 'settings', icon: Settings, feature: null },
      { label: 'Продажи', to: 'sales', icon: BarChart3, feature: 'SALES' },
      { label: 'Финансы', to: 'finance', icon: BarChart3, feature: 'FINANCE' },
      { label: 'Отчеты', to: 'reports', icon: BarChart3, feature: 'REPORTS' },
      { label: 'Пользователи', to: 'users', icon: Users, feature: 'USERS' },
    ],
  },
];

export const navigationFlat: NavItem[] = navigation.flatMap((s) => s.items);

