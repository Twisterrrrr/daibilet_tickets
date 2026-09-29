import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="p-6">
      <div className="text-lg font-semibold">Страница не найдена</div>
      <div className="mt-2 text-sm text-muted-foreground">
        Перейти на <Link to="/dashboard" className="underline">дашборд</Link>.
      </div>
    </div>
  );
}

