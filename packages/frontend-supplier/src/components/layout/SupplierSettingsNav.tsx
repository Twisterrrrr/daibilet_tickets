import { Link, useLocation } from 'react-router-dom';

const SETTINGS_NAV_ITEMS = [
  { to: '/settings', label: 'Общие' },
  { to: '/requisites', label: 'Компания и реквизиты' },
  { to: '/team', label: 'Команда' },
  { to: '/finance-documents', label: 'Документы' },
  { to: '/integrations', label: 'Интеграции' },
  { to: '/balance', label: 'Выплаты' },
];

export function SupplierSettingsNav() {
  const location = useLocation();

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-1 rounded-[10px] border border-border/80 bg-white p-1">
        {SETTINGS_NAV_ITEMS.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                active
                  ? 'inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground'
                  : 'inline-flex h-8 items-center rounded-md px-3 text-sm text-muted-foreground hover:bg-muted'
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

