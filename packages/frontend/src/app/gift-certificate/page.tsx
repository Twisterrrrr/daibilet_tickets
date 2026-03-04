import type { Metadata } from 'next';

import { api } from '@/lib/api';

import { GiftCertificateClient } from './GiftCertificateClient';

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
    // Backend may be unavailable during build
  }
  return <GiftCertificateClient denominations={denominations} />;
}
