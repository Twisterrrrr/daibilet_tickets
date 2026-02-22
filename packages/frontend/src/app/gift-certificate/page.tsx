import type { Metadata } from 'next';

import { api } from '@/lib/api';

import { GiftCertificateClient } from './GiftCertificateClient';

export const metadata: Metadata = {
  title: 'Подарочный сертификат — Дайбилет',
  description: 'Купите впечатление в подарок. Сертификат на экскурсии, музеи и мероприятия.',
};

/** Страница требует API при рендере — не пререндерить при билде */
export const dynamic = 'force-dynamic';

export default async function GiftCertificatePage() {
  const { denominations } = await api.getGiftCertificateDenominations();

  return <GiftCertificateClient denominations={denominations} />;
}
