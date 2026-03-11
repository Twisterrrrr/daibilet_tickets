import type { Metadata } from 'next';

import { api } from '@/lib/api';

import { GiftCertificateClient } from './GiftCertificateClient';

/** Fallback при недоступности API (build, сетевая ошибка). Совпадает с backend default. */
const DEFAULT_DENOMINATIONS = [300_000, 500_000, 1_000_000];
const DEFAULT_MIN = 100_000; // 1000 ₽
const DEFAULT_MAX = 5_000_000; // 50000 ₽

export const metadata: Metadata = {
  title: 'Подарочный сертификат — Дайбилет',
  description: 'Купите впечатление в подарок. Сертификат на экскурсии, музеи и мероприятия.',
};

export default async function GiftCertificatePage() {
  let denominations: number[] = [];
  let minAmount = DEFAULT_MIN;
  let maxAmount = DEFAULT_MAX;
  try {
    const res = await api.getGiftCertificateDenominations();
    denominations = res?.denominations ?? [];
    if (typeof res?.minAmount === 'number') minAmount = res.minAmount;
    if (typeof res?.maxAmount === 'number') maxAmount = res.maxAmount;
  } catch {
    // Backend может быть недоступен при build или при сетевых ошибках
  }
  if (denominations.length === 0) {
    denominations = DEFAULT_DENOMINATIONS;
  }
  return <GiftCertificateClient denominations={denominations} minAmount={minAmount} maxAmount={maxAmount} />;
}
