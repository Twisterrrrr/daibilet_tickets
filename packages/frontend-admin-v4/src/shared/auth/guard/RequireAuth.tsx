import * as React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { tryRefreshSession } from '@/shared/auth/session';
import { getAccessToken } from '@/shared/auth/tokens';
import { loginPath } from '@/lib/auth-paths';

export function RequireAuth() {
  const location = useLocation();
  const [state, setState] = React.useState<'loading' | 'ok' | 'fail'>('loading');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (getAccessToken()) {
        if (!cancelled) setState('ok');
        return;
      }
      const ok = await tryRefreshSession();
      if (!cancelled) setState(ok ? 'ok' : 'fail');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return <div className="p-6 text-sm text-muted-foreground">Проверка сессии…</div>;
  }

  if (state === 'fail' || !getAccessToken()) {
    return <Navigate to={loginPath()} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

