import { Link, useParams } from 'react-router-dom';

export function InvitePage() {
  const { token } = useParams();
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <h1 className="text-h2 text-text-primary">Приглашение</h1>
      <p className="mt-2 text-small text-text-muted">Токен: {token ? '…' + token.slice(-6) : '—'}</p>
      <p className="mt-4 text-body text-text-muted">
        Принятие приглашения в V2 пока не реализовано. Используйте основной кабинет поставщика.
      </p>
      <Link to="/login" className="mt-6 inline-block text-accent underline">
        Войти
      </Link>
    </div>
  );
}
