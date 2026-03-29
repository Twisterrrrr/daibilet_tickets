export type EventStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type EventSource = 'internal' | 'supplier' | 'import' | 'partner';

export interface EventEntity {
  id: string;
  title: string;
  slug: string;
  city: string;
  shortDescription: string;
  status: EventStatus;
  source: EventSource;
  qualityScore: number;
  issuesCount: number;
  supplierName: string;
  sessionsSummary: string;
  createdAt: string;
  updatedAt: string;
}
