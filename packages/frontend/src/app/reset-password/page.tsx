import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ResetPasswordClient } from './ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Новый пароль',
  description: 'Придумайте новый пароль для входа.',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container-page py-16" />}>
      <ResetPasswordClient />
    </Suspense>
  );
}
