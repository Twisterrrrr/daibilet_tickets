'use client';

import { useCallback, useEffect, useState } from 'react';
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

export function useFavorites() {
  const auth = useUserAuthOptional();
  const token = auth?.token ?? null;
  const [slugs, setSlugs] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  // Загрузка: при логине — с API + sync; без логина — localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const load = async () => {
      const t = token ?? getStoredToken();
      if (t) {
        try {
          const { slugs: apiSlugs } = await api.userFavoritesList(t);
          const local = loadLocalFavorites();
          const merged = [...new Set([...apiSlugs, ...local])];
          if (local.length > 0) {
            await api.userFavoritesSync(t, merged);
            const { slugs: synced } = await api.userFavoritesList(t);
            setSlugs(synced);
            saveLocalFavorites(synced);
          } else {
            setSlugs(apiSlugs);
            saveLocalFavorites(apiSlugs);
          }
        } catch {
          setSlugs(loadLocalFavorites());
        }
      } else {
        setSlugs(loadLocalFavorites());
      }
      setMounted(true);
    };
    load();
  }, [token]);

  const toggle = useCallback(
    async (slug: string) => {
      const t = token ?? getStoredToken();
      if (t) {
        const isIn = slugs.includes(slug);
        try {
          const { slugs: next } = isIn
            ? await api.userFavoritesRemove(t, slug)
            : await api.userFavoritesAdd(t, slug);
          setSlugs(next);
          saveLocalFavorites(next);
        } catch {
          // fallback to local
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

  const isFavorite = useCallback(
    (slug: string) => slugs.includes(slug),
    [slugs],
  );

  return { slugs, toggle, add, remove, isFavorite, mounted };
}
