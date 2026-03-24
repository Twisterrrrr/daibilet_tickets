import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CreditCard,
  FileCheck2,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Plug2,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type SupplierNavBadgeKey = 'reviews' | 'notifications';

export interface SupplierNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  section: string;
  badgeKey?: SupplierNavBadgeKey;
}

export interface SupplierNavSection {
  title: string;
  items: SupplierNavItem[];
}

export const SUPPLIER_NAV_SECTIONS: SupplierNavSection[] = [
  {
    title: 'Главное',
    items: [{ to: '/', label: 'Дашборд', icon: LayoutDashboard, section: 'Главное' }],
  },
  {
    title: 'Продажи',
    items: [
      { to: '/events', label: 'Мои события', icon: Calendar, section: 'Продажи' },
      { to: '/availability', label: 'Вместимость и квота', icon: Calendar, section: 'Продажи' },
      { to: '/orders', label: 'Заказы', icon: FileText, section: 'Продажи' },
      { to: '/reviews', label: 'Отзывы', icon: MessageSquare, section: 'Продажи', badgeKey: 'reviews' },
      { to: '/notifications', label: 'Уведомления', icon: Bell, section: 'Продажи', badgeKey: 'notifications' },
      { to: '/reports', label: 'Отчеты', icon: BarChart3, section: 'Продажи' },
    ],
  },
  {
    title: 'Организация',
    items: [
      { to: '/balance', label: 'Баланс', icon: CreditCard, section: 'Организация' },
      { to: '/requisites', label: 'Реквизиты', icon: Building2, section: 'Организация' },
      { to: '/finance-documents', label: 'Документы', icon: FileCheck2, section: 'Организация' },
      { to: '/settings', label: 'Настройки', icon: Settings, section: 'Организация' },
      { to: '/team', label: 'Команда', icon: Users, section: 'Организация' },
      { to: '/integrations', label: 'Интеграции', icon: Plug2, section: 'Организация' },
    ],
  },
];

