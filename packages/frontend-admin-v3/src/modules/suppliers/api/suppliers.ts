import { adminApi } from '@/api/client';

export type SupplierReadinessDto = {
  status: 'READY' | 'NEEDS_WORK' | 'BLOCKED';
  score: number;
  blockers: string[];
  warnings: string[];
  keySignals: string[];
};

export type AdminSupplierListItem = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  status?: string;
  trustLevel: number;
  trustScore?: number;
  trustCatalogScore?: number;
  commissionRate?: number;
  contactEmail?: string | null;
  companyName?: string | null;
  stats: {
    eventsCount: number;
    activeEventsCount: number;
    publishableEventsCount: number;
    blockedEventsCount: number;
    draftEventsCount: number;
    venuesCount: number;
    offersCount: number;
    usersCount: number;
    activeOwnersCount: number;
    pendingSettlementsCount: number;
    documentsDraftCount: number;
  };
  listingHealthScore: number;
  listingHealthSource?: 'trust_catalog_score';
  effectiveTrustScore?: number;
  trustOverrideActive?: boolean;
  readiness: SupplierReadinessDto;
  readinessStatus: SupplierReadinessDto['status'];
  readinessScore: number;
  readinessKeySignals?: string[];
  flags?: {
    hasLegalProfile: boolean;
    legalProfileStatus: string | null;
    hasOwner: boolean;
  };
  legalProfile?: { id?: string; status?: string } | null;
  updatedAt: string;
  createdAt: string;
  _count?: Record<string, number>;
};

export type PaginatedSuppliers = {
  items: AdminSupplierListItem[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
  eventCountsBySource?: Record<string, number>;
};

export type ListingHealthFull = {
  score: number;
  issues: Array<{ code: string; message: string; eventId?: string }>;
  recommendations: string[];
  byEvent: Array<{ eventId: string; title: string; score: number; issues: unknown[] }>;
};

export type AdminSupplierDetail = AdminSupplierListItem & {
  website?: string | null;
  inn?: string | null;
  contactPhone?: string | null;
  yookassaAccountId?: string | null;
  defaultRefundPolicyText?: string | null;
  settlementMode?: string | null;
  paymentMode?: string;
  legalProfile?: {
    id: string;
    legalName: string;
    legalAddress?: string | null;
    inn?: string | null;
    status: string;
    generateInvoiceDocuments?: boolean;
    closingDocumentMode?: string;
    financeEmail?: string | null;
    bankAccounts?: Array<{ id: string; bankName?: string | null; bik?: string | null; accountNumber?: string | null }>;
  } | null;
  edoProfile?: { id: string; provider: string; inn: string; isActive: boolean } | null;
  supplierUsers?: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    lastLoginAt?: string | null;
  }>;
  stats?: AdminSupplierListItem['stats'];
  listingHealth?: {
    scoreProxy: number;
    full: ListingHealthFull;
  };
  settlementsByStatus?: Array<{ status: string; count: number }>;
  documentsByStatus?: Array<{ status: string; count: number }>;
  access?: {
    ownerPresent: boolean;
    activeOwnersCount: number;
    rolesSummary: Record<string, number>;
  };
  financials?: {
    totalOrders: number;
    grossRevenue: unknown;
    platformFee: unknown;
    supplierRevenue: unknown;
  };
  trust?: {
    score?: number;
    effectiveScore?: number;
    catalog?: number;
    level?: number;
    [key: string]: unknown;
  };
};

export type PatchSupplierBody = {
  trustLevel?: number;
  commissionRate?: number;
  isActive?: boolean;
  status?: string;
  isExchangeFrozen?: boolean;
  yookassaAccountId?: string | null;
  defaultRefundPolicyText?: string | null;
};

export async function fetchAdminSuppliersList(params: {
  search?: string;
  limit?: number;
  page?: number;
  trustLevel?: number;
  isActive?: boolean;
  status?: string;
  readinessStatus?: 'READY' | 'NEEDS_WORK' | 'BLOCKED';
  hasBlockedEvents?: boolean;
  hasNoUsers?: boolean;
  hasLegalIssue?: boolean;
  listingHealthMin?: number;
  updatedFrom?: string;
  updatedTo?: string;
}) {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  sp.set('limit', String(params.limit ?? 50));
  if (params.page && params.page > 1) sp.set('page', String(params.page));
  if (params.trustLevel !== undefined) sp.set('trustLevel', String(params.trustLevel));
  if (params.isActive === true) sp.set('isActive', 'true');
  if (params.isActive === false) sp.set('isActive', 'false');
  if (params.status) sp.set('status', params.status);
  if (params.readinessStatus) sp.set('readinessStatus', params.readinessStatus);
  if (params.hasBlockedEvents) sp.set('hasBlockedEvents', 'true');
  if (params.hasNoUsers) sp.set('hasNoUsers', 'true');
  if (params.hasLegalIssue) sp.set('hasLegalIssue', 'true');
  if (params.listingHealthMin !== undefined) sp.set('listingHealthMin', String(params.listingHealthMin));
  if (params.updatedFrom) sp.set('updatedFrom', params.updatedFrom);
  if (params.updatedTo) sp.set('updatedTo', params.updatedTo);
  return adminApi.get<PaginatedSuppliers>(`/admin/suppliers?${sp.toString()}`);
}

export async function fetchAdminSupplier(id: string) {
  return adminApi.get<AdminSupplierDetail>(`/admin/suppliers/${id}`);
}

export async function patchAdminSupplier(id: string, body: PatchSupplierBody) {
  return adminApi.patch(`/admin/suppliers/${id}`, body);
}
