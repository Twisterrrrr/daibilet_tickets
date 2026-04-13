import { Link, useLocation } from 'react-router-dom';

export function FeatureDisabledPage() {
  const location = useLocation();
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Раздел отключён</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Этот модуль скрыт feature-flag’ом и недоступен в текущей конфигурации.
      </p>
      <div className="mt-6 rounded-lg border bg-card p-4 text-sm">
        <div className="text-muted-foreground">Запрошенный путь</div>
        <div className="mt-1 font-mono">{location.pathname}</div>
      </div>
      <div className="mt-6">
        <Link to="/admin-v3/dashboard" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          На дашборд
        </Link>
      </div>
    </div>
  );
}

