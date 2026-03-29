import { NavLink } from 'react-router-dom';

import { cn } from '@/shared/lib/cn';

/** Подразделы кабинета без дублирования «Финансов» из бокового меню (Баланс, Отчёты, Документы). */
const ITEMS = [
  { to: '/settings', label: 'Общие' },
  { to: '/requisites', label: 'Компания и реквизиты' },
  { to: '/team', label: 'Команда' },
  { to: '/integrations', label: 'Интеграции' },
] as const;

export function SupplierSettingsNav() {
  return (
    <div className="overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
      <nav
        className="inline-flex gap-0.5 rounded-card border border-border-soft bg-surface-alt/70 p-1 shadow-soft backdrop-blur-sm"
        aria-label="Разделы настроек"
      >
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'inline-flex h-9 shrink-0 items-center rounded-control px-3.5 text-label font-medium whitespace-nowrap transition-[color,box-shadow,background-color]',
                isActive
                  ? 'bg-surface text-accent shadow-soft ring-1 ring-border-soft/80'
                  : 'text-text-secondary hover:bg-surface/90 hover:text-text-primary',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
