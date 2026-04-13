import type { StatusTone } from '@/components/shared/status-pill/StatusPill';

export type UnifiedStatus =
  | 'Active'
  | 'Hidden'
  | 'Draft'
  | 'Archived'
  | 'Error'
  | 'NeedsReview'
  | 'Override'
  | 'SeoIssue'
  | 'ApiIssue'
  | 'NoImage'
  | 'NoDescription'
  | 'NoCategory';

export type UnifiedStatusView = {
  label: string;
  tone: StatusTone;
};

export const unifiedStatuses: Record<UnifiedStatus, UnifiedStatusView> = {
  Active: { label: 'Активно', tone: 'success' },
  Hidden: { label: 'Скрыто', tone: 'outline' },
  Draft: { label: 'Черновик', tone: 'default' },
  Archived: { label: 'Архив', tone: 'outline' },
  Error: { label: 'Ошибка', tone: 'danger' },
  NeedsReview: { label: 'Нужна проверка', tone: 'warning' },
  Override: { label: 'Override', tone: 'info' },
  SeoIssue: { label: 'SEO', tone: 'warning' },
  ApiIssue: { label: 'API', tone: 'danger' },
  NoImage: { label: 'Нет фото', tone: 'warning' },
  NoDescription: { label: 'Нет описания', tone: 'warning' },
  NoCategory: { label: 'Нет категории', tone: 'warning' },
};

