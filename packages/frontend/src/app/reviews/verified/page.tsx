import { Metadata } from 'next';

import VerifiedClient from './VerifiedClient';

export const metadata: Metadata = {
  title: 'Отзыв подтверждён — Дайбилет',
  robots: 'noindex, nofollow',
};

export default function VerifiedPage() {
  return <VerifiedClient />;
}
