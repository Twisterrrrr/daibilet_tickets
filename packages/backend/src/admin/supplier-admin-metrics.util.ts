import { Prisma } from '@/prisma-client';

import type { PrismaService } from '../prisma/prisma.service';

export type SupplierEventMetrics = {
  total: number;
  active: number;
  blocked: number;
  inactive: number;
};

export type SupplierAdminPageMetrics = {
  events: Map<string, SupplierEventMetrics>;
  activeOwners: Map<string, number>;
  pendingSettlements: Map<string, number>;
  draftDocuments: Map<string, number>;
};

/**
 * Агрегаты по операторам-поставщикам для админ-списка (одна страница).
 */
export async function loadSupplierAdminPageMetrics(
  prisma: PrismaService,
  operatorIds: string[],
): Promise<SupplierAdminPageMetrics> {
  const empty: SupplierAdminPageMetrics = {
    events: new Map(),
    activeOwners: new Map(),
    pendingSettlements: new Map(),
    draftDocuments: new Map(),
  };
  if (operatorIds.length === 0) return empty;

  const [evRows, ownerRows, stRows, docRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        operatorId: string;
        total: bigint;
        active: bigint;
        blocked: bigint;
        inactive: bigint;
      }>
    >(
      Prisma.sql`
        SELECT
          e."operatorId",
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (
            WHERE e."isDeleted" = false
              AND e."isActive" = true
              AND e."moderationStatus" = 'APPROVED'::"ModerationStatus"
              AND e."canonicalOfId" IS NULL
          )::bigint AS active,
          COUNT(*) FILTER (
            WHERE e."isDeleted" = false
              AND e."moderationStatus" = 'REJECTED'::"ModerationStatus"
          )::bigint AS blocked,
          COUNT(*) FILTER (
            WHERE e."isDeleted" = false
              AND e."isActive" = false
          )::bigint AS inactive
        FROM events e
        WHERE e."operatorId" IN (${Prisma.join(operatorIds)})
          AND e."operatorId" IS NOT NULL
        GROUP BY e."operatorId"
      `,
    ),
    prisma.$queryRaw<Array<{ operatorId: string; c: bigint }>>(
      Prisma.sql`
        SELECT su."operatorId", COUNT(*)::bigint AS c
        FROM supplier_users su
        WHERE su."operatorId" IN (${Prisma.join(operatorIds)})
          AND su.role = 'OWNER'::"SupplierRole"
          AND su."isActive" = true
        GROUP BY su."operatorId"
      `,
    ),
    prisma.supplierSettlement.groupBy({
      by: ['operatorId'],
      where: {
        operatorId: { in: operatorIds },
        status: { in: ['DRAFT', 'CALCULATED'] },
      },
      _count: { _all: true },
    }),
    prisma.supplierDocument.groupBy({
      by: ['operatorId'],
      where: {
        operatorId: { in: operatorIds },
        status: 'DRAFT',
      },
      _count: { _all: true },
    }),
  ]);

  const events = new Map<string, SupplierEventMetrics>();
  for (const r of evRows) {
    events.set(r.operatorId, {
      total: Number(r.total),
      active: Number(r.active),
      blocked: Number(r.blocked),
      inactive: Number(r.inactive),
    });
  }

  const activeOwners = new Map<string, number>();
  for (const r of ownerRows) {
    activeOwners.set(r.operatorId, Number(r.c));
  }

  const pendingSettlements = new Map<string, number>();
  for (const r of stRows) {
    pendingSettlements.set(r.operatorId, r._count._all);
  }

  const draftDocuments = new Map<string, number>();
  for (const r of docRows) {
    draftDocuments.set(r.operatorId, r._count._all);
  }

  return { events, activeOwners, pendingSettlements, draftDocuments };
}
