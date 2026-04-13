import { isFeatureEnabled, type FeatureFlag } from '@/config/features';

export function useFeatureFlag(feature: FeatureFlag | null | undefined): boolean {
  return isFeatureEnabled(feature);
}

