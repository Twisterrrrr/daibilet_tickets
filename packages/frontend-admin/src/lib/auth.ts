const TOKEN_KEY = 'daibilet_admin_token';

// Access token хранится в памяти (лучше) или коротко в localStorage
// Refresh token теперь в HttpOnly cookie — не доступен из JS

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(access: string) {
  localStorage.setItem(TOKEN_KEY, access);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Legacy: для обратной совместимости при миграции
export function setTokens(access: string, _refresh?: string) {
  setToken(access);
}

export function getRefreshToken(): string | null {
  return null; // Теперь в HttpOnly cookie
}
