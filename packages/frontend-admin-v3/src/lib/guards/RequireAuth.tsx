import { getToken } from '@/lib/auth';
import { loginPath } from '@/lib/auth-paths';
import { tryRefreshSession } from '@/api/client';
import * as React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * Защита `/admin-v3/*`: JWT в localStorage или восстановление сессии по HttpOnly refresh-cookie.
 */
export function RequireAuth() {
  const location = useLocation();
  const [state, setState] = React.useState<'loading' | 'ok' | 'fail'>('loading');

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      if (getToken()) {
        if (!cancelled) setState('ok');
        return;
      }
      const ok = await tryRefreshSession();
      if (cancelled) return;
      setState(ok ? 'ok' : 'fail');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Проверка сессии…
      </div>
    );
  }

  if (state === 'fail' || !getToken()) {
    return <Navigate to={loginPath()} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
