import { api } from '@/shared/api/client';
import type { AuditLogRowDto, Paginated } from '@/modules/audit/types';

export type ListAuditQuery = {
  page?: number;
  limit?: number;
  entity?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  q?: string;
  from?: string;
  to?: string;
};

export async function listAudit(query: ListAuditQuery): Promise<Paginated<AuditLogRowDto>> {
  const qs = new URLSearchParams();
  if (query.entity) qs.set('entity', query.entity);
  if (query.entityId) qs.set('entityId', query.entityId);
  if (query.userId) qs.set('userId', query.userId);
  if (query.action) qs.set('action', query.action);
  if (query.q) qs.set('q', query.q);
  if (query.from) qs.set('from', query.from);
  if (query.to) qs.set('to', query.to);
  qs.set('page', String(query.page ?? 1));
  qs.set('limit', String(query.limit ?? 50));
  return api<Paginated<AuditLogRowDto>>(`/admin/audit?${qs.toString()}`);
}

