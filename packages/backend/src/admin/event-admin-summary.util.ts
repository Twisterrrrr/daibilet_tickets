/** Пороги совпадают с product-спеком Phase A (admin intelligence). */
export function mapManualBoostToTier(boost: number): 'NONE' | 'POPULAR' | 'TOP' {
  if (boost > 80) return 'TOP';
  if (boost > 30) return 'POPULAR';
  return 'NONE';
}
