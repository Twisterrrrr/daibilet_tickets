import type { EventQuality, QualityTabKey } from '@/api/adminEventsQuality';

export function buildTabCounters(quality: EventQuality | null | undefined): Record<QualityTabKey, number> {
  const base: Record<QualityTabKey, number> = {
    main: 0,
    location: 0,
    offers: 0,
    schedule: 0,
  };

  if (!quality) return base;

  for (const issue of quality.issues ?? []) {
    base[issue.tabKey] = (base[issue.tabKey] ?? 0) + 1;
  }

  return base;
}

