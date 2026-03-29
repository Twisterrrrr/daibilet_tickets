import { useLocation } from 'react-router-dom';

export function StubPage() {
  const { pathname } = useLocation();
  return (
    <div>
      <h1 className="text-h2 text-text-primary">В разработке (V2)</h1>
      <p className="mt-2 text-body text-text-muted">
        Маршрут <code className="rounded bg-surface-alt px-1 text-small">{pathname}</code> — заглушка. Рабочий
        экран сейчас в основном пакете <code className="rounded bg-surface-alt px-1 text-small">frontend-supplier</code>
        .
      </p>
    </div>
  );
}
