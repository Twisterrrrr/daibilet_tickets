import { CheckoutErrorBoundary } from '@/components/CheckoutErrorBoundary';

import { CheckoutPackageClient } from './CheckoutPackageClient';

interface Props {
  params: Promise<{ packageId: string }>;
}

export default async function CheckoutPackagePage({ params }: Props) {
  const { packageId } = await params;
  return (
    <CheckoutErrorBoundary>
      <CheckoutPackageClient packageId={packageId} />
    </CheckoutErrorBoundary>
  );
}
