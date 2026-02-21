import type { Metadata } from 'next';
import { GiftCertificateClient } from './GiftCertificateClient';
import { api } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Подарочный сертификат — Дайбилет',
  description: 'Купите впечатление в подарок. Сертификат на экскурсии, музеи и мероприятия.',
};

export default async function GiftCertificatePage() {
  const { denominations } = await api.getGiftCertificateDenominations();

  return (
    <GiftCertificateClient denominations={denominations} />
  );
}
