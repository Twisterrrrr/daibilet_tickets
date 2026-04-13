import { adminApi } from '@/api/client';

export type AdminEventDetail = {
  id: string;
  title: string;
  slug: string;
  tcEventId?: string | null;
  isActive: boolean;
  publishStatus?: string;
  source: string;
  updatedAt: string;
  summary?: string | null;
  description?: string | null;
  h1?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ageMin?: number | null;
  city?: { slug: string; name: string } | null;
  venue?: { id: string; title: string; slug: string } | null;
  override?: { isHidden?: boolean; editorStatus?: string | null } | null;
  sectionsDerived?: Array<{ slug: 'events' | 'excursions' | 'museums' | 'activities' | 'entertainment'; name: string }>;
  subcategoriesCanonical?: Array<{ id: string; slug: string; name: string; isActive?: boolean }>;
  lastSessionAt?: string | null;
  isPast?: boolean;
  isArchived?: boolean;
  isIndexable?: boolean;
};

export async function fetchAdminEventDetail(id: string) {
  return adminApi.get<AdminEventDetail>(`/admin/events/${id}`);
}

