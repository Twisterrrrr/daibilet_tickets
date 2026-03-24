import { describe, expect, it } from 'vitest';

import {
  ANALYTICS_TABS_ALLOWED_SINCE_DAYS,
  analyticsTabsFiltersFingerprint,
  normalizeSinceDays,
} from '../admin-dashboard.service';

describe('AdminDashboardService sinceDays policy', () => {
  it('whitelist is 7, 14, 30', () => {
    expect([...ANALYTICS_TABS_ALLOWED_SINCE_DAYS]).toEqual([7, 14, 30]);
  });

  it('normalizeSinceDays coerces invalid to 7', () => {
    expect(normalizeSinceDays(7)).toBe(7);
    expect(normalizeSinceDays(14)).toBe(14);
    expect(normalizeSinceDays(30)).toBe(30);
    expect(normalizeSinceDays(1)).toBe(7);
    expect(normalizeSinceDays(90)).toBe(7);
    expect(normalizeSinceDays(366)).toBe(7);
    expect(normalizeSinceDays(500)).toBe(7);
    expect(normalizeSinceDays(NaN)).toBe(7);
  });

  it('analyticsTabsFiltersFingerprint is stable hex prefix for cache key segment', () => {
    expect(analyticsTabsFiltersFingerprint()).toBe(analyticsTabsFiltersFingerprint());
    expect(analyticsTabsFiltersFingerprint()).toMatch(/^[a-f0-9]{16}$/);
  });
});
