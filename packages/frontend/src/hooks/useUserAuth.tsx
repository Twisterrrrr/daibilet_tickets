'use client';

import { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getStoredToken, setStoredToken, clearStoredToken } from '@/lib/user-auth';

interface User {
  id: string;
  email: string;
  name: string;
}

interface UserAuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextValue | null>(null);

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const validateToken = useCallback(async (t: string) => {
    try {
      const me = await api.userMe(t);
      setUser(me);
      return true;
    } catch {
      clearStoredToken();
      setToken(null);
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      // Попробуем refresh (cookie)
      api
        .userRefresh()
        .then((res) => {
          if (res.accessToken) {
            setStoredToken(res.accessToken);
            setToken(res.accessToken);
            return validateToken(res.accessToken);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
      return;
    }
    validateToken(stored).then((ok) => {
      if (ok) setToken(stored);
      setIsLoading(false);
    });
  }, [validateToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.userLogin({ email, password });
      setStoredToken(res.accessToken);
      setToken(res.accessToken);
      await validateToken(res.accessToken);
    },
    [validateToken],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await api.userRegister({ email, password, name });
      setStoredToken(res.accessToken);
      setToken(res.accessToken);
      await validateToken(res.accessToken);
    },
    [validateToken],
  );

  const logout = useCallback(async () => {
    const t = getStoredToken();
    if (t) {
      try {
        await api.userLogout(t);
      } catch {
        // ignore
      }
    }
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  const value: UserAuthContextValue = {
    user,
    token,
    isLoading,
    isLoggedIn: !!token && !!user,
    login,
    register,
    logout,
  };

  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error('useUserAuth must be used within UserAuthProvider');
  return ctx;
}

export function useUserAuthOptional(): UserAuthContextValue | null {
  return useContext(UserAuthContext);
}
