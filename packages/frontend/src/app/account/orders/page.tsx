'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useUserAuth } from '@/hooks/useUserAuth';

/**
 * Раньше здесь был отдельный список «Мои заказы».
 * Всё объединено на странице «Мои покупки» (/account/purchases) с артефактами (билет, ваучер, бронь и т.д.).
 * Редирект сохраняет старые ссылки и закладки.
 */
export default function AccountOrdersRedirectPage() {
  const router = useRouter();
  const { isLoading, isLoggedIn } = useUserAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/account/purchases')}`);
      return;
    }
    router.replace('/account/purchases');
  }, [isLoading, isLoggedIn, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
    </div>
  );
}
