import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  LayoutTemplate,
  FolderOpen,
  HeadphonesIcon,
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
    ops: flags.showOps,
  };

  const later: NavItem[] = [];

  if (show.events) {
    later.push(
      { to: '/events/sessions', label: 'Сеансы', icon: CalendarDays, section: 'Позже' },
      { to: '/events/merge', label: 'Склейка событий', icon: CalendarDays, section: 'Позже' },
    );
  }
  later.push(
    { to: '/suppliers', label: 'Поставщики', icon: Users, section: 'Позже' },
    { to: '/tags', label: 'Теги', icon: Tags, section: 'Позже' },
    { to: '/promo-codes', label: 'Промокоды', icon: BarChart3, section: 'Позже' },
    { to: '/promo-collections', label: 'Промо‑подборки', icon: FolderOpen, section: 'Позже' },
    { to: '/upsells', label: 'Апсейлы', icon: BarChart3, section: 'Позже' },
    { to: '/widgets', label: 'Виджеты', icon: LayoutTemplate, section: 'Позже' },
    { to: '/checkout', label: 'Checkout-сессии', icon: ShoppingCart, section: 'Позже' },
    { to: '/payouts', label: 'Выплаты', icon: FileCheck2, section: 'Позже' },
    { to: '/finance-documents', label: 'Фин. документы', icon: FileCheck2, section: 'Позже' },
    { to: '/external-reviews', label: 'Отзывы (внешние)', icon: MessageSquare, section: 'Позже' },
    { to: '/reconciliation', label: 'Сверка', icon: Search, section: 'Позже' },
    { to: '/catalog-consistency', label: 'Каталог: согласованность', icon: Gauge, section: 'Позже' },
    { to: '/source-categories', label: 'Source categories', icon: Tags, section: 'Позже' },
    { to: '/users', label: 'Пользователи', icon: Users, section: 'Позже' },
  );
  if (show.ops) {
    later.push({ to: '/jobs/failed', label: 'Очереди: failed jobs', icon: Gauge, section: 'Позже' });
    later.push({ to: '/audit', label: 'Audit log', icon: Gauge, section: 'Позже' });
  }

  return [
    {
      title: 'Каталог',
      items: [
        ...(show.events
          ? [
              { to: '/events', label: 'События', icon: CalendarDays, section: 'Каталог' },
            ]
          : []),
        { to: '/moderation', label: 'Модерация', icon: ShieldCheck, section: 'Каталог' },
        ...(show.catalog ? [{ to: '/venues', label: 'Площадки', icon: Building2, section: 'Каталог' }] : []),
        ...(show.orders ? [{ to: '/orders', label: 'Заказы', icon: ShoppingCart, section: 'Каталог' }] : []),
        ...(show.content ? [{ to: '/cities', label: 'Города', icon: MapPin, section: 'Каталог' }] : []),
      ].filter(Boolean) as NavItem[],
    },
    {
      title: 'Контент',
      items: [
        ...(show.content ? [{ to: '/articles', label: 'Статьи', icon: BookOpen, section: 'Контент' }] : []),
        ...(show.content ? [{ to: '/collections', label: 'Подборки', icon: FolderOpen, section: 'Контент' }] : []),
        ...(show.content ? [{ to: '/landings', label: 'Лендинги', icon: LayoutTemplate, section: 'Контент' }] : []),
        ...(show.content ? [{ to: '/promo-blocks', label: 'Промо-блоки', icon: BarChart3, section: 'Контент' }] : []),
        ...(show.content ? [{ to: '/seo-audit', label: 'SEO-аудит', icon: BarChart3, section: 'Контент' }] : []),
      ].filter(Boolean) as NavItem[],
    },
    {
      title: 'Система',
      items: [
        { to: '/reviews', label: 'Отзывы', icon: MessageSquare, section: 'Система' },
        { to: '/support', label: 'Поддержка', icon: HeadphonesIcon, section: 'Система' },
        { to: '/chat', label: 'Чат', icon: MessageSquare, section: 'Система' },
        { to: '/settings', label: 'Настройки', icon: Settings, section: 'Система' },
      ].filter(Boolean) as NavItem[],
    },
    {
      title: 'Позже',
      items: later,
    },
  ].filter((s) => s.items.length > 0);
}

export const NAV_SECTIONS = buildNavSections();

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) =>
  s.items.map((i) => ({ ...i, section: s.title }))
);
