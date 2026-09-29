import { publicApi } from '@/shared/api/client';
import { setAccessToken } from '@/shared/auth/tokens';

let refreshPromise: Promise<boolean> | null = null;

export async function tryRefreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const data = await publicApi<{ accessToken: string }>('/auth/refresh', { method: 'POST', body: JSON.stringify({}) });
      setAccessToken(data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

