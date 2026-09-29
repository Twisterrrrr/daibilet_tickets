const TOKEN_KEY = 'daibilet_admin_v4_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

