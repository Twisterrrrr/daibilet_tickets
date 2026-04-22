import { describe, expect, it } from 'vitest';

import {
  mergePreviewAddressSimilarity01,
  mergePreviewTitleSimilarity01,
  similarity01ToLabel,
} from '../venue-merge-preview.util';

describe('similarity01ToLabel', () => {
  it('maps thresholds', () => {
    expect(similarity01ToLabel(0.9)).toBe('HIGH');
    expect(similarity01ToLabel(0.85)).toBe('HIGH');
    expect(similarity01ToLabel(0.7)).toBe('MEDIUM');
    expect(similarity01ToLabel(0.6)).toBe('MEDIUM');
    expect(similarity01ToLabel(0.59)).toBe('LOW');
  });
});

describe('mergePreviewTitleSimilarity01', () => {
  it('returns 1 for equal normalized titles', () => {
    expect(mergePreviewTitleSimilarity01('Причал X', 'причал x')).toBe(1);
  });
});

describe('mergePreviewAddressSimilarity01', () => {
  it('returns null if one side missing', () => {
    expect(mergePreviewAddressSimilarity01(null, 'ул. 1')).toBeNull();
    expect(mergePreviewAddressSimilarity01('ул. 1', '')).toBeNull();
  });

  it('scores when both present', () => {
    const s = mergePreviewAddressSimilarity01('Набережная 1', 'набережная 1');
    expect(s).not.toBeNull();
    expect(s!).toBeGreaterThan(0.5);
  });
});
