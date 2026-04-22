import { isFeatureEnabled, type FeatureFlag } from '@/config/features';
import React from 'react';

export function requireFeature(feature: FeatureFlag | null | undefined) {
  return function RequireFeature({ children }: { children: React.ReactNode }) {
    if (!isFeatureEnabled(feature)) return null;
    return <>{children}</>;
  };
}

