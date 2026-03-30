'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api';
import { getStoredToken } from '@/lib/user-auth';

import { useUserAuthOptional } from './useUserAuth';

const STORAGE_KEY = 'daibilet-favorites';

function loadLocalFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function saveLocalFavorites(slugs: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // ignore
  }
}

interface FavoritesContextValue {
  slugs: string[];
  toggle: (slug: string) => Promise<void>;
  add: (slug: string) => Promise<void>;
  remove: (slug: string) => Promise<void>;
  isFavorite: (slug: string) => boolean;
  mounted: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * Один источник правды для избранного: иначе каждый FavoriteButton дублировал GET /user/favorites.
 * Запросы к API только после завершения bootstrap сессии (isLoading === false) и только с token из контекста.
 */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const auth = useUserAuthOptional();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  const authLoading = auth?.isLoading ?? false;
  const token = auth?.token ?? null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (authLoading) return;

    let cancelled = false;

    const load = async () => {
      const t = token;
      if (t) {
        try {
          const { slugs: apiSlugs } = await api.userFavoritesList(t);
          if (cancelled) return;
          const local = loadLocalFavorites();
          const merged = [...new Set([...apiSlugs, ...local])];
          if (local.length > 0) {
            await api.userFavoritesSync(t, merged);
            const { slugs: synced } = await api.userFavoritesList(t);
            if (cancelled) return;
            setSlugs(synced);
            saveLocalFavorites(synced);
          } else {
            setSlugs(apiSlugs);
            saveLocalFavorites(apiSlugs);
          }
        } catch {
          if (cancelled) return;
          setSlugs(loadLocalFavorites());
        }
      } else {
        setSlugs(loadLocalFavorites());
      }
      if (!cancelled) setMounted(true);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, token]);

  const toggle = useCallback(
    async (slug: string) => {
      const t = token ?? getStoredToken();
      if (t) {
        const isIn = slugs.includes(slug);
        try {
          const { slugs: next } = isIn ? await api.userFavoritesRemove(t, slug) : await api.userFavoritesAdd(t, slug);
          setSlugs(next);
          saveLocalFavorites(next);
        } catch {
          const next = isIn ? slugs.filter((s) => s !== slug) : [...slugs, slug];
          setSlugs(next);
          saveLocalFavorites(next);
        }
      } else {
        setSlugs((prev) => {
          const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
          saveLocalFavorites(next);
          return next;
        });
      }
    },
    [token, slugs],
  );

  const add = useCallback(
    async (slug: string) => {
      if (slugs.includes(slug)) return;
      const t = token ?? getStoredToken();
      if (t) {
        try {
          const { slugs: next } = await api.userFavoritesAdd(t, slug);
          setSlugs(next);
          saveLocalFavorites(next);
        } catch {
          const next = [...slugs, slug];
          setSlugs(next);
          saveLocalFavorites(next);
        }
      } else {
        const next = [...slugs, slug];
        setSlugs(next);
        saveLocalFavorites(next);
      }
    },
    [token, slugs],
  );

  const remove = useCallback(
    async (slug: string) => {
      const t = token ?? getStoredToken();
      if (t) {
        try {
          const { slugs: next } = await api.userFavoritesRemove(t, slug);
          setSlugs(next);
          saveLocalFavorites(next);
        } catch {
          const next = slugs.filter((s) => s !== slug);
          setSlugs(next);
          saveLocalFavorites(next);
        }
      } else {
        const next = slugs.filter((s) => s !== slug);
        setSlugs(next);
        saveLocalFavorites(next);
      }
    },
    [token, slugs],
  );

  const isFavorite = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const value = useMemo(
    () => ({ slugs, toggle, add, remove, isFavorite, mounted }),
    [slugs, toggle, add, remove, isFavorite, mounted],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return ctx;
}
