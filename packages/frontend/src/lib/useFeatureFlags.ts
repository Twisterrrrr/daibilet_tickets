'use client';

import { useEffect, useState } from 'react';

import { type FeatureFlagState, fetchFeatureFlags } from './featureFlags';

export function useFeatureFlags(): Record<string, FeatureFlagState> | null {
  const [flags, setFlags] = useState<Record<string, FeatureFlagState> | null>(null);

  useEffect(() => {
    fetchFeatureFlags().then(setFlags);
  }, []);

  return flags;
}
