import { Link } from 'react-router-dom';

export function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4">
      <div className="max-w-md rounded-card border border-border-soft bg-surface p-8 text-center shadow-soft">
        <h1 className="text-h2 text-text-primary">Регистрация</h1>
        <p className="mt-2 text-body text-text-muted">
          В V2 пока только оболочка. Полный поток регистрации — в пакете{' '}
          <code className="rounded bg-surface-alt px-1 text-small">frontend-supplier</code>.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex min-h-control items-center justify-center rounded-control bg-accent px-4 text-label font-medium text-accent-foreground no-underline hover:opacity-95"
        >
          На страницу входа
        </Link>
      </div>
    </div>
  );
}
