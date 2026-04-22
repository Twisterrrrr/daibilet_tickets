import { isFeatureEnabled, type FeatureFlag } from '@/config/features';
import { FeatureDisabledPage } from '@/pages/feature-disabled/FeatureDisabledPage';
import React from 'react';

export function FeatureRoute({
  feature,
  children,
}: {
  feature: FeatureFlag | null | undefined;
  children: React.ReactNode;
}) {
  if (!isFeatureEnabled(feature)) return <FeatureDisabledPage />;
  return <>{children}</>;
}

