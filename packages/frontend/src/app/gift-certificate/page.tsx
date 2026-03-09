import type { Metadata } from 'next';

import { api } from '@/lib/api';

import { GiftCertificateClient } from './GiftCertificateClient';

/** Fallback при недоступности API (build, сетевая ошибка). Совпадает с backend default. */
const DEFAULT_DENOMINATIONS = [300_000, 500_000, 1_000_000]; // 3000, 5000, 10000 ₽

export const metadata: Metadata = {
  title: 'Подарочный сертификат — Дайбилет',
  description: 'Купите впечатление в подарок. Сертификат на экскурсии, музеи и мероприятия.',
};

export default async function GiftCertificatePage() {
  let denominations: number[] = [];
  try {
    const res = await api.getGiftCertificateDenominations();
    denominations = res?.denominations ?? [];
  } catch {
    // Backend может быть недоступен при build или при сетевых ошибках
  }
  if (denominations.length === 0) {
    denominations = DEFAULT_DENOMINATIONS;
  }
  return <GiftCertificateClient denominations={denominations} />;
}
