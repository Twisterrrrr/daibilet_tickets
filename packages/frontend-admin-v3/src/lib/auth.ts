const TOKEN_KEY = 'daibilet_admin_v3_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(access: string) {
  localStorage.setItem(TOKEN_KEY, access);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

