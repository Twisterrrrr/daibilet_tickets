'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Избранное в ЛК — редирект на общую страницу избранного.
 */
export default function AccountFavoritesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/favorites');
  }, [router]);
  return null;
}
