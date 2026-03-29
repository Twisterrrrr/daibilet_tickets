import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  FileCheck2,
  FolderOpen,
  Headphones,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  MapPin,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Структура как в legacy `packages/frontend-admin/src/config/nav.ts`,
 * без feature flags — все пункты видны (маршруты без экрана ведут на Placeholder).
 */
export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: 'Главное',
    items: [{ label: 'Дашборд', path: '/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Каталог',
    items: [
      { label: 'События', path: '/events', icon: CalendarDays },
      { label: 'Модерация', path: '/moderation', icon: ShieldCheck },
      { label: 'Площадки', path: '/venues', icon: Building2 },
      { label: 'Города', path: '/cities', icon: MapPin },
      { label: 'Поставщики', path: '/suppliers', icon: Users },
      { label: 'Теги', path: '/tags', icon: Tags },
    ],
  },
  {
    title: 'Контент',
    items: [
      { label: 'Статьи', path: '/articles', icon: BookOpen },
      { label: 'Подборки', path: '/collections', icon: FolderOpen },
      { label: 'Лендинги', path: '/landings', icon: LayoutTemplate },
      { label: 'Промо-блоки', path: '/promo-blocks', icon: BarChart3 },
    ],
  },
  {
    title: 'Операции',
    items: [
      { label: 'Заказы', path: '/orders', icon: ShoppingCart },
      { label: 'Фин. документы', path: '/finance-documents', icon: FileCheck2 },
      { label: 'Отзывы', path: '/reviews', icon: MessageSquare },
      { label: 'Сверка', path: '/reconciliation', icon: Search },
      { label: 'Поддержка', path: '/support', icon: Headphones },
      { label: 'Чат', path: '/chat', icon: Inbox },
    ],
  },
  {
    title: 'Система',
    items: [
      { label: 'SEO-аудит', path: '/seo-audit', icon: BarChart3 },
      { label: 'Пользователи', path: '/users', icon: Users },
      { label: 'Настройки', path: '/settings', icon: Settings },
    ],
  },
];

/** Плоский список для поиска активного раздела */
export const ADMIN_NAV_FLAT: NavItem[] = ADMIN_NAV_SECTIONS.flatMap((s) => s.items);
