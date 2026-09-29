import { api } from '@/shared/api/client';
import type { Paginated, SupplierIntegrationDto, SupplierIntegrationIssueDto, SupplierIntegrationRunDto } from '@/modules/import-sources/types';

export async function listSupplierIntegrations(params: { page?: number; pageSize?: number } = {}) {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page ?? 1));
  qs.set('pageSize', String(params.pageSize ?? 50));
  return api<Paginated<SupplierIntegrationDto>>(`/admin/supplier-integrations?${qs.toString()}`);
}

export async function listIntegrationRuns(integrationId: string, params: { page?: number; pageSize?: number } = {}) {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page ?? 1));
  qs.set('pageSize', String(params.pageSize ?? 50));
  return api<Paginated<SupplierIntegrationRunDto>>(`/admin/supplier-integrations/${integrationId}/runs?${qs.toString()}`);
}

export async function listIntegrationIssues(integrationId: string, params: { page?: number; pageSize?: number } = {}) {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page ?? 1));
  qs.set('pageSize', String(params.pageSize ?? 50));
  return api<Paginated<SupplierIntegrationIssueDto>>(`/admin/supplier-integrations/${integrationId}/issues?${qs.toString()}`);
}

