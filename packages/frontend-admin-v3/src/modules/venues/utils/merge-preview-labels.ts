import type { VenueMergePreviewDto } from '@/modules/venues/api/candidates';

export type MergeSimilarityLabel =
  | VenueMergePreviewDto['comparison']['titleSimilarityLabel']
  | VenueMergePreviewDto['comparison']['addressSimilarityLabel'];

/** Короткий текст для бейджа схожести (без размазывания по JSX). */
export function mergeSimilarityLabelText(label: MergeSimilarityLabel): string {
  switch (label) {
    case 'HIGH':
      return 'HIGH';
    case 'MEDIUM':
      return 'MEDIUM';
    case 'LOW':
      return 'LOW';
    case 'NONE':
      return '—';
    default:
      return '—';
  }
}

/** Вариант бейджа для similarity label. */
export function mergeSimilarityBadgeVariant(
  label: MergeSimilarityLabel,
): 'success' | 'warning' | 'outline' | 'info' {
  if (label === 'HIGH') return 'success';
  if (label === 'MEDIUM') return 'warning';
  if (label === 'LOW') return 'outline';
  return 'info';
}
