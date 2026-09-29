import { publicApi } from '@/shared/api/client';
import { clearAuthTokens, setAccessToken } from '@/shared/auth/tokens';

export type AuthMe = { id: string; email?: string | null; roles?: string[] | null } & Record<string, unknown>;

export async function login(email: string, password: string): Promise<void> {
  const data = await publicApi<{ accessToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  setAccessToken(data.accessToken);
}

export async function logout(): Promise<void> {
  // backend logout endpoint is not assumed here; client-side cleanup only.
  clearAuthTokens();
}

export async function me(): Promise<AuthMe> {
  return publicApi<AuthMe>('/auth/me', { method: 'GET' });
}

