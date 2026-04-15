import {
  BarChart3,
  Building2,
  CalendarDays,
  BookOpen,
  FileText,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  MapPin,
  MessageSquare,
  RotateCcw,
  Settings,
  Sparkles,
  Tags,
  Ticket,
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
  /** Показать бейдж непрочитанного inbox (чат + тикеты) — только для пункта «Чат» */
  inboxBadge?: boolean;
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
      { label: 'Статьи', to: 'articles', icon: BookOpen, feature: null },
      { label: 'Подборки', to: 'collections', icon: FolderOpen, feature: null },
      { label: 'Лендинги', to: 'landings', icon: LayoutTemplate, feature: null },
      { label: 'Промо-блоки', to: 'promo-blocks', icon: BarChart3, feature: null },
    ],
  },
  {
    title: 'Клиенты',
    items: [
      { label: 'Покупатели', to: 'customers', icon: Users, feature: null },
      { label: 'Заказы', to: 'orders', icon: Ticket, feature: null },
      { label: 'Возвраты', to: 'refunds', icon: RotateCcw, feature: null },
      { label: 'Отзывы', to: 'reviews', icon: MessageSquare, feature: null },
    ],
  },
  {
    title: 'Поддержка',
    items: [
      { label: 'Чат', to: 'chat', icon: Inbox, feature: null, inboxBadge: true },
      { label: 'Тикеты', to: 'tickets', icon: Ticket, feature: null },
    ],
  },
  {
    title: 'Система',
    items: [
      { label: 'SEO-аудит', to: 'seo-audit', icon: Sparkles, feature: null },
      { label: 'Подкатегории', to: 'subcategories', icon: Tags, feature: null },
      { label: 'Теги', to: 'tags', icon: Tags, feature: null },
      { label: 'Настройки', to: 'settings', icon: Settings, feature: null },
      { label: 'Логи', to: 'logs', icon: FileText, feature: null },
      { label: 'Продажи', to: 'sales', icon: BarChart3, feature: 'SALES' },
      { label: 'Финансы', to: 'finance', icon: BarChart3, feature: 'FINANCE' },
      { label: 'Отчеты', to: 'reports', icon: BarChart3, feature: 'REPORTS' },
      { label: 'Команда (админы)', to: 'staff-users', icon: Users, feature: 'USERS' },
    ],
  },
];

export const navigationFlat: NavItem[] = navigation.flatMap((s) => s.items);
