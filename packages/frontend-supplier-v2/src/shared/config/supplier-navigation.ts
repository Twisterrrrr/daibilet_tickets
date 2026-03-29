import {
  BarChart3,
  Bell,
  Calendar,
  CreditCard,
  FileCheck2,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type SupplierNavBadgeKey = 'reviews' | 'notifications';

/** Подсветка пункта сайдбара: хаб «Настройки» включает реквизиты, команду и интеграции. */
export type SupplierNavActiveMatcher = 'settings-hub';

export interface SupplierNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  section: string;
  badgeKey?: SupplierNavBadgeKey;
  activeMatcher?: SupplierNavActiveMatcher;
}

export interface SupplierNavSection {
  title: string;
  items: SupplierNavItem[];
}

/** Маршруты совместимы с классическим frontend-supplier; группировка — схема V2. */
export const SUPPLIER_V2_NAV_SECTIONS: SupplierNavSection[] = [
  {
    title: 'Главное',
    items: [
      { path: '/', label: 'Дашборд', icon: LayoutDashboard, section: 'Главное' },
      { path: '/events', label: 'Мои события', icon: Calendar, section: 'Главное' },
      { path: '/orders', label: 'Заказы', icon: FileText, section: 'Главное' },
      { path: '/reviews', label: 'Отзывы', icon: MessageSquare, section: 'Главное', badgeKey: 'reviews' },
      { path: '/notifications', label: 'Уведомления', icon: Bell, section: 'Главное', badgeKey: 'notifications' },
    ],
  },
  {
    title: 'Финансы',
    items: [
      { path: '/balance', label: 'Баланс', icon: CreditCard, section: 'Финансы' },
      { path: '/reports', label: 'Отчёты', icon: BarChart3, section: 'Финансы' },
      { path: '/finance-documents', label: 'Документы', icon: FileCheck2, section: 'Финансы' },
    ],
  },
  {
    title: 'Настройки',
    items: [
      {
        path: '/settings',
        label: 'Настройки',
        icon: Settings,
        section: 'Настройки',
        activeMatcher: 'settings-hub',
      },
    ],
  },
];

const SETTINGS_HUB_PATHS = ['/settings', '/requisites', '/team', '/integrations'] as const;

export function isSupplierSettingsHubPath(pathname: string): boolean {
  return SETTINGS_HUB_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
