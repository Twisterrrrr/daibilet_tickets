import { Prisma } from '@prisma/client';

export type AdminVenueListSortField = 'updatedAt' | 'createdAt' | 'confidenceScore' | 'needsReview';

export function parseVenueListSortQuery(sort?: string, order?: string): {
  sort: AdminVenueListSortField;
  order: 'asc' | 'desc';
} {
  const allowed: AdminVenueListSortField[] = ['updatedAt', 'createdAt', 'confidenceScore', 'needsReview'];
  const s = allowed.includes(sort as AdminVenueListSortField) ? (sort as AdminVenueListSortField) : 'updatedAt';
  const o = order === 'asc' ? 'asc' : 'desc';
  return { sort: s, order: o };
}

export function buildVenueAdminListOrderBy(
  sort: AdminVenueListSortField,
  order: 'asc' | 'desc',
): Prisma.VenueOrderByWithRelationInput[] {
  if (sort === 'confidenceScore') {
    return [
      { confidenceScore: { sort: order, nulls: 'last' } },
      { updatedAt: 'desc' },
    ];
  }
  if (sort === 'createdAt') {
    return [{ createdAt: order }];
  }
  if (sort === 'needsReview') {
    return [{ needsReview: order }, { updatedAt: 'desc' }];
  }
  return [{ updatedAt: order }];
}
